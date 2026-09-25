// Docs sync: one repo's docs/, README and CONTRIBUTING, pulled through the GitHub
// App into `guide` and `image` rows. Everything is fetched and encoded first,
// then written in one transaction: a sync that fails part-way changes nothing,
// and the error lands in sync_run for the admin to read.
import { basename } from "node:path";
import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { DocsConfig } from "$lib/docs-config";
import { ROOT_GUIDES } from "$lib/projects";
import { invalidate } from "../content";
import { getDb } from "../db";
import { type Channel, docsVersion, guide, image, project, syncRun } from "../db/schema";
import { type Prepared, prepareImage, recordImage } from "../images";
import { type App, GithubError, getGithubApp, github } from "./app";

type TreeEntry = { path: string; type: string; sha: string };

/** What the old `bun run docs` vendored, and nothing else. */
export function selectDocs(tree: TreeEntry[]) {
	const blobs = tree.filter((entry) => entry.type === "blob");
	const roots = new Set<string>(ROOT_GUIDES.map((root) => root.file));
	return {
		guides: blobs.filter(
			(entry) =>
				roots.has(entry.path) ||
				(/^docs\/[^/]+\.md$/.test(entry.path) && entry.path !== "docs/README.md"),
		),
		images: blobs.filter((entry) => /^docs\/images\/[^/]+\.(png|jpe?g|webp)$/i.test(entry.path)),
		config: blobs.find((entry) => entry.path === "docs/config.json"),
	};
}

const slugOf = (path: string) =>
	ROOT_GUIDES.find((root) => root.file === path)?.slug ?? basename(path, ".md");

const imageNameOf = (path: string) => basename(path).replace(/\.[a-z]+$/i, "");

async function blob(app: App, repo: string, sha: string): Promise<Uint8Array> {
	const body = await github<{ content: string; encoding: string }>(
		app,
		`/repos/${repo}/git/blobs/${sha}`,
	);
	return Uint8Array.from(Buffer.from(body.content, body.encoding === "base64" ? "base64" : "utf8"));
}

export type SyncResult = { status: "ok" | "failed" | "skipped"; changed: number; error?: string };

/** Where a sync narrates what it does: the admin's progress dialog, or nowhere. */
export type Log = (line: string) => void;
const quiet: Log = () => {};

const short = (sha: string | null | undefined) => sha?.slice(0, 7) ?? "never";

type ProjectRow = typeof project.$inferSelect;
type Target = { channel: Channel; ref: string };

/**
 * Where each channel reads from. A repo whose GitHub release is marked Latest
 * publishes that tag as latest and its default branch as canary: unreleased
 * work never reads as released. Without one, latest is the default branch.
 */
async function targetsOf(app: App, row: ProjectRow): Promise<Target[]> {
	const branch = row.defaultBranch ?? "main";
	const release = await github<{ tag_name: string }>(
		app,
		`/repos/${row.githubRepo}/releases/latest`,
	).catch((cause) => {
		if (cause instanceof GithubError && cause.status === 404) {
			return null;
		}
		throw cause;
	});
	return release
		? [
				{ channel: "latest", ref: release.tag_name },
				{ channel: "canary", ref: branch },
			]
		: [{ channel: "latest", ref: branch }];
}

const labelOf = (repoKey: string, channel: Channel) =>
	channel === "latest" ? repoKey : `${repoKey} ${channel}`;

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

async function runSync(repoKey: string, wanted?: string, log = quiet): Promise<SyncResult> {
	const db = getDb();
	const row = db.select().from(project).where(eq(project.repo, repoKey)).get();
	if (!row?.githubRepo) {
		log(`${repoKey}: skipped, no linked repo`);
		return { status: "skipped", changed: 0, error: `${repoKey} has no linked repo` };
	}
	const app = await getGithubApp();
	if (!app?.installationId) {
		log(`${repoKey}: skipped, the GitHub App isn't installed`);
		return { status: "skipped", changed: 0, error: "the GitHub App isn't installed" };
	}
	let targets: Target[];
	try {
		targets = await targetsOf(app, row);
	} catch (cause) {
		const error = message(cause);
		db.insert(syncRun)
			.values({ repo: repoKey, status: "failed", error, finishedAt: new Date() })
			.run();
		log(`${repoKey}: ✗ failed, nothing written: ${error}`);
		return { status: "failed", changed: 0, error };
	}

	const result: SyncResult = { status: "ok", changed: 0 };
	for (const target of targets) {
		// a pushed sha pins the branch, never a release tag
		const pinned = target.ref === (row.defaultBranch ?? "main") ? wanted : undefined;
		const one = await syncChannel(app, row, target, pinned, log);
		result.changed += one.changed;
		if (one.status === "failed") {
			result.status = "failed";
			result.error ??= one.error;
		}
	}
	if (!targets.some((target) => target.channel === "canary")) {
		result.changed += dropChannel(repoKey, "canary", log);
	}
	return result;
}

/** A channel the repo no longer has: its release was deleted, say. */
function dropChannel(repoKey: string, channel: Channel, log: Log): number {
	const removed = getDb().transaction((tx) => {
		const guides = tx
			.delete(guide)
			.where(and(eq(guide.project, repoKey), eq(guide.channel, channel)))
			.returning()
			.all();
		const images = tx
			.delete(image)
			.where(and(eq(image.project, repoKey), eq(image.source, "sync"), eq(image.channel, channel)))
			.returning()
			.all();
		tx.delete(docsVersion)
			.where(and(eq(docsVersion.project, repoKey), eq(docsVersion.channel, channel)))
			.run();
		return guides.length + images.length;
	});
	if (removed) {
		invalidate();
		log(`${labelOf(repoKey, channel)}: − ${removed} files, the channel is gone`);
	}
	return removed;
}

async function syncChannel(
	app: App,
	row: ProjectRow,
	target: Target,
	wanted: string | undefined,
	log: Log,
): Promise<SyncResult> {
	const db = getDb();
	const repoKey = row.repo;
	const { channel } = target;
	const label = labelOf(repoKey, channel);
	const fullName = row.githubRepo as string;
	const ref = wanted ?? target.ref;
	const [run] = db
		.insert(syncRun)
		.values({ repo: repoKey, sha: wanted ?? null, status: "running" })
		.returning()
		.all();
	const runId = (run as typeof syncRun.$inferSelect).id;

	try {
		// the commit, not the tree: its sha is what reconcile compares refs against
		const commit = await github<{ sha: string; commit: { tree: { sha: string } } }>(
			app,
			`/repos/${fullName}/commits/${encodeURIComponent(ref)}`,
		);
		const sha = commit.sha;
		log(`${label}: syncing ${fullName}@${target.ref} (${short(sha)})`);
		const { tree } = await github<{ tree: TreeEntry[] }>(
			app,
			`/repos/${fullName}/git/trees/${commit.commit.tree.sha}?recursive=1`,
		);
		const wantedDocs = selectDocs(tree);
		log(
			`${label}: ${tree.length} files in the tree, ${wantedDocs.guides.length} guides, ${wantedDocs.images.length} images, ${wantedDocs.config ? "a" : "no"} docs/config.json`,
		);

		const stored = new Map(
			db
				.select()
				.from(guide)
				.where(and(eq(guide.project, repoKey), eq(guide.channel, channel)))
				.all()
				.map((item) => [item.slug, item]),
		);
		const guides: { slug: string; path: string; sha: string; markdown: string }[] = [];
		for (const entry of wantedDocs.guides) {
			const slug = slugOf(entry.path);
			if (stored.get(slug)?.sha === entry.sha) {
				log(`  = ${entry.path}`);
				continue;
			}
			log(`  ↓ ${entry.path}`);
			guides.push({
				slug,
				path: entry.path,
				sha: entry.sha,
				markdown: new TextDecoder().decode(await blob(app, fullName, entry.sha)),
			});
		}

		const storedImages = new Map(
			db
				.select()
				.from(image)
				.where(and(eq(image.project, repoKey), eq(image.channel, channel), isNotNull(image.name)))
				.all()
				.map((item) => [item.name as string, item]),
		);
		const images: { name: string; sha: string; prepared: Prepared }[] = [];
		for (const entry of wantedDocs.images) {
			const name = imageNameOf(entry.path);
			if (storedImages.get(name)?.sourceSha === entry.sha) {
				log(`  = ${entry.path}`);
				continue;
			}
			log(`  ↓ ${entry.path}, re-encoding to WebP`);
			const prepared = await prepareImage(await blob(app, fullName, entry.sha)).catch((cause) => {
				throw new GithubError(`${entry.path}: ${cause instanceof Error ? cause.message : cause}`);
			});
			images.push({ name, sha: entry.sha, prepared });
		}

		let config: DocsConfig | null = null;
		if (wantedDocs.config) {
			const raw = new TextDecoder().decode(await blob(app, fullName, wantedDocs.config.sha));
			let json: unknown;
			try {
				json = JSON.parse(raw);
			} catch (cause) {
				throw new GithubError(`docs/config.json is invalid: ${(cause as Error).message}`);
			}
			const parsed = DocsConfig.safeParse(json);
			if (!parsed.success) {
				throw new GithubError(`docs/config.json is invalid:\n${z.prettifyError(parsed.error)}`);
			}
			config = parsed.data;
			log("  ✓ docs/config.json is valid");
		}

		const keepSlugs = wantedDocs.guides.map((entry) => slugOf(entry.path));
		const keepImages = wantedDocs.images.map((entry) => imageNameOf(entry.path));
		let changed = guides.length + images.length;
		db.transaction((tx) => {
			for (const item of guides) {
				tx.insert(guide)
					.values({
						project: repoKey,
						channel,
						slug: item.slug,
						markdown: item.markdown,
						sourcePath: item.path,
						sha: item.sha,
					})
					.onConflictDoUpdate({
						target: [guide.project, guide.channel, guide.slug],
						set: { markdown: item.markdown, sourcePath: item.path, sha: item.sha },
					})
					.run();
			}
			for (const item of images) {
				recordImage(
					item.prepared,
					{ source: "sync", project: repoKey, channel, name: item.name, sourceSha: item.sha },
					tx,
				);
			}
			const removedGuides = tx
				.delete(guide)
				.where(
					keepSlugs.length
						? and(
								eq(guide.project, repoKey),
								eq(guide.channel, channel),
								notInArray(guide.slug, keepSlugs),
							)
						: and(eq(guide.project, repoKey), eq(guide.channel, channel)),
				)
				.returning()
				.all();
			const removedImages = tx
				.delete(image)
				.where(
					and(
						eq(image.project, repoKey),
						eq(image.source, "sync"),
						eq(image.channel, channel),
						keepImages.length ? notInArray(image.name, keepImages) : isNotNull(image.name),
					),
				)
				.returning()
				.all();
			for (const item of removedGuides) {
				log(`  − ${item.sourcePath}, gone from the repo`);
			}
			for (const item of removedImages) {
				log(`  − image ${item.name}, gone from the repo`);
			}
			changed += removedGuides.length + removedImages.length;
			tx.insert(docsVersion)
				.values({ project: repoKey, channel, ref: target.ref, sha, config })
				.onConflictDoUpdate({
					target: [docsVersion.project, docsVersion.channel],
					set: { ref: target.ref, sha, config },
				})
				.run();
			tx.update(syncRun)
				.set({ status: "ok", sha, changed, finishedAt: new Date() })
				.where(eq(syncRun.id, runId))
				.run();
		});
		invalidate();
		log(`${label}: ✓ done, ${changed} change${changed === 1 ? "" : "s"}`);
		return { status: "ok", changed };
	} catch (cause) {
		const error = message(cause);
		db.update(syncRun)
			.set({ status: "failed", error, finishedAt: new Date() })
			.where(eq(syncRun.id, runId))
			.run();
		log(`${label}: ✗ failed, nothing written: ${error}`);
		return { status: "failed", changed: 0, error };
	}
}

// One sync per repo at a time. A push that arrives mid-sync doesn't queue a sync of
// its own: it marks the repo dirty, and one more run follows the current one.
const running = new Map<string, Promise<SyncResult>>();
const dirty = new Set<string>();

export function syncRepo(repoKey: string, sha?: string, log = quiet): Promise<SyncResult> {
	const current = running.get(repoKey);
	if (current) {
		log(`${repoKey}: already syncing, one more run will follow it`);
		dirty.add(repoKey);
		return current;
	}
	const work = (async () => {
		let result = await runSync(repoKey, sha, log);
		while (dirty.delete(repoKey)) {
			log(`${repoKey}: pushed to again meanwhile, syncing once more`);
			result = await runSync(repoKey, undefined, log);
		}
		return result;
	})().finally(() => running.delete(repoKey));
	running.set(repoKey, work);
	return work;
}

const linked = (fullName: string) =>
	getDb().select().from(project).where(eq(project.githubRepo, fullName)).all();

/** The projects a push to this repo and ref should resync. */
export const projectsForPush = (fullName: string, ref: string) =>
	linked(fullName)
		.filter((row) => ref === `refs/heads/${row.defaultBranch ?? "main"}`)
		.map((row) => row.repo);

/** The projects a release of this repo can move: any of them may change which one is Latest. */
export const projectsForRelease = (fullName: string) => linked(fullName).map((row) => row.repo);

/** Paths a push touched that the docs are built from. */
export const touchesDocs = (paths: string[]) =>
	paths.some((path) => path.startsWith("docs/") || ROOT_GUIDES.some((root) => root.file === path));

/**
 * The safety net for missed webhooks: every project whose default branch or
 * Latest release moved since its last sync is synced again.
 */
export async function reconcile(log = quiet) {
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
			if (stale) {
				await syncRepo(row.repo, head, log);
			}
		} catch (cause) {
			console.error(`reconcile ${row.repo}:`, cause);
			log(`${row.repo}: ✗ ${message(cause)}`);
		}
	}
	log("Every project checked.");
}
