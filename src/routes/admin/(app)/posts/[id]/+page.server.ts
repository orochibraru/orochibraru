import { error, fail, redirect } from "@sveltejs/kit";
import {
	deletePost,
	EditorError,
	getPostById,
	setPostStatus,
	updatePost,
} from "$lib/server/editor";

const postOr404 = (id: string) => {
	const post = getPostById(Number(id));
	if (!post) {
		throw error(404);
	}
	return post;
};

export const load = ({ params }) => ({ post: postOr404(params.id) });

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

export const actions = {
	save: async ({ params, request }) => {
		const post = postOr404(params.id);
		const form = await request.formData();
		try {
			updatePost(post.id, {
				title: field(form, "title"),
				slug: field(form, "slug"),
				date: field(form, "date"),
				description: field(form, "description"),
				body: field(form, "body"),
			});
			const status = field(form, "status");
			if (status === "draft" || status === "published") {
				setPostStatus(post.id, status);
			}
		} catch (cause) {
			if (cause instanceof EditorError) {
				return fail(400, { message: cause.message });
			}
			throw cause;
		}
		return { saved: true };
	},
	delete: ({ params }) => {
		deletePost(postOr404(params.id).id);
		throw redirect(303, "/admin/posts");
	},
};
