import { error, redirect } from "@sveltejs/kit";
import {
	createPost,
	deletePost,
	getPostById,
	listAllPosts,
	setPostStatus,
} from "$lib/server/editor";

const postFrom = async (request: Request) => {
	const post = getPostById(Number((await request.formData()).get("id")));
	if (!post) {
		throw error(404);
	}
	return post;
};

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
	publish: async ({ request }) => {
		setPostStatus((await postFrom(request)).id, "published");
	},
	unpublish: async ({ request }) => {
		setPostStatus((await postFrom(request)).id, "draft");
	},
	delete: async ({ request }) => {
		deletePost((await postFrom(request)).id);
	},
};
