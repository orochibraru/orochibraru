import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { project, user } from "../src/lib/server/db/schema";
import { createMcpServer } from "../src/lib/server/mcp";
import { isTokenOnAllowlist } from "../src/lib/server/mcp-auth";
import { freshSite, SAMPLE_IMAGE } from "./helpers";

const site = freshSite();
const client = new Client({ name: "test", version: "1" });

beforeAll(async () => {
	const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
	await createMcpServer().connect(serverSide);
	await client.connect(clientSide);
	site.db
		.insert(project)
		.values({ repo: "baba", name: "Baba", title: "Baba", published: true, body: "Lede." })
		.run();
});
afterAll(async () => {
	await client.close();
	site.cleanup();
});

type Content = { content: { type: string; text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown> = {}) => {
	const result = (await client.callTool({ name, arguments: args })) as Content;
	const text = result.content[0]?.text ?? "";
	return { isError: result.isError ?? false, text, json: () => JSON.parse(text) };
};

describe("posts over MCP", () => {
	test("offers the tools, and nothing that deletes", async () => {
		const names = (await client.listTools()).tools.map((tool) => tool.name);
		expect(names).toContain("create_post");
		expect(names.some((name) => name.startsWith("delete"))).toBe(false);
	});

	test("a created post is a draft, whatever it asks for", async () => {
		const created = (
			await call("create_post", {
				title: "Hello from Claude",
				description: "Written over MCP.",
				body: "Some **Markdown**.",
			})
		).json();
		expect(created).toMatchObject({ slug: "hello-from-claude", status: "draft" });
		expect(created.url).toBeUndefined();
	});

	test("update, publish, read back", async () => {
		await call("update_post", { slug: "hello-from-claude", body: "Edited." });
		const published = (await call("publish_post", { slug: "hello-from-claude" })).json();
		expect(published.status).toBe("published");
		expect(published.url).toBe("https://orochibraru.com/blog/hello-from-claude");
		const read = (await call("get_post", { slug: "hello-from-claude" })).json();
		expect(read.body).toBe("Edited.");
		expect(read.description).toBe("Written over MCP.");
		await call("update_post", { slug: "hello-from-claude", description: "Retold." });
		const retold = (await call("get_post", { slug: "hello-from-claude" })).json();
		expect(retold).toMatchObject({ description: "Retold.", body: "Edited." });
		const listed = (await call("list_posts", { status: "published" })).json();
		expect(listed.map((post: { slug: string }) => post.slug)).toContain("hello-from-claude");
	});

	test("mistakes come back as tool errors the model can act on", async () => {
		const missing = await call("get_post", { slug: "nope" });
		expect(missing.isError).toBe(true);
		expect(missing.text).toContain("list_posts");
		const badDate = await call("update_post", { slug: "hello-from-claude", date: "yesterday" });
		expect(badDate.isError).toBe(true);
	});
});

describe("images and projects over MCP", () => {
	test("upload_image returns ready-to-paste Markdown", async () => {
		const base64 = Buffer.from(await Bun.file(SAMPLE_IMAGE).bytes()).toString("base64");
		const stored = (await call("upload_image", { alt: "A dashboard", base64 })).json();
		expect(stored.markdown).toMatch(/^!\[A dashboard\]\(\/images\/[0-9a-f]{64}\.webp\)$/);
	});

	test("upload_image refuses plain http and non-images", async () => {
		expect((await call("upload_image", { alt: "x", url: "http://169.254.169.254/" })).isError).toBe(
			true,
		);
		const junk = Buffer.from("not an image").toString("base64");
		expect((await call("upload_image", { alt: "x", base64: junk })).isError).toBe(true);
	});

	test("update_project validates like the admin form", async () => {
		const ok = await call("update_project", { repo: "baba", blurb: "The lookout." });
		expect(ok.isError).toBe(false);
		const bad = await call("update_project", {
			repo: "baba",
			buttons: [{ label: "x", href: "/", icon: "not-an-icon" }],
		});
		expect(bad.isError).toBe(true);
		expect((await call("get_project", { repo: "baba" })).json().blurb).toBe("The lookout.");
	});
});

describe("the allowlist", () => {
	test("is checked against the token's user on every call", async () => {
		const now = new Date();
		site.db
			.insert(user)
			.values([
				{
					id: "u-in",
					email: "me@site.test",
					name: "Me",
					emailVerified: true,
					createdAt: now,
					updatedAt: now,
				},
				{
					id: "u-out",
					email: "gone@site.test",
					name: "Gone",
					emailVerified: true,
					createdAt: now,
					updatedAt: now,
				},
			])
			.run();
		process.env.ADMIN_EMAILS = "me@site.test";
		const { env } = await import("../src/lib/server/env");
		env.adminEmails = new Set(["me@site.test"]);
		expect(await isTokenOnAllowlist({ sub: "u-in" })).toBe(true);
		expect(await isTokenOnAllowlist({ sub: "u-out" })).toBe(false);
		expect(await isTokenOnAllowlist({})).toBe(false);
	});
});
