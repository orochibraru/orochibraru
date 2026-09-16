import { docsUrl, PROJECTS } from "$lib/projects";
import { SITE } from "$lib/seo";
import { loadGuides } from "$lib/server/guides";
import { loadPosts } from "$lib/server/posts";
import { PAGES } from "$lib/site";

export const prerender = true;

export const GET = async () => {
	const [guides, posts] = await Promise.all([loadGuides(), loadPosts()]);
	const today = new Date().toISOString().slice(0, 10);
	const rows = [
		...PAGES.map((page) => [page.path, today, page.priority] as const),
		...PROJECTS.map((project) => [docsUrl(project), today, "0.7"] as const),
		...guides.map((guide) => [guide.url, today, "0.6"] as const),
		...posts.map((post) => [`/blog/${post.slug}`, post.date, "0.6"] as const),
	]
		.map(
			([path, modified, priority]) =>
				`  <url><loc>${SITE}${path}</loc><lastmod>${modified}</lastmod><priority>${priority}</priority></url>`,
		)
		.join("\n");

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`,
		{ headers: { "content-type": "application/xml" } },
	);
};
