import { fail } from "@sveltejs/kit";
import { docsVersions, overview } from "$lib/server/editor";
import { env } from "$lib/server/env";
import {
	forgetSearchConsole,
	getSearchConsole,
	SearchConsoleError,
	saveSearchConsole,
	searchStats,
} from "$lib/server/search-console";
import { forgetUmami, getUmami, saveUmami, UmamiError, umamiStats } from "$lib/server/umami";

export const load = async () => {
	const { posts, projects, runs, uploads } = overview();
	const synced = new Map(
		docsVersions()
			.filter((version) => version.channel === "latest")
			.map((version) => [version.project, version.sha]),
	);
	const umami = await getUmami();
	const search = await getSearchConsole();
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
		// the key never leaves the server
		umami: umami && { url: umami.url, websiteId: umami.websiteId },
		// streamed: the page doesn't wait on Umami
		analytics: umami ? umamiStats(umami) : undefined,
		// the property only: the service account key never leaves the server either
		searchSite: search?.site,
		searchPlaceholder: `sc-domain:${new URL(env.origin).hostname}`,
		search: search ? searchStats(search) : undefined,
	};
};

export const actions = {
	umami: async ({ request }) => {
		const form = await request.formData();
		const field = (name: string) => String(form.get(name) ?? "");
		try {
			await saveUmami({
				url: field("url"),
				websiteId: field("websiteId"),
				apiKey: field("apiKey"),
			});
		} catch (cause) {
			if (cause instanceof UmamiError) {
				return fail(400, { umamiError: cause.message });
			}
			throw cause;
		}
	},
	forgetUmami: () => {
		forgetUmami();
	},
	searchConsole: async ({ request }) => {
		const form = await request.formData();
		try {
			await saveSearchConsole({
				site: String(form.get("site") ?? ""),
				serviceAccount: String(form.get("serviceAccount") ?? ""),
			});
		} catch (cause) {
			if (cause instanceof SearchConsoleError) {
				return fail(400, { searchError: cause.message });
			}
			throw cause;
		}
	},
	forgetSearchConsole: () => {
		forgetSearchConsole();
	},
};
