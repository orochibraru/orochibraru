import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit";
import { building } from "$app/environment";
import { unavailableAs503 } from "$lib/server/admin";
import { getAuth } from "$lib/server/auth";
import { reconcile } from "$lib/server/github/sync";
import { canonical, isCrossSiteForm, withHeaders } from "$lib/server/http";

// better-auth answers /api/auth/*, and the OAuth discovery documents MCP clients
// look for at the root: /.well-known/oauth-{authorization-server,protected-resource}/…
const isAuthRequest = (path: string) =>
	path.startsWith("/api/auth/") ||
	path.startsWith("/.well-known/oauth-") ||
	path === "/.well-known/openid-configuration";

export const handle: Handle = async ({ event, resolve }) => {
	// prerendered files keep none of these headers; leave the build's responses untouched
	if (building) {
		return resolve(event);
	}
	const target = canonical(event.url);
	if (target) {
		// relative, so the TLS proxy in front never sees an http:// Location
		return new Response(null, { status: 301, headers: { location: target } });
	}
	if (isCrossSiteForm(event.request, event.url)) {
		return withHeaders(new Response("Cross-site form submissions are forbidden", { status: 403 }));
	}
	if (isAuthRequest(event.url.pathname)) {
		const auth = await unavailableAs503(getAuth()).catch(() => undefined);
		if (auth === undefined) {
			return withHeaders(new Response("SSO provider unreachable", { status: 503 }));
		}
		if (!auth) {
			return withHeaders(new Response("Not found", { status: 404 }));
		}
		return withHeaders(await auth.handler(event.request));
	}
	return withHeaders(await resolve(event));
};

// Unexpected errors reach the log with their stack; the visitor sees only the status.
export const handleError: HandleServerError = ({ error, event, status }) => {
	if (status !== 404) {
		console.error(`${event.request.method} ${event.url.pathname}`, error);
	}
};

const SIX_HOURS = 6 * 3600_000;

// Webhooks get missed (the site was down, GitHub had a bad day): every six hours,
// and a minute after boot, any project whose branch moved since its last sync syncs.
export const init: ServerInit = () => {
	if (building) {
		return;
	}
	const check = () => {
		reconcile().catch((cause) => console.error("reconcile:", cause));
	};
	setTimeout(check, 60_000).unref();
	setInterval(check, SIX_HOURS).unref();
};
