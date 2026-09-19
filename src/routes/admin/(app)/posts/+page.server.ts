import { redirect } from "@sveltejs/kit";
import { createPost, listAllPosts } from "$lib/server/editor";

export const load = ({ url }) => {
	const status = url.searchParams.get("status");
	return {
		status,
		posts: listAllPosts(status === "draft" || status === "published" ? status : undefined).map(
			({ id, slug, title, date, status }) => ({ id, slug, title, date, status }),
		),
	};
};

export const actions = {
	create: () => {
		const created = createPost({ title: "Untitled post" });
		throw redirect(303, `/admin/posts/${created.id}`);
	},
};
