import { afterAll, describe, expect, test } from "bun:test";
import { requireAdmin } from "../src/lib/server/admin";
import { createAuth } from "../src/lib/server/auth";
import { readEnv } from "../src/lib/server/env";
import { freshSite } from "./helpers";

const site = freshSite();
afterAll(() => site.cleanup());

const config = {
	...readEnv({
		ORIGIN: "https://site.test",
		AUTH_SECRET: "x".repeat(32),
		ADMIN_EMAILS: "me@site.test",
	}),
	oidc: { issuer: "https://idp.test", clientId: "id", clientSecret: "secret" },
};

const event = (path = "/admin/posts") => ({
	request: new Request(`https://site.test${path}`),
	url: new URL(`https://site.test${path}`),
});

const fakeAuth = (email: string | null) => ({
	api: {
		getSession: async () => (email ? { user: { email, name: "Me" } } : null),
	},
});

describe("requireAdmin", () => {
	test("404 when SSO isn't configured", async () => {
		await expect(requireAdmin(event(), { auth: null })).rejects.toMatchObject({ status: 404 });
	});

	test("no session goes to the login page, remembering where it was", async () => {
		const thrown = await requireAdmin(event("/admin/posts?x=1"), {
			auth: fakeAuth(null) as never,
		}).catch((e) => e);
		expect(thrown).toMatchObject({ status: 303 });
		expect(thrown.location).toBe(`/admin/login?next=${encodeURIComponent("/admin/posts?x=1")}`);
	});

	test("a session outside the allowlist is refused", async () => {
		await expect(
			requireAdmin(event(), {
				auth: fakeAuth("someone@else.test") as never,
				adminEmails: config.adminEmails,
			}),
		).rejects.toMatchObject({ status: 403 });
	});

	test("an allowlisted session passes, whatever the case of the address", async () => {
		const admin = await requireAdmin(event(), {
			auth: fakeAuth("Me@Site.test") as never,
			adminEmails: config.adminEmails,
		});
		expect(admin.email).toBe("Me@Site.test");
	});
});

describe("OAuth discovery for MCP clients", () => {
	const auth = createAuth(site.db, config);
	const get = (path: string) => auth.handler(new Request(`https://site.test${path}`));

	test("protected resource metadata names /mcp and this server", async () => {
		const response = await get("/.well-known/oauth-protected-resource/mcp");
		expect(response.status).toBe(200);
		const body = (await response.json()) as { resource: string; authorization_servers: string[] };
		expect(body.resource).toBe("https://site.test/mcp");
		expect(body.authorization_servers).toHaveLength(1);
	});

	test("authorization server metadata offers registration and PKCE", async () => {
		const issuer = new URL(
			(
				(await (await get("/.well-known/oauth-protected-resource/mcp")).json()) as {
					authorization_servers: string[];
				}
			).authorization_servers[0] as string,
		);
		const response = await get(
			`/.well-known/oauth-authorization-server${issuer.pathname.replace(/\/$/, "")}`,
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			registration_endpoint?: string;
			code_challenge_methods_supported: string[];
		};
		expect(body.registration_endpoint).toBeString();
		expect(body.code_challenge_methods_supported).toContain("S256");
	});

	test("users outside the allowlist are never created", async () => {
		const context = await auth.$context;
		const created = await context.internalAdapter
			.createUser(
				{ email: "intruder@else.test", name: "x", emailVerified: true },
				{ method: "oauth", oauth: { providerId: "sso" } },
			)
			.catch(() => null);
		expect(created).toBeFalsy();
	});
});
