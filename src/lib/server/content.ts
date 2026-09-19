// What the public routes read, and nothing else: routes never touch Drizzle
// directly. Rendering (Shiki above all) is cached in memory until a save or a
// sync calls invalidate().
import { and, asc, eq } from "drizzle-orm";
import { SITE } from "$lib/seo";
import { getDb } from "./db";
import { project } from "./db/schema";
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
};

const published = () =>
	getDb()
		.select()
		.from(project)
		.where(eq(project.published, true))
		.orderBy(asc(project.position), asc(project.name))
		.all();

/** The home page's cards, in the order the admin set. */
export const listProjectCards = (): ProjectCard[] =>
	published().map(({ repo, name, category, blurb, chips }) => ({
		repo,
		name,
		category,
		blurb,
		chips,
	}));

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
 * A project page as its Markdown twin: the stored body, with screenshot names and
 * site-relative links made absolute, since it is read away from this site.
 */
export function projectMarkdown(row: Pick<ProjectRow, "repo" | "name" | "body">): string {
	const body = row.body
		.replace(/!\[([^\]]*)\]\(([\w-]+)\)/g, (whole, alt: string, name: string) => {
			const found = imageByName(row.repo, name);
			return found ? `![${alt}](${SITE}${found.url})` : whole;
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

/** Every save and every sync ends here. */
export function invalidate() {
	pages.clear();
	invalidateGuides();
	invalidatePosts();
}
