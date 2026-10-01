// Every write to posts and projects, for the admin UI and the MCP
// tools alike: one place validates, one place clears the render cache.
import { and, asc, desc, eq, gt, inArray, isNotNull, like, max, or } from "drizzle-orm";
import { z } from "zod";
import { invalidate } from "./content";
import { getDb } from "./db";
import {
	deletedPost,
	docsVersion,
	guide,
	image,
	installedRepo,
	post,
	project,
	projectsPage,
	syncChange,
	syncRun,
} from "./db/schema";
import { ProjectFields } from "./project-pages";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "This is where I rant!" -> this-is-where-i-rant */
export const slugFrom = (title: string) =>
	title
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80) || "post";

const today = () => new Date().toISOString().slice(0, 10);

export const PostInput = z
	.object({
		title: z.string().trim().min(1),
		slug: z.string().regex(SLUG, "lowercase letters, digits and hyphens").optional(),
		date: z.iso.date().optional(),
		// no .default(""): zod 4 keeps defaults through .partial(), so an update would blank
		// whatever it leaves out. The columns default to "" on insert.
		description: z.string().trim().optional(),
		body: z.string().optional(),
	})
	.strict();

export type PostInput = z.input<typeof PostInput>;
export type PostRow = typeof post.$inferSelect;

export class EditorError extends Error {}

const parse = <T extends z.ZodType>(schema: T, input: unknown): z.output<T> => {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new EditorError(z.prettifyError(parsed.error));
	}
	return parsed.data;
};

// ---- posts

export const listAllPosts = (status?: PostRow["status"]) =>
	getDb()
		.select()
		.from(post)
		.where(status ? eq(post.status, status) : undefined)
		.orderBy(desc(post.date), desc(post.id))
		.all();

export const getPostById = (id: number) => getDb().select().from(post).where(eq(post.id, id)).get();
export const getPostBySlug = (slug: string) =>
	getDb().select().from(post).where(eq(post.slug, slug)).get();

function uniqueSlug(base: string, except?: number): string {
	for (let n = 1; ; n++) {
		const slug = n === 1 ? base : `${base}-${n}`;
		const taken = getPostBySlug(slug);
		if (!taken || taken.id === except) {
			return slug;
		}
	}
}

/** New posts are drafts, whoever writes them: publishing is always its own step. */
export function createPost(input: PostInput): PostRow {
	const data = parse(PostInput, input);
	const [row] = getDb()
		.insert(post)
		.values({
			...data,
			slug: uniqueSlug(data.slug ?? slugFrom(data.title)),
			date: data.date ?? today(),
			status: "draft",
		})
		.returning()
		.all();
	invalidate();
	return row as PostRow;
}

export function updatePost(id: number, patch: Partial<PostInput>): PostRow {
	const current = getPostById(id);
	if (!current) {
		throw new EditorError(`no post ${id}`);
	}
	const data = parse(PostInput.partial(), patch);
	if (data.slug && data.slug !== current.slug && getPostBySlug(data.slug)) {
		throw new EditorError(`the slug ${data.slug} is taken`);
	}
	const [row] = getDb()
		.update(post)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(post.id, id))
		.returning()
		.all();
	invalidate();
	return row as PostRow;
}

export function setPostStatus(id: number, status: PostRow["status"]): PostRow {
	const [row] = getDb()
		.update(post)
		.set({ status, updatedAt: new Date() })
		.where(eq(post.id, id))
		.returning()
		.all();
	if (!row) {
		throw new EditorError(`no post ${id}`);
	}
	invalidate();
	return row;
}

/** Its URL lives on as a redirect to the blog, unless a later post takes the slug. */
export function deletePost(id: number) {
	getDb().transaction((tx) => {
		const [row] = tx.delete(post).where(eq(post.id, id)).returning().all();
		if (row) {
			tx.insert(deletedPost).values({ slug: row.slug }).onConflictDoNothing().run();
		}
	});
	invalidate();
}

// ---- projects

export type ProjectRow = typeof project.$inferSelect;

export const ProjectPatch = ProjectFields.partial()
	.extend({ body: z.string().optional(), published: z.boolean().optional() })
	.strict();

export type ProjectPatch = z.input<typeof ProjectPatch>;

export const listAllProjects = () =>
	getDb().select().from(project).orderBy(asc(project.position), asc(project.name)).all();

export const getProject = (repo: string) =>
	getDb().select().from(project).where(eq(project.repo, repo)).get();

export function updateProject(repo: string, patch: ProjectPatch): ProjectRow {
	if (!getProject(repo)) {
		throw new EditorError(`no project ${repo}`);
	}
	const data = parse(ProjectPatch, patch);
	const [row] = getDb()
		.update(project)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(project.repo, repo))
		.returning()
		.all();
	invalidate();
	return row as ProjectRow;
}

/** The order of the home page cards: repos listed first come first. Every project, once. */
export function reorderProjects(repos: string[]) {
	const current = listAllProjects().map((row) => row.repo);
	if (repos.length !== current.length || !current.every((repo) => repos.includes(repo))) {
		throw new EditorError(`list every project exactly once: ${current.join(", ")}`);
	}
	const db = getDb();
	db.transaction((tx) => {
		repos.forEach((repo, position) => {
			tx.update(project).set({ position }).where(eq(project.repo, repo)).run();
		});
	});
	invalidate();
}

export const ProjectsPageInput = z
	.object({
		title: z.string().trim().min(1),
		description: z.string().trim().min(1),
		tag: z.string().trim(),
		heading: z.string().trim().min(1),
		accent: z.string().trim(),
		intro: z.string().trim(),
		others: z.string().trim().min(1),
	})
	.strict();

export function updateProjectsPage(input: z.input<typeof ProjectsPageInput>) {
	const copy = parse(ProjectsPageInput, input);
	getDb()
		.insert(projectsPage)
		.values({ id: 1, ...copy })
		.onConflictDoUpdate({ target: projectsPage.id, set: copy })
		.run();
	invalidate();
}

/** Repos the GitHub App can see that aren't projects yet. */
export const listAddableRepos = () => {
	const taken = new Set(listAllProjects().map((row) => row.githubRepo));
	return getDb()
		.select()
		.from(installedRepo)
		.orderBy(asc(installedRepo.fullName))
		.all()
		.filter((repo) => !taken.has(repo.fullName));
};

/** A draft project for an installed repo: fill in the page, then publish it. */
export function createProject(fullName: string): ProjectRow {
	const installed = getDb()
		.select()
		.from(installedRepo)
		.where(eq(installedRepo.fullName, fullName))
		.get();
	if (!installed) {
		throw new EditorError(`${fullName} isn't a repo the GitHub App can read`);
	}
	const repo = (fullName.split("/")[1] ?? fullName).toLowerCase();
	if (getProject(repo)) {
		throw new EditorError(`there is already a project at /${repo}`);
	}
	const last = listAllProjects().at(-1);
	const [row] = getDb()
		.insert(project)
		.values({
			repo,
			name: fullName.split("/")[1] ?? repo,
			title: fullName.split("/")[1] ?? repo,
			githubRepo: fullName,
			defaultBranch: installed.defaultBranch,
			buttons: [
				{
					label: "Source on GitHub",
					href: `https://github.com/${fullName}`,
					icon: "github",
					primary: true,
				},
			],
			position: (last?.position ?? -1) + 1,
			published: false,
		})
		.returning()
		.all();
	invalidate();
	return row as ProjectRow;
}

export const recentSyncRuns = (limit = 8, repo?: string) =>
	getDb()
		.select()
		.from(syncRun)
		.where(repo ? eq(syncRun.repo, repo) : undefined)
		.orderBy(desc(syncRun.startedAt))
		.limit(limit)
		.all();

/** Every project with a linked repo and its most recent sync run, if it has one. */
export function lastSyncs() {
	const db = getDb();
	const latest = db
		.select({ id: max(syncRun.id) })
		.from(syncRun)
		.groupBy(syncRun.repo)
		.all()
		.flatMap((row) => (row.id ? [row.id] : []));
	const runs = new Map(
		(latest.length ? db.select().from(syncRun).where(inArray(syncRun.id, latest)).all() : []).map(
			(run) => [run.repo, run],
		),
	);
	return db
		.select({ repo: project.repo, name: project.name, githubRepo: project.githubRepo })
		.from(project)
		.where(isNotNull(project.githubRepo))
		.orderBy(asc(project.position), asc(project.name))
		.all()
		.map((row) => ({ ...row, run: runs.get(row.repo) ?? null }));
}

export type SyncChangeRow = typeof syncChange.$inferSelect;

/**
 * The runs that did something, changed files or failed, grouped by project with
 * the newest first, each with the files it touched. A run with nothing to show is left out.
 */
export function syncHistory(perRepo = 5) {
	const db = getDb();
	const byRepo = new Map<string, (typeof syncRun.$inferSelect)[]>();
	const runs = db
		.select()
		.from(syncRun)
		.where(or(gt(syncRun.changed, 0), eq(syncRun.status, "failed")))
		.orderBy(desc(syncRun.id))
		.all();
	for (const run of runs) {
		const list = byRepo.get(run.repo) ?? [];
		if (list.length < perRepo) {
			list.push(run);
			byRepo.set(run.repo, list);
		}
	}
	const ids = [...byRepo.values()].flat().map((run) => run.id);
	// ponytail: every diff is sent with the page; load them on demand if first syncs make it heavy
	const changes = new Map<number, SyncChangeRow[]>();
	for (const change of ids.length
		? db
				.select()
				.from(syncChange)
				.where(inArray(syncChange.runId, ids))
				.orderBy(asc(syncChange.path))
				.all()
		: []) {
		changes.set(change.runId, [...(changes.get(change.runId) ?? []), change]);
	}
	return [...byRepo]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([repo, list]) => ({
			repo,
			runs: list.map((run) => ({ ...run, changes: changes.get(run.id) ?? [] })),
		}));
}

/** What each channel of a project's docs was last synced from, latest first. */
export const docsVersions = (repo?: string) =>
	getDb()
		.select()
		.from(docsVersion)
		.where(repo ? eq(docsVersion.project, repo) : undefined)
		// "latest" sorts after "canary"
		.orderBy(desc(docsVersion.channel))
		.all();

export type DocsStatus = "valid" | "invalid" | "no config" | "no docs" | "not synced";

/**
 * What each project's last sync found in its docs/, going by what it stored: a
 * config.json that fails the schema fails the whole sync, so that one is read
 * off the latest finished run instead.
 */
export function docsStatuses(): Record<string, DocsStatus> {
	const db = getDb();
	const withDocs = new Set([
		...db
			.selectDistinct({ project: guide.project })
			.from(guide)
			.where(like(guide.sourcePath, "docs/%"))
			.all()
			.map((row) => row.project),
		...db
			.selectDistinct({ project: image.project })
			.from(image)
			.all()
			.map((row) => row.project),
	]);
	const lastRun = new Map<string, typeof syncRun.$inferSelect>();
	for (const run of db.select().from(syncRun).orderBy(asc(syncRun.id)).all()) {
		if (run.status === "ok" || run.status === "failed") {
			lastRun.set(run.repo, run);
		}
	}
	const latest = new Map(
		docsVersions()
			.filter((version) => version.channel === "latest")
			.map((version) => [version.project, version]),
	);
	const statuses: Record<string, DocsStatus> = {};
	for (const row of listAllProjects()) {
		const run = lastRun.get(row.repo);
		const synced = latest.get(row.repo);
		if (run?.status === "failed" && run.error?.startsWith("docs/config.json is invalid")) {
			statuses[row.repo] = "invalid";
		} else if (!synced) {
			statuses[row.repo] = "not synced";
		} else if (synced.config) {
			statuses[row.repo] = "valid";
		} else {
			statuses[row.repo] = withDocs.has(row.repo) ? "no config" : "no docs";
		}
	}
	return statuses;
}

/** A project's screenshots by name, for the editor to show them. */
export const projectImages = (repo: string): Record<string, string> =>
	Object.fromEntries(
		getDb()
			.select({ name: image.name, url: image.url })
			.from(image)
			.where(and(eq(image.project, repo), eq(image.channel, "latest")))
			.all()
			.map((row) => [row.name, row.url]),
	);

/** The admin overview: a glance at everything. */
export const overview = () => ({
	posts: listAllPosts().slice(0, 5),
	projects: listAllProjects(),
	runs: recentSyncRuns(),
});
