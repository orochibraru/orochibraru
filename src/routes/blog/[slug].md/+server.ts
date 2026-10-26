import { error, redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { renamedPostTarget, wasPostDeleted } from "$lib/server/content";
import { markdownResponse, postDoc } from "$lib/server/documents";
import { loadPosts } from "$lib/server/posts";

export const GET = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		const moved = renamedPostTarget(params.slug);
		if (moved) {
			throw redirect(301, `${resolve("/blog/[slug]", { slug: moved })}.md`);
		}
		if (wasPostDeleted(params.slug)) {
			throw redirect(301, resolve("/blog"));
		}
		throw error(404);
	}
	return markdownResponse(postDoc(post));
};
