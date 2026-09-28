import { error, redirect } from "@sveltejs/kit";
import { unavailableAs503 } from "$lib/server/admin";
import { getAuth } from "$lib/server/auth";
import { isAdminEmail } from "$lib/server/env";

export const load = async ({ request, url }) => {
	const auth = await unavailableAs503(getAuth());
	if (!auth) {
		throw error(404);
	}
	const session = await auth.api.getSession({ headers: request.headers });
	// better-auth sends failed sign-ins and authorizations here as ?error=…
	const failure = url.searchParams.get("error");
	// an OAuth authorization parks its query here: never short-circuit that one, nor an error
	if (
		session &&
		isAdminEmail(session.user.email) &&
		!url.searchParams.has("client_id") &&
		!failure
	) {
		throw redirect(303, url.searchParams.get("next") ?? "/admin");
	}
	return {
		signedInAs: session?.user.email ?? null,
		failure: failure && {
			code: failure,
			description: url.searchParams.get("error_description"),
		},
	};
};
