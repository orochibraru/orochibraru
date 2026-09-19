// Runtime configuration, read from the process environment rather than
// $env/dynamic so scripts and `bun test` see the same values as the server.

export type Env = {
	origin: string;
	authSecret: string;
	dataDir: string;
	/** Present only when all three OIDC variables are set: no SSO, no admin. */
	oidc?: { issuer: string; clientId: string; clientSecret: string };
	adminEmails: Set<string>;
};

export function readEnv(source: Record<string, string | undefined>): Env {
	const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = source;
	return {
		origin: (source.ORIGIN ?? "http://localhost:5173").replace(/\/$/, ""),
		authSecret: source.AUTH_SECRET ?? "",
		dataDir: source.DATA_DIR ?? "data",
		oidc:
			OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET
				? { issuer: OIDC_ISSUER, clientId: OIDC_CLIENT_ID, clientSecret: OIDC_CLIENT_SECRET }
				: undefined,
		adminEmails: new Set(
			(source.ADMIN_EMAILS ?? "")
				.split(",")
				.map((email) => email.trim().toLowerCase())
				.filter(Boolean),
		),
	};
}

export const env = readEnv(process.env);

export const isAdminEmail = (email: string | null | undefined, from: Env = env) =>
	!!email && from.adminEmails.has(email.toLowerCase());
