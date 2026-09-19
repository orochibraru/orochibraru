import { error, redirect } from "@sveltejs/kit";
import { exchangeManifestCode } from "$lib/server/github/app";

// Step two of the manifest flow. The state cookie proves this browser started it.
export const load = async ({ url, cookies }) => {
	const state = url.searchParams.get("state");
	const expected = cookies.get("github_manifest_state");
	const code = url.searchParams.get("code");
	if (!state || !expected || state !== expected || !code) {
		throw error(400, "This GitHub callback doesn't match an app creation started here");
	}
	cookies.delete("github_manifest_state", { path: "/admin/github" });
	await exchangeManifestCode(code);
	throw redirect(303, "/admin/github");
};
