import { fail } from "@sveltejs/kit";
import { env } from "$lib/server/env";
import {
	forgetSearchConsole,
	getSearchConsole,
	SearchConsoleError,
	saveSearchConsole,
	testSearchConsole,
} from "$lib/server/search-console";
import { forgetUmami, getUmami, saveUmami, testUmami, UmamiError } from "$lib/server/umami";

export const load = async () => {
	const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
	return {
		// the keys never leave the server
		umami: umami && { url: umami.url, websiteId: umami.websiteId },
		search: search && {
			site: search.site,
			email: (JSON.parse(search.serviceAccount) as { client_email: string }).client_email,
		},
		searchPlaceholder: `sc-domain:${new URL(env.origin).hostname}`,
		// streamed, and resolved rather than rejected so the reason survives production
		umamiProblem: umami ? testUmami(umami) : undefined,
		searchProblem: search ? testSearchConsole(search) : undefined,
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
			return { saved: true };
		} catch (cause) {
			if (cause instanceof UmamiError) {
				return fail(400, { umamiError: cause.message });
			}
			throw cause;
		}
	},
	refreshUmami: async () => {
		const umami = await getUmami();
		if (umami) {
			await testUmami(umami, true);
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
			return { saved: true };
		} catch (cause) {
			if (cause instanceof SearchConsoleError) {
				return fail(400, { searchError: cause.message });
			}
			throw cause;
		}
	},
	refreshSearchConsole: async () => {
		const search = await getSearchConsole();
		if (search) {
			await testSearchConsole(search, true);
		}
	},
	forgetSearchConsole: () => {
		forgetSearchConsole();
	},
};
