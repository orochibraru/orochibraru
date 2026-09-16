import { json } from "@sveltejs/kit";
import { pageDoc } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";
import { loadPosts } from "$lib/server/posts";
import { PAGES } from "$lib/site";

export const prerender = true;

// A guide contributes a row per heading, so a result lands on the section that answers the question.
export const GET = async ({ fetch }) => {
	const [guides, posts, pages] = await Promise.all([
		loadGuides(),
		loadPosts(),
		Promise.all(PAGES.map((page) => pageDoc(fetch, page))),
	]);

	return json([
		...guides.flatMap((guide) =>
			guide.sections.map((section) => ({
				u: `${guide.url}${section.id ? `#${section.id}` : ""}`,
				t: section.heading,
				g: section.id ? guide.title : `${guide.project.name} docs`,
				p: guide.project.name,
				x: section.text,
			})),
		),
		...pages.map((page) => ({
			u: page.path,
			t: page.title.replace(/[:|].*$/, "").trim(),
			g: "orochibraru",
			p: "",
			x: page.description,
		})),
		...posts.map((post) => ({
			u: `/blog/${post.slug}`,
			t: post.title,
			g: "Blog",
			p: "",
			x: post.description,
		})),
	]);
};
