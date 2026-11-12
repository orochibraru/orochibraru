import { json } from "@sveltejs/kit";
import { listProjectPages } from "$lib/server/content";
import { pageDoc } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";
import { loadPosts } from "$lib/server/posts";
import { PAGES } from "$lib/site";

// A guide contributes a row per heading, so a result lands on the section that answers the question.
// `r` is the project's repo, which the palette's @project prefix scopes the search to.
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
				r: guide.project.key,
				x: section.text,
			})),
		),
		...listProjectPages().map((page) => ({
			u: `/${page.repo}`,
			t: page.name,
			g: "Projects",
			p: page.name,
			r: page.repo,
			x: page.description,
		})),
		...pages.map((page) => ({
			u: page.path,
			t: page.title.replace(/[:|].*$/, "").trim(),
			g: "zedensix",
			p: "",
			r: "",
			x: page.description,
		})),
		...posts.map((post) => ({
			u: `/blog/${post.slug}`,
			t: post.title,
			g: "Blog",
			p: "",
			r: "",
			x: post.description,
		})),
	]);
};
