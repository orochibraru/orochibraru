import { docsUrl, type Project } from "$lib/projects";
import { clip, mdPath, readable, SITE } from "$lib/seo";
import { PAGES } from "$lib/site";
import { getPublishedProjectRow, listProjectPages, projectMarkdown } from "./content";
import { type Guide, loadDocProjects, loadGuides } from "./guides";
import { descriptionOf, markdown, titleOf } from "./markdown";
import { loadPosts, type Post } from "./posts";

export type Doc = { path: string; group: string; title: string; description: string; body: string };

type Fetch = typeof fetch;

/** A hand-written page, converted from what it actually renders to. */
export async function pageDoc(fetch: Fetch, page: (typeof PAGES)[number]): Promise<Doc> {
	const html = await (await fetch(page.path)).text();
	return {
		path: page.path,
		group: page.group,
		title: titleOf(html),
		description: descriptionOf(html),
		body: markdown(html),
	};
}

/** A project page, from its stored Markdown rather than its HTML. */
export function projectPageDoc(repo: string): Doc | undefined {
	const row = getPublishedProjectRow(repo);
	return (
		row && {
			path: `/${row.repo}`,
			group: "Projects",
			title: row.title,
			description: row.description,
			body: projectMarkdown(row),
		}
	);
}

export const projectDoc = (project: Project, guides: Guide[]): Doc => ({
	path: docsUrl(project),
	group: `${project.name} docs`,
	title: `${project.name} documentation`,
	description: project.blurb,
	body:
		`# ${project.name} documentation\n\n${project.blurb}\n\n` +
		`The Markdown in [the project repo](${project.repo}/tree/${project.branch}/docs) is the source of truth;\n` +
		`these pages are generated from it.\n\n` +
		guides
			.filter((guide) => guide.project.key === project.key)
			.map((guide) => `- [${guide.title}](${SITE}${mdPath(guide.url)}): ${clip(guide.intro, 160)}`)
			.join("\n") +
		"\n",
});

export const guideDoc = (guide: Guide): Doc => ({
	path: guide.url,
	group: `${guide.project.name} docs`,
	title: guide.title,
	description: clip(guide.intro, 180),
	body: guide.markdown,
});

export const postDoc = (post: Post): Doc => ({
	path: `/blog/${post.slug}`,
	group: "Blog",
	title: post.title,
	description: post.description,
	body: `# ${post.title}\n\n*${readable(post.date)}*\n\n${post.markdown}\n`,
});

export async function allDocs(fetch: Fetch): Promise<Doc[]> {
	const [guides, posts, projects] = await Promise.all([
		loadGuides(),
		loadPosts(),
		loadDocProjects(),
	]);
	return [
		...(await Promise.all(PAGES.map((page) => pageDoc(fetch, page)))),
		...listProjectPages().flatMap((page) => projectPageDoc(page.repo) ?? []),
		...projects.map((project) => projectDoc(project, guides)),
		...guides.map(guideDoc),
		...posts.map(postDoc),
	];
}

/** A page's Markdown twin: what it is, where it came from, then the page itself. */
export const twin = (doc: Doc) =>
	`> ${doc.description}\n> Source: ${SITE}${doc.path} · Site index: ${SITE}/llms.txt\n\n${doc.body}`;

export const markdownResponse = (doc: Doc) =>
	new Response(twin(doc), { headers: { "content-type": "text/markdown; charset=utf-8" } });
