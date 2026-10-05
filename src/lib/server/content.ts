// What the public routes read, and nothing else: routes never touch Drizzle
// directly. Rendering (Shiki above all) is cached in memory until a save or a
// sync calls invalidate().
import { and, asc, count, eq } from "drizzle-orm";
import { SITE } from "$lib/seo";
import { getDb } from "./db";
import { deletedPost, guide, project, projectsPage } from "./db/schema";
import { invalidateGuides } from "./guides";
import { imageByName } from "./images";
import { invalidatePosts } from "./posts";
import { type ProjectPage, type ProjectRow, renderProjectPage } from "./project-pages";

export type ProjectCard = {
	repo: string;
	name: string;
	category: string;
	blurb: string;
	chips: string[];
	tag: string;
	/** Published guides: 0 means the project has no docs here. */
	guides: number;
	/** The repo on GitHub, when there is one. */
	source?: string;
	/** The page's hero screenshot, when it has one: dark falls back to light. */
	shot?: { light: string; dark: string; width: number; height: number; alt: string };
};

const published = () =>
	getDb()
		.select()
		.from(project)
		.where(eq(project.published, true))
		.orderBy(asc(project.position), asc(project.name))
		.all();

/** Each project's guides in the latest channel. */
export const guideCounts = () =>
	new Map(
		getDb()
			.select({ project: guide.project, total: count() })
			.from(guide)
			.where(eq(guide.channel, "latest"))
			.groupBy(guide.project)
			.all()
			.map((row) => [row.project, row.total]),
	);

/** The home page's cards, in the order the admin set. */
export function listProjectCards(): ProjectCard[] {
	const guides = guideCounts();
	return published().map(({ repo, name, category, blurb, chips, tag, image, githubRepo }) => {
		const light = image ? imageByName(repo, image.src) : undefined;
		const dark = image ? (imageByName(repo, `${image.src}-dark`) ?? light) : undefined;
		return {
			repo,
			name,
			category,
			blurb,
			chips,
			tag,
			guides: guides.get(repo) ?? 0,
			source: githubRepo ? `https://github.com/${githubRepo}` : undefined,
			shot:
				image && light && dark
					? {
							light: light.url,
							dark: dark.url,
							width: light.width,
							height: light.height,
							alt: image.alt,
						}
					: undefined,
		};
	});
}

export type ProjectsPage = Omit<typeof projectsPage.$inferSelect, "id">;

/** The /projects copy until the admin saves its own. */
export const PROJECTS_PAGE: ProjectsPage = {
	title: "Projects: free, self-hosted software for your homelab",
	description:
		"Free, open-source, self-hosted replacements for the subscriptions a homelab collects: a drive, a PaaS, server alerting, a start page, a media client and the tooling that ships them.",
	tag: "MIT & AGPL",
	heading: "Each one replaces",
	accent: "a subscription.",
	intro:
		"Every project here does a job people usually rent from someone else. Each one runs in a container on a box you own, keeps its data in a volume you can back up, and costs nothing, today or later.",
	others: "Also in the box",
};

export function getProjectsPage(): ProjectsPage {
	const row = getDb().select().from(projectsPage).where(eq(projectsPage.id, 1)).get();
	if (!row) {
		return PROJECTS_PAGE;
	}
	const { id: _, ...copy } = row;
	return copy;
}

/** Published project pages, for the sitemap, search and the llms files. */
export const listProjectPages = () =>
	published().map(({ repo, name, title, description, updatedAt }) => ({
		repo,
		name,
		title,
		description,
		updatedAt,
	}));

const pages = new Map<string, Promise<ProjectPage>>();

/** A published project's rendered page, or undefined: the route turns that into a 404. */
export function getProjectPage(repo: string): Promise<ProjectPage> | undefined {
	const cached = pages.get(repo);
	if (cached) {
		return cached;
	}
	const row = getDb()
		.select()
		.from(project)
		.where(and(eq(project.repo, repo), eq(project.published, true)))
		.get();
	if (!row) {
		return undefined;
	}
	const rendered = renderProjectPage(row).catch((cause) => {
		pages.delete(repo);
		throw cause;
	});
	pages.set(repo, rendered);
	return rendered;
}

/**
 * A project page as its Markdown twin: the stored body, with screenshot names
 * turned into their image URLs and site-relative links made absolute.
 */
export function projectMarkdown(row: Pick<ProjectRow, "repo" | "name" | "body">): string {
	const body = row.body
		.replace(/!\[([^\]]*)\]\(([\w/-]+)\)/g, (whole, alt: string, name: string) => {
			const found = imageByName(row.repo, name);
			return found ? `![${alt}](${found.url})` : whole;
		})
		.replace(/\]\((\/[^)]*)\)/g, (_link, path: string) => `](${SITE}${path})`)
		// `## Heading {#id}` is this site's anchor syntax, not Markdown anyone else reads
		.replace(/^(#{2,6} .*?)\s*\{#[\w-]+\}$/gm, "$1");
	return `# ${row.name}\n\n${body.trim()}\n`;
}

export const getPublishedProjectRow = (repo: string) =>
	getDb()
		.select()
		.from(project)
		.where(and(eq(project.repo, repo), eq(project.published, true)))
		.get();

/** Whether a post used to live at this slug, so its URL can redirect instead of 404ing. */
export const wasPostDeleted = (slug: string) =>
	getDb().select().from(deletedPost).where(eq(deletedPost.slug, slug)).get() !== undefined;

/** Every save and every sync ends here. */
export function invalidate() {
	pages.clear();
	invalidateGuides();
	invalidatePosts();
}
