import { listConnections, revokeConnection } from "#lib/server/connections.ts";
import { env } from "#lib/server/env.ts";

export const load = () => ({ connections: listConnections(), endpoint: `${env.origin}/mcp` });

export const actions = {
	revoke: async ({ request }) => {
		revokeConnection(String((await request.formData()).get("clientId") ?? ""));
	},
};
