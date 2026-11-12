import * as Sentry from "@sentry/bun";
import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit/hooks";
import { unavailableAs503 } from "#lib/server/admin.ts";
import { getAuth } from "#lib/server/auth.ts";
import { wasProjectDeleted } from "#lib/server/content.ts";
import { getDataDir, getDb, migrateDatabase } from "#lib/server/db/index.ts";
import { reconcile, startSyncWorker } from "#lib/server/github/worker.ts";
import { canonical, isCrossSiteForm, withHeaders } from "#lib/server/http.ts";
import { startReportSchedule } from "#lib/server/report.ts";
import { building } from "$app/env";

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
	const response = await resolve(event);
	// a deleted project's page, docs and .md twins all send their visitors to /projects
	if (response.status === 404) {
		const repo = event.url.pathname.split("/")[1]?.replace(/\.md$/, "");
		if (repo && wasProjectDeleted(repo)) {
			return new Response(null, { status: 301, headers: { location: "/projects" } });
		}
	}
	return withHeaders(response);
};

// Unexpected errors reach the log with their stack; the visitor sees only the status.
// Kit 3 sends error() calls and its own 404/405s here too: those aren't bugs.
export const handleError: HandleServerError = ({ kind, error, event }) => {
	if (kind === "unknown") {
		console.error(`${event.request.method} ${event.url.pathname}`, error);
		Sentry.captureException(error, {
			extra: { method: event.request.method, path: event.url.pathname },
		});
	}
};

const SIX_HOURS = 6 * 3600_000;

export const init: ServerInit = () => {
	if (building) {
		return;
	}
	// Homerun injects SENTRY_DSN, SENTRY_RELEASE and SENTRY_ENVIRONMENT at deploy; without a DSN
	// the SDK stays off. Errors only: no tracing, Homerun drops it anyway.
	if (process.env.SENTRY_DSN) {
		Sentry.init();
	}
	// Migrate before the first request, not during it: a schema that can't be brought
	// up to date stops the process here, so the container never reports healthy on it.
	try {
		migrateDatabase(getDb());
		console.log(`Database ready at ${getDataDir()}/site.db`);
	} catch (cause) {
		console.error("Could not migrate the database. Exiting.", cause);
		process.exit(1);
	}

	startSyncWorker();
	startReportSchedule();

	// Webhooks get missed (the site was down, GitHub had a bad day): every six hours,
	// and a minute after boot, any project whose branch moved since its last sync syncs.
	const check = () => {
		reconcile().catch((cause) => console.error("reconcile:", cause));
	};
	setTimeout(check, 60_000).unref();
	setInterval(check, SIX_HOURS).unref();
};
