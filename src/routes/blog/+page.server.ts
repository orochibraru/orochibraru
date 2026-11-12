import { loadPosts } from "#lib/server/posts.ts";

export const load = async () => ({
	posts: (await loadPosts()).map(({ slug, title, date, description }) => ({
		slug,
		title,
		date,
		description,
	})),
});
