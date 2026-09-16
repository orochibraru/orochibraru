import { error } from "@sveltejs/kit";
import { markdownResponse, postDoc } from "$lib/server/documents";
import { loadPosts } from "$lib/server/posts";

export const prerender = true;

export const entries = () =>
	loadPosts().then((posts) => posts.map((post) => ({ slug: post.slug })));

export const GET = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		throw error(404);
	}
	return markdownResponse(postDoc(post));
};
