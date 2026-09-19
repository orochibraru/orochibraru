import { fail } from "@sveltejs/kit";
import { listAddableRepos } from "$lib/server/editor";
import { env } from "$lib/server/env";
import {
	forgetGithubApp,
	getGithubApp,
	manifest,
	manifestTarget,
	recordInstallation,
	refreshInstalledRepos,
} from "$lib/server/github/app";

export const load = async ({ url, cookies }) => {
	const app = await getGithubApp();
	// GitHub sends you back here after an install, often before its webhook lands
	const installed = Number(url.searchParams.get("installation_id"));
	if (app && installed && app.installationId !== installed) {
		await recordInstallation(installed).catch((cause) => console.error(cause));
	}
	const current = await getGithubApp();
	let state: string | null = null;
	if (!current) {
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
	};
};

export const actions = {
	refresh: async () => {
		try {
			await refreshInstalledRepos();
		} catch (cause) {
			return fail(502, { message: cause instanceof Error ? cause.message : "GitHub failed" });
		}
	},
	forget: () => {
		forgetGithubApp();
	},
};
