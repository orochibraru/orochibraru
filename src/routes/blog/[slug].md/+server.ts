import { error, redirect } from "@sveltejs/kit";
import { renamedPostTarget, wasPostDeleted } from "#lib/server/content.ts";
import { markdownResponse, postDoc } from "#lib/server/documents.ts";
import { loadPosts } from "#lib/server/posts.ts";
import { resolve } from "$app/paths";

export const GET = async ({ params }) => {
	const post = (await loadPosts()).find((post) => post.slug === params.slug);
	if (!post) {
		const moved = renamedPostTarget(params.slug);
		if (moved) {
			throw redirect(301, `${resolve("/blog/[slug]", { slug: moved })}.md`);
		}
		if (wasPostDeleted(params.slug)) {
			throw redirect(301, resolve("blog"));
		}
		throw error(404);
	}
	return markdownResponse(postDoc(post));
};
