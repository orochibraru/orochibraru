import { overview } from "$lib/server/editor";

export const load = () => {
	const { posts, projects, runs, uploads } = overview();
	return {
		posts: posts.map(({ id, title, date, status }) => ({ id, title, date, status })),
		projects: projects.map(({ repo, name, published, docsSyncedSha }) => ({
			repo,
			name,
			published,
			docsSyncedSha,
		})),
		runs,
		uploads,
	};
};
