import { overview } from "$lib/server/editor";

export const load = () => {
	const { posts, projects, runs, uploads } = overview();
	return {
		posts: posts.map(({ id, title, status }) => ({ id, title, status })),
		projects: projects.map(({ repo, name, published }) => ({ repo, name, published })),
		runs,
		uploads,
	};
};
