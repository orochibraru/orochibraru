import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { installedRepo, project, user } from "../src/lib/server/db/schema";
import { createMcpServer } from "../src/lib/server/mcp";
import { isTokenOnAllowlist } from "../src/lib/server/mcp-auth";
import { freshSite } from "./helpers";

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

describe("projects over MCP", () => {
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

	test("get_project lists the screenshot names a body can use", async () => {
		expect((await call("get_project", { repo: "baba" })).json().screenshots).toEqual({});
	});

	test("a repo the GitHub App can read becomes an unpublished project", async () => {
		site.db.insert(installedRepo).values({ fullName: "me/tool", installationId: 7 }).run();
		expect((await call("list_addable_repos")).json()).toEqual([
			{ fullName: "me/tool", private: false },
		]);
		expect((await call("create_project", { github_repo: "me/nope" })).isError).toBe(true);
		// no GitHub App in tests: the project is made, its first sync skipped
		const created = (await call("create_project", { github_repo: "me/tool" })).json();
		expect(created).toMatchObject({ repo: "tool", published: false, sync: { status: "skipped" } });
		expect((await call("list_addable_repos")).json()).toEqual([]);
	});

	test("reorder_projects takes every project, once", async () => {
		const partial = await call("reorder_projects", { repos: ["tool"] });
		expect(partial.isError).toBe(true);
		expect(partial.text).toContain("baba, tool");
		expect((await call("reorder_projects", { repos: ["tool", "baba"] })).json()).toEqual([
			"tool",
			"baba",
		]);
	});

	test("the /projects copy changes field by field", async () => {
		expect((await call("get_projects_page")).json().others).toBe("Also in the box");
		const updated = (await call("update_projects_page", { heading: "Stop renting" })).json();
		expect(updated).toMatchObject({ heading: "Stop renting", others: "Also in the box" });
		expect((await call("update_projects_page", { title: " " })).isError).toBe(true);
	});
});

describe("docs and analytics over MCP", () => {
	test("get_docs_status covers each project with a repo", async () => {
		expect((await call("get_docs_status")).json()).toEqual([
			{
				repo: "tool",
				githubRepo: "me/tool",
				docs: "not synced",
				guides: 0,
				channels: [],
				lastSync: null,
			},
		]);
	});

	test("sync_project says why it did nothing", async () => {
		const result = (await call("sync_project", { repo: "baba" })).json();
		expect(result.status).toBe("skipped");
		expect(result.log).toEqual(["baba: skipped, no linked repo"]);
	});

	test("get_analytics says where to connect a source", async () => {
		const result = await call("get_analytics", { days: 7 });
		expect(result.isError).toBe(true);
		expect(result.text).toContain("/admin/settings");
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
