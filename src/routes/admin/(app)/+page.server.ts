import { digest } from "$lib/server/digest";
import { docsVersions, overview } from "$lib/server/editor";
import { getSearchConsole, searchStats } from "$lib/server/search-console";
import { getUmami, umamiReport, umamiStats } from "$lib/server/umami";

export const load = async () => {
	const { posts, projects, runs, uploads } = overview();
	const synced = new Map(
		docsVersions()
			.filter((version) => version.channel === "latest")
			.map((version) => [version.project, version.sha]),
	);
	const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
	const analytics = umami ? umamiStats(umami) : undefined;
	const searched = search ? searchStats(search) : undefined;
	// a service that's down just drops out of the digest
	const digested = Promise.all([
		umami &&
			Promise.all([analytics, umamiReport(umami, 1), umamiReport(umami, 30)])
				.then(([stats, day, month]) => stats && { stats, day, month })
				.catch(() => undefined),
		searched?.catch(() => undefined),
	]).then(([umamiDigest, searchDigest]) =>
		digest({ umami: umamiDigest || undefined, search: searchDigest }),
	);
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
		analytics,
		search: searched,
		digest: umami || search ? digested : undefined,
	};
};
