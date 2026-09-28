// better-auth: SSO for the admin area, and the OAuth 2.1 provider Claude uses
// to reach /mcp. Admin rights are ADMIN_EMAILS, never a column.
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import * as Sentry from "@sentry/bun";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, jwt } from "better-auth/plugins";
import { type DB, getDb } from "./db";
import * as schema from "./db/schema";
import { type Env, env, isAdminEmail } from "./env";

export const PROVIDER = "sso";
export const SCOPES = ["openid", "profile", "email", "offline_access", "content"];

export function createAuth(db: DB, config: Env & { oidc: NonNullable<Env["oidc"]> }) {
	return betterAuth({
		baseURL: config.origin,
		secret: config.authSecret,
		trustedOrigins: [config.origin],
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		emailAndPassword: { enabled: false },
		// failed sign-ins and authorizations land on our login page, not better-auth's stock one
		onAPIError: { errorURL: `${config.origin}/admin/login` },
		// better-auth logs failures like a token exchange the IdP rejected instead of
		// throwing them: forward those to Sentry, or they only ever reach stdout
		logger: {
			log: (level, message, ...args) => {
				console[level](`[Better Auth] ${message}`, ...args);
				if (level === "error") {
					// the token exchange logs the IdP's error body, an object, under an empty message
					const body = args[0] as { error_description?: string } | undefined;
					Sentry.captureException(
						args.find((arg) => arg instanceof Error) ??
							new Error(message || body?.error_description || "better-auth error"),
						{ extra: { args } },
					);
				}
			},
		},
		// the OAuth provider owns /oauth2/token; better-auth's own /token would shadow it
		disabledPaths: ["/token"],
		databaseHooks: {
			user: {
				create: {
					// nobody outside the allowlist gets so much as a user row
					before: async (user) => (isAdminEmail(user.email, config) ? { data: user } : false),
				},
			},
		},
		plugins: [
			genericOAuth({
				config: [
					{
						providerId: PROVIDER,
						discoveryUrl: `${config.oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
						clientId: config.oidc.clientId,
						clientSecret: config.oidc.clientSecret,
						scopes: ["openid", "profile", "email"],
						pkce: true,
						// the IdP's client is registered for client_secret_basic, the OAuth
						// default; better-auth would otherwise send client_secret_post
						authentication: "basic",
						// identity comes from verified ID-token claims, never an unchecked decode
						requireIdTokenVerification: true,
					},
				],
			}),
			jwt(),
			mcp({
				loginPage: "/admin/login",
				consentPage: "/admin/consent",
				resource: `${config.origin}/mcp`,
				scopes: SCOPES,
				// claude.ai registers itself; CIMD covers clients that support it
				allowDynamicClientRegistration: true,
				allowUnauthenticatedClientRegistration: true,
			}),
			cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Promise<Auth> | undefined;

/**
 * null when SSO isn't configured: then nothing behind a login exists. The
 * instance is built only once the IdP's discovery document answers: better-auth
 * skips a provider whose discovery fails and never retries, so building it while
 * the IdP is down would leave sign-in broken until a restart. A failure here is
 * not cached; the next request tries again.
 */
export function getAuth(): Promise<Auth> | null {
	const oidc = env.oidc;
	if (!oidc) {
		return null;
	}
	instance ??= (async () => {
		const discovery = `${oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
		const response = await fetch(discovery, { signal: AbortSignal.timeout(5000) }).catch(
			(cause) => {
				throw new Error(`SSO provider unreachable at ${discovery}`, { cause });
			},
		);
		if (!response.ok) {
			throw new Error(`SSO provider answered ${response.status} at ${discovery}`);
		}
		return createAuth(getDb(), { ...env, oidc });
	})().catch((cause) => {
		instance = undefined;
		throw cause;
	});
	return instance;
}
