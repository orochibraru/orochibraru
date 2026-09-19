// Every write to posts, projects and images, for the admin UI and the MCP
// tools alike: one place validates, one place clears the render cache.
import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";
import { z } from "zod";
import { invalidate } from "./content";
import { getDb } from "./db";
import { image, installedRepo, post, project, syncRun } from "./db/schema";
import { imageUrl } from "./images";
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
		description: z.string().trim().default(""),
		body: z.string().default(""),
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

export function deletePost(id: number) {
	getDb().delete(post).where(eq(post.id, id)).run();
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

/** The order of the home page cards: repos listed first come first. */
export function reorderProjects(repos: string[]) {
	const db = getDb();
	db.transaction((tx) => {
		repos.forEach((repo, position) => {
			tx.update(project).set({ position }).where(eq(project.repo, repo)).run();
		});
	});
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

// ---- images

export type ImageRow = typeof image.$inferSelect;

/** Uploads, and each project's synced screenshots, newest first. */
export const listImages = () => getDb().select().from(image).orderBy(desc(image.createdAt)).all();

/** Where an image is used: posts and project pages that reference its URL or, for screenshots, its name. */
export function imageUsages(row: ImageRow): string[] {
	const db = getDb();
	const url = imageUrl(row.sha256);
	const posts = db
		.select({ id: post.id, title: post.title })
		.from(post)
		.where(like(post.body, `%${url}%`))
		.all()
		.map((item) => `post: ${item.title}`);
	const projects = db
		.select({ repo: project.repo })
		.from(project)
		.where(
			row.project && row.name
				? and(
						eq(project.repo, row.project),
						or(
							like(project.body, `%](${row.name})%`),
							like(project.body, `%](${row.name.replace(/-dark$/, "")})%`),
						),
					)
				: like(project.body, `%${url}%`),
		)
		.all()
		.map((item) => `project: ${item.repo}`);
	return [...posts, ...projects];
}

/** A project's screenshots by name, for the editor to show them. */
export const projectImages = (repo: string): Record<string, string> =>
	Object.fromEntries(
		getDb()
			.select({ name: image.name, sha256: image.sha256 })
			.from(image)
			.where(eq(image.project, repo))
			.all()
			.flatMap((row) => (row.name ? [[row.name, imageUrl(row.sha256)]] : [])),
	);

export function setImageAlt(id: number, alt: string) {
	getDb().update(image).set({ alt }).where(eq(image.id, id)).run();
	invalidate();
}

/** The admin overview: a glance at everything. */
export const overview = () => ({
	posts: listAllPosts().slice(0, 5),
	projects: listAllProjects(),
	runs: recentSyncRuns(),
	uploads: getDb().select().from(image).where(isNull(image.project)).all().length,
});
