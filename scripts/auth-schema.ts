// The config `npx auth generate` reads to write src/lib/server/db/auth-schema.ts:
// bunx auth@latest generate --config scripts/auth-schema.ts \
//   --output src/lib/server/db/auth-schema.ts --adapter drizzle --dialect sqlite -y
import { tmpdir } from "node:os";
import { createAuth } from "../src/lib/server/auth";
import { openDatabase } from "../src/lib/server/db";
import { readEnv } from "../src/lib/server/env";

export const auth = createAuth(openDatabase(`${tmpdir()}/auth-schema`, "drizzle"), {
	...readEnv({ AUTH_SECRET: "schema-only" }),
	oidc: { issuer: "https://example.com", clientId: "x", clientSecret: "x" },
});
