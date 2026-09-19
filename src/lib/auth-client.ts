import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/svelte";

// oauthProviderClient carries the signed OAuth query from the login and consent
// pages into their requests, so an MCP authorization resumes after sign-in.
export const authClient = createAuthClient({
	plugins: [oauthProviderClient()],
});
