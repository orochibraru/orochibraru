import { error, type RequestEvent, redirect } from "@sveltejs/kit";
import { type Auth, getAuth } from "./auth";
import { env, isAdminEmail } from "./env";

type Deps = { auth: Pick<Auth, "api"> | null; adminEmails?: Set<string> };

/** An IdP that is down is the server's problem, not a missing page. */
export async function unavailableAs503<T>(auth: Promise<T> | null): Promise<T | null> {
	try {
		return await auth;
	} catch (cause) {
		console.error(cause);
		throw error(503, "Sign-in is unavailable: the SSO provider can't be reached");
	}
}

/**
 * The fence around /admin. No SSO configured: the area doesn't exist (404).
 * No session: off to the login page. A session whose email is no longer on
 * ADMIN_EMAILS: refused, even though better-auth still has it.
 */
export async function requireAdmin(
	event: Pick<RequestEvent, "request" | "url">,
	deps?: Deps,
): Promise<{ email: string; name: string }> {
	const auth = deps ? deps.auth : await unavailableAs503(getAuth());
	if (!auth) {
		throw error(404);
	}
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session) {
		const next = `${event.url.pathname}${event.url.search}`;
		throw redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}
	const allowed = deps?.adminEmails ?? env.adminEmails;
	if (!isAdminEmail(session.user.email, { ...env, adminEmails: allowed })) {
		throw error(403, `${session.user.email} is not on ADMIN_EMAILS`);
	}
	return { email: session.user.email, name: session.user.name };
}
