// What nginx used to do in front of the static build, now done by the app.

/**
 * One canonical URL per page: /index(.html), /x.html and /x/ redirect to /x.
 * Returns the relative target, or null when the URL is already canonical.
 */
export function canonical(url: URL): string | null {
	const path = url.pathname;
	const target = path
		.replace(/\/index(?:\.html)?$/, "/")
		.replace(/\.html$/, "")
		.replace(/(.)\/$/, "$1");
	return target === path ? null : `${target}${url.search}`;
}

// robots.txt, the Markdown twins and the feeds are full of em dashes: without an
// explicit charset some clients read them as us-ascii.
const TEXTUAL = /^(?:text\/(?!html)|application\/(?:json|xml|rss\+xml|atom\+xml|javascript))/;

export function withHeaders(response: Response): Response {
	const headers = response.headers;
	headers.set("x-content-type-options", "nosniff");
	headers.set("x-frame-options", "SAMEORIGIN");
	headers.set("referrer-policy", "strict-origin-when-cross-origin");
	const type = headers.get("content-type");
	if (type && TEXTUAL.test(type) && !/charset=/i.test(type)) {
		headers.set("content-type", `${type}; charset=utf-8`);
	}
	return response;
}

// Server-to-server OAuth calls from MCP clients: form posts with no Origin by design.
const MACHINE_ENDPOINTS = new Set([
	"/api/auth/oauth2/token",
	"/api/auth/oauth2/register",
	"/api/auth/oauth2/revoke",
	"/api/auth/oauth2/introspect",
]);

const FORM = /^(?:application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)\b/i;

/**
 * SvelteKit's cross-site form check, minus the OAuth endpoints above: a form post
 * that changes something must come from this origin.
 */
export function isCrossSiteForm(request: Request, url: URL): boolean {
	if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
		return false;
	}
	if (!FORM.test(request.headers.get("content-type") ?? "")) {
		return false;
	}
	if (MACHINE_ENDPOINTS.has(url.pathname)) {
		return false;
	}
	return request.headers.get("origin") !== url.origin;
}
