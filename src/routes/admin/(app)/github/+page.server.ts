import { fail } from "@sveltejs/kit";
import { lastSyncs, listAddableRepos, syncHistory } from "$lib/server/editor";
import { env } from "$lib/server/env";
import {
	forgetGithubApp,
	getGithubApp,
	manifest,
	manifestTarget,
	recordInstallation,
	refreshInstalledRepos,
} from "$lib/server/github/app";

const reason = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

export const load = async ({ url, cookies }) => {
	let problem = "";
	let broken = "";
	let current: Awaited<ReturnType<typeof getGithubApp>> = null;
	try {
		const app = await getGithubApp();
		// GitHub sends you back here after an install, often before its webhook lands
		const installed = Number(url.searchParams.get("installation_id"));
		if (app && installed && app.installationId !== installed) {
			await recordInstallation(installed).catch((cause) => {
				console.error(cause);
				problem = `The installation didn't record: ${reason(cause)}`;
			});
		}
		current = await getGithubApp();
	} catch (cause) {
		// the app's row exists but can't be read: it can only be unlinked
		broken = reason(cause);
	}
	let state: string | null = null;
	if (!current && !broken) {
		state = crypto.randomUUID();
		cookies.set("github_manifest_state", state, {
			path: "/admin/github",
			httpOnly: true,
			sameSite: "lax",
			secure: env.origin.startsWith("https:"),
			maxAge: 3600,
		});
	}
	return {
		broken,
		problem,
		app: current && {
			slug: current.slug,
			installed: !!current.installationId,
			installUrl: `https://github.com/apps/${current.slug}/installations/new`,
			settingsUrl: `https://github.com/settings/apps/${current.slug}`,
		},
		manifest: JSON.stringify(manifest()),
		target: state && manifestTarget(state),
		orgTarget: state && manifestTarget(state, "ORG"),
		repos: listAddableRepos().map((repo) => repo.fullName),
		overview: current ? lastSyncs() : [],
		history: current ? syncHistory() : [],
	};
};

export const actions = {
	refresh: async () => {
		try {
			await refreshInstalledRepos();
		} catch (cause) {
			return fail(502, { message: `The repo list didn't refresh: ${reason(cause)}` });
		}
	},
	forget: () => {
		forgetGithubApp();
		return { forgotten: true };
	},
};
