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
import { guide, image, project, syncRun } from "../db/schema";
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
	const fullName = row.githubRepo;
	const ref = wanted ?? row.defaultBranch ?? "main";
	const [run] = db
		.insert(syncRun)
		.values({ repo: repoKey, sha: wanted ?? null, status: "running" })
		.returning()
		.all();
	const runId = (run as typeof syncRun.$inferSelect).id;

	try {
		// the commit, not the tree: its sha is what reconcile compares branches against
		const commit = await github<{ sha: string; commit: { tree: { sha: string } } }>(
			app,
			`/repos/${fullName}/commits/${encodeURIComponent(ref)}`,
		);
		const sha = commit.sha;
		log(`${repoKey}: syncing ${fullName}@${ref} (${short(sha)})`);
		const { tree } = await github<{ tree: TreeEntry[] }>(
			app,
			`/repos/${fullName}/git/trees/${commit.commit.tree.sha}?recursive=1`,
		);
		const wantedDocs = selectDocs(tree);
		log(
			`${repoKey}: ${tree.length} files in the tree, ${wantedDocs.guides.length} guides, ${wantedDocs.images.length} images, ${wantedDocs.config ? "a" : "no"} docs/config.json`,
		);

		const stored = new Map(
			db
				.select()
				.from(guide)
				.where(eq(guide.project, repoKey))
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
				.where(and(eq(image.project, repoKey), isNotNull(image.name)))
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
			const parsed = DocsConfig.safeParse(JSON.parse(raw));
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
						slug: item.slug,
						markdown: item.markdown,
						sourcePath: item.path,
						sha: item.sha,
					})
					.onConflictDoUpdate({
						target: [guide.project, guide.slug],
						set: { markdown: item.markdown, sourcePath: item.path, sha: item.sha },
					})
					.run();
			}
			for (const item of images) {
				recordImage(
					item.prepared,
					{ source: "sync", project: repoKey, name: item.name, sourceSha: item.sha },
					tx,
				);
			}
			const removedGuides = tx
				.delete(guide)
				.where(
					keepSlugs.length
						? and(eq(guide.project, repoKey), notInArray(guide.slug, keepSlugs))
						: eq(guide.project, repoKey),
				)
				.returning()
				.all();
			const removedImages = tx
				.delete(image)
				.where(
					and(
						eq(image.project, repoKey),
						eq(image.source, "sync"),
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
			tx.update(project)
				.set({ docsConfig: config, docsSyncedSha: sha })
				.where(eq(project.repo, repoKey))
				.run();
			tx.update(syncRun)
				.set({ status: "ok", sha, changed, finishedAt: new Date() })
				.where(eq(syncRun.id, runId))
				.run();
		});
		invalidate();
		log(`${repoKey}: ✓ done, ${changed} change${changed === 1 ? "" : "s"}`);
		return { status: "ok", changed };
	} catch (cause) {
		const error = cause instanceof Error ? cause.message : String(cause);
		db.update(syncRun)
			.set({ status: "failed", error, finishedAt: new Date() })
			.where(eq(syncRun.id, runId))
			.run();
		log(`${repoKey}: ✗ failed, nothing written: ${error}`);
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

/** The projects a push to this repo and ref should resync. */
export const projectsForPush = (fullName: string, ref: string) =>
	getDb()
		.select()
		.from(project)
		.where(eq(project.githubRepo, fullName))
		.all()
		.filter((row) => ref === `refs/heads/${row.defaultBranch ?? "main"}`)
		.map((row) => row.repo);

/** Paths a push touched that the docs are built from. */
export const touchesDocs = (paths: string[]) =>
	paths.some((path) => path.startsWith("docs/") || ROOT_GUIDES.some((root) => root.file === path));

/**
 * The safety net for missed webhooks: every project whose default branch moved
 * since its last sync is synced again.
 */
export async function reconcile(log = quiet) {
	const app = await getGithubApp();
	if (!app?.installationId) {
		log("The GitHub App isn't installed: nothing to sync.");
		return;
	}
	const rows = getDb().select().from(project).where(isNotNull(project.githubRepo)).all();
	log(`Checking ${rows.length} project${rows.length === 1 ? "" : "s"} with a linked repo.`);
	for (const row of rows) {
		const branch = row.defaultBranch ?? "main";
		try {
			const head = await github<{ commit: { sha: string } }>(
				app,
				`/repos/${row.githubRepo}/branches/${encodeURIComponent(branch)}`,
			);
			const at = `${row.githubRepo}@${branch} is at ${short(head.commit.sha)}, last synced ${short(row.docsSyncedSha)}`;
			if (head.commit.sha === row.docsSyncedSha) {
				log(`${row.repo}: ${at}, up to date`);
				continue;
			}
			log(`${row.repo}: ${at}`);
			await syncRepo(row.repo, head.commit.sha, log);
		} catch (cause) {
			console.error(`reconcile ${row.repo}:`, cause);
			log(`${row.repo}: ✗ ${cause instanceof Error ? cause.message : String(cause)}`);
		}
	}
	log("Every project checked.");
}
