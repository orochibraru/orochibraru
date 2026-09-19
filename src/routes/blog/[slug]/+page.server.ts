import { error } from "@sveltejs/kit";
import { loadPosts } from "$lib/server/posts";

export const load = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		throw error(404);
	}
	return { post };
};
