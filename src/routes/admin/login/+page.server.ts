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
	// an OAuth authorization parks its query here: never short-circuit that one
	if (session && isAdminEmail(session.user.email) && !url.searchParams.has("client_id")) {
		throw redirect(303, url.searchParams.get("next") ?? "/admin");
	}
	return { signedInAs: session?.user.email ?? null };
};
