import { error } from "@sveltejs/kit";
import { loadPosts } from "$lib/server/posts";

export const entries = () =>
	loadPosts().then((posts) => posts.map((post) => ({ slug: post.slug })));

export const load = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		throw error(404);
	}
	return { post };
};
