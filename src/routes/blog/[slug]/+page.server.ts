import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { wasPostDeleted } from "$lib/server/content";
import { loadPosts } from "$lib/server/posts";

export const load = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		if (wasPostDeleted(params.slug)) {
			throw redirect(301, resolve("/blog"));
		}
		throw error(404);
	}
	return { post };
};
