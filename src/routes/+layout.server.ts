import { getAuth } from "$lib/server/auth";
import { isAdminEmail } from "$lib/server/env";

// Whether the header shows an Admin link. Anonymous visitors carry no session
// cookie, so they never wake better-auth (and its IdP discovery) up.
export const load = async ({ request }) => {
	if (!request.headers.get("cookie")?.includes("session_token")) {
		return { signedIn: false };
	}
	try {
		const session = await (await getAuth())?.api.getSession({ headers: request.headers });
		return { signedIn: isAdminEmail(session?.user.email) };
	} catch {
		// the IdP being down is no reason to fail a public page
		return { signedIn: false };
	}
};
