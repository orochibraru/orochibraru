// The sync worker: every docs sync runs here, off the request that asked for it.
// Jobs live in sync_job, so a restart picks up what was queued or cut short, and
// the worker runs them one at a time, which keeps GitHub's rate limit out of reach.
import { and, asc, desc, eq, isNotNull, isNull, lt, lte, or } from "drizzle-orm";
import { getDb } from "../db";
import { docsVersion, project, type SYNC_REASONS, syncJob, syncRun } from "../db/schema";
import { getGithubApp, github } from "./app";
import {
	type Log,
	labelOf,
	message,
	quiet,
	runSync,
	type SyncResult,
	short,
	targetsOf,
} from "./sync";

export type SyncReason = (typeof SYNC_REASONS)[number];
type Job = typeof syncJob.$inferSelect;

const MAX_ATTEMPTS = 3;
/** How long a job GitHub failed waits before its next attempt, by attempts made. */
const backoff = (attempts: number) => 60_000 * 5 ** (attempts - 1);
const KEEP_FOR = 30 * 24 * 3600_000;

/** Who is waiting on a job: its narration, and the result of its next attempt. */
const watchers = new Map<number, { logs: Log[]; done: ((result: SyncResult) => void)[] }>();

function add(repo: string, sha: string | undefined, reason: SyncReason): number {
	const db = getDb();
	const queued = db
		.select()
		.from(syncJob)
		.where(and(eq(syncJob.repo, repo), eq(syncJob.status, "queued")))
		.get();
	if (queued) {
		// the latest request wins: a newer push, or a branch head that is newer still
		db.update(syncJob)
			.set({ sha: sha ?? null, reason, runAfter: null })
			.where(eq(syncJob.id, queued.id))
			.run();
		return queued.id;
	}
	return db
		.insert(syncJob)
		.values({ repo, sha: sha ?? null, reason, status: "queued" })
		.returning({ id: syncJob.id })
		.get().id;
}

/** Queue a sync of one project and return at once. */
export function queueSync(repo: string, options: { sha?: string; reason: SyncReason }): number {
	const id = add(repo, options.sha, options.reason);
	kick();
	return id;
}

/**
 * Queue a sync and wait for the worker to run it. Callers asking while the
 * project is already queued share that job; one asking while it runs gets the
 * run after it, so a push that lands mid-sync is never missed.
 */
export function syncRepo(
	repo: string,
	sha?: string,
	log: Log = quiet,
	reason: SyncReason = "manual",
): Promise<SyncResult> {
	const id = add(repo, sha, reason);
	const result = new Promise<SyncResult>((resolve) => {
		const watching = watchers.get(id) ?? { logs: [], done: [] };
		watching.logs.push(log);
		watching.done.push(resolve);
		watchers.set(id, watching);
	});
	kick();
	return result;
}

function claim(): Job | undefined {
	const db = getDb();
	const next = db
		.select()
		.from(syncJob)
		.where(
			and(
				eq(syncJob.status, "queued"),
				or(isNull(syncJob.runAfter), lte(syncJob.runAfter, new Date())),
			),
		)
		.orderBy(asc(syncJob.id))
		.get();
	if (!next) {
		return undefined;
	}
	return db
		.update(syncJob)
		.set({ status: "running", attempts: next.attempts + 1, startedAt: new Date() })
		.where(eq(syncJob.id, next.id))
		.returning()
		.get();
}

async function run(job: Job) {
	const db = getDb();
	const watching = watchers.get(job.id);
	watchers.delete(job.id);
	const log: Log = (line) => {
		for (const each of watching?.logs ?? []) {
			each(line);
		}
	};
	const result = await runSync(job.repo, job.sha ?? undefined, log).catch(
		(cause): SyncResult => ({ status: "failed", changed: 0, error: message(cause) }),
	);
	const another = db
		.select({ id: syncJob.id })
		.from(syncJob)
		.where(and(eq(syncJob.repo, job.repo), eq(syncJob.status, "queued")))
		.get();
	if (result.status === "failed" && result.retry && job.attempts < MAX_ATTEMPTS && !another) {
		const wait = backoff(job.attempts);
		db.update(syncJob)
			.set({ status: "queued", error: result.error, runAfter: new Date(Date.now() + wait) })
			.where(eq(syncJob.id, job.id))
			.run();
		log(`${job.repo}: GitHub failed, trying again in ${wait / 60_000} min`);
	} else {
		db.update(syncJob)
			.set({
				status: result.status,
				changed: result.changed,
				error: result.error ?? null,
				finishedAt: new Date(),
			})
			.where(eq(syncJob.id, job.id))
			.run();
	}
	for (const resolve of watching?.done ?? []) {
		resolve(result);
	}
}

let draining = false;
let wake: ReturnType<typeof setTimeout> | undefined;

/** Run every job that is due, then sleep until the next retry is. */
function kick() {
	if (draining) {
		return;
	}
	draining = true;
	clearTimeout(wake);
	void drain().finally(() => {
		draining = false;
	});
}

async function drain() {
	// claimed before the first await, so a request queued right after sees it running
	for (let job = claim(); job; job = claim()) {
		await run(job).catch((cause) => console.error(`sync ${job?.repo}:`, cause));
	}
	const later = getDb()
		.select({ runAfter: syncJob.runAfter })
		.from(syncJob)
		.where(and(eq(syncJob.status, "queued"), isNotNull(syncJob.runAfter)))
		.orderBy(asc(syncJob.runAfter))
		.get();
	if (later?.runAfter) {
		wake = setTimeout(kick, Math.max(0, later.runAfter.getTime() - Date.now()));
		wake.unref?.();
	}
}

/**
 * At boot: a job the last process was running when it stopped runs again (its
 * transaction never committed, so nothing was half-written), finished jobs a
 * month old are dropped, and the queue starts draining.
 */
export function startSyncWorker() {
	const db = getDb();
	const interrupted = "interrupted by a restart";
	db.update(syncJob).set({ status: "queued" }).where(eq(syncJob.status, "running")).run();
	db.update(syncRun)
		.set({ status: "failed", error: interrupted, finishedAt: new Date() })
		.where(eq(syncRun.status, "running"))
		.run();
	db.delete(syncJob)
		.where(
			and(isNotNull(syncJob.finishedAt), lt(syncJob.finishedAt, new Date(Date.now() - KEEP_FOR))),
		)
		.run();
	kick();
}

/** The project's newest job, for the admin to show while it waits or runs. */
export const latestJob = (repo: string) =>
	getDb().select().from(syncJob).where(eq(syncJob.repo, repo)).orderBy(desc(syncJob.id)).get();

/** The newest jobs across every project. */
export const recentJobs = (limit = 10) =>
	getDb().select().from(syncJob).orderBy(desc(syncJob.id)).limit(limit).all();

/**
 * The safety net for missed webhooks: every project whose default branch or
 * Latest release moved since its last sync is synced again. `done` hears about
 * each project as it is checked, synced or not, with the error if it failed.
 */
export async function reconcile(log = quiet, done?: (repo: string, error?: string) => void) {
	const app = await getGithubApp();
	if (!app?.installationId) {
		log("The GitHub App isn't installed: nothing to sync.");
		return;
	}
	const db = getDb();
	const rows = db.select().from(project).where(isNotNull(project.githubRepo)).all();
	log(`Checking ${rows.length} project${rows.length === 1 ? "" : "s"} with a linked repo.`);
	for (const row of rows) {
		try {
			const targets = await targetsOf(app, row);
			const synced = new Map(
				db
					.select()
					.from(docsVersion)
					.where(eq(docsVersion.project, row.repo))
					.all()
					.map((version) => [version.channel, version]),
			);
			// a channel stored but no longer wanted is stale too
			let stale = synced.size > targets.length;
			let head: string | undefined;
			for (const target of targets) {
				const commit = await github<{ sha: string }>(
					app,
					`/repos/${row.githubRepo}/commits/${encodeURIComponent(target.ref)}`,
				);
				if (target.ref === (row.defaultBranch ?? "main")) {
					head = commit.sha;
				}
				const last = synced.get(target.channel);
				const current = last?.sha === commit.sha && last.ref === target.ref;
				stale ||= !current;
				log(
					`${labelOf(row.repo, target.channel)}: ${row.githubRepo}@${target.ref} is at ${short(commit.sha)}, last synced ${short(last?.sha)}${current ? ", up to date" : ""}`,
				);
			}
			const result = stale ? await syncRepo(row.repo, head, log, "reconcile") : undefined;
			done?.(row.repo, result?.error);
		} catch (cause) {
			console.error(`reconcile ${row.repo}:`, cause);
			log(`${row.repo}: ✗ ${message(cause)}`);
			done?.(row.repo, message(cause));
		}
	}
	log("Every project checked.");
}
