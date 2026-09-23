import { requireAdmin } from "$lib/server/admin";
import { listAllPosts, listAllProjects } from "$lib/server/editor";

// posts and projects feed the ⌘K palette on every admin page
export const load = async (event) => ({
	admin: await requireAdmin(event),
	jump: {
		posts: listAllPosts().map(({ id, title, status }) => ({ id, title, status })),
		projects: listAllProjects().map(({ repo, name }) => ({ repo, name })),
	},
});
