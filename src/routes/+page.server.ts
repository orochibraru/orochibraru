import { listProjectCards } from "$lib/server/content";
import { loadPosts } from "$lib/server/posts";

export const load = async () => ({
	projects: listProjectCards(),
	posts: (await loadPosts()).slice(0, 3).map(({ slug, title, date, description }) => ({
		slug,
		title,
		date,
		description,
	})),
});
