import { error, redirect } from "@sveltejs/kit";
import {
	createPost,
	deletePost,
	getPostById,
	listAllPosts,
	setPostStatus,
} from "$lib/server/editor";
import { getUmami, pathViews } from "$lib/server/umami";

const postFrom = async (request: Request) => {
	const post = getPostById(Number((await request.formData()).get("id")));
	if (!post) {
		throw error(404);
	}
	return post;
};

export const load = async ({ url }) => {
	const asked = url.searchParams.get("status");
	const status = asked === "draft" || asked === "published" ? asked : null;
	const all = listAllPosts();
	const umami = await getUmami();
	return {
		status,
		counts: {
			all: all.length,
			draft: all.filter((post) => post.status === "draft").length,
			published: all.filter((post) => post.status === "published").length,
		},
		posts: all
			.filter((post) => !status || post.status === status)
			.map(({ id, slug, title, description, date, status, body, updatedAt }) => ({
				id,
				slug,
				title,
				description,
				date,
				status,
				updatedAt,
				words: body.split(/\s+/).filter(Boolean).length,
			})),
		// streamed: the list doesn't wait on Umami
		views: umami ? pathViews(umami).catch(() => null) : undefined,
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
