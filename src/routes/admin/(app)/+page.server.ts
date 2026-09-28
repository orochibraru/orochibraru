import { docsVersions, overview } from "$lib/server/editor";
import { getSearchConsole, searchStats } from "$lib/server/search-console";
import { getUmami, umamiStats } from "$lib/server/umami";

export const load = async () => {
	const { posts, projects, runs, uploads } = overview();
	const synced = new Map(
		docsVersions()
			.filter((version) => version.channel === "latest")
			.map((version) => [version.project, version.sha]),
	);
	const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
	return {
		posts: posts.map(({ id, title, date, status }) => ({ id, title, date, status })),
		projects: projects.map(({ repo, name, published }) => ({
			repo,
			name,
			published,
			docsSyncedSha: synced.get(repo),
		})),
		runs,
		uploads,
		// streamed: the page doesn't wait on Umami or Google
		analytics: umami ? umamiStats(umami) : undefined,
		search: search ? searchStats(search) : undefined,
	};
};
