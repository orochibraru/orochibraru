import { requireMcpAuth } from "@better-auth/mcp";
import { error } from "@sveltejs/kit";
import { unavailableAs503 } from "$lib/server/admin";
import { getAuth } from "$lib/server/auth";
import { env } from "$lib/server/env";
import { handleMcp } from "$lib/server/mcp";
import { isTokenOnAllowlist } from "$lib/server/mcp-auth";

const RESOURCE = `${env.origin}/mcp`;

async function mcp({ request }: { request: Request }) {
	const auth = await unavailableAs503(getAuth());
	if (!auth) {
		throw error(404);
	}
	// signature, issuer, audience, expiry and the `content` scope, answered with the
	// RFC 9728 challenge MCP clients use to start signing in
	const guarded = requireMcpAuth(
		auth,
		async (req, claims) => {
			// a token outlives an allowlist change: the address is checked on every call
			if (!(await isTokenOnAllowlist(claims))) {
				return new Response("This account is not on ADMIN_EMAILS", { status: 403 });
			}
			return handleMcp(req);
		},
		{ resource: RESOURCE, requiredScopes: ["content"] },
	);
	return guarded(request);
}

export const GET = mcp;
export const POST = mcp;
export const DELETE = mcp;
