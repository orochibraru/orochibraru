import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { guide, image, project, syncRun } from "../src/lib/server/db/schema";
import { docsStatuses } from "../src/lib/server/editor";
import { env } from "../src/lib/server/env";
import {
	appJwt,
	exchangeManifestCode,
	getGithubApp,
	recordInstallation,
	useGithubFetch,
} from "../src/lib/server/github/app";
import { reconcile, selectDocs, syncRepo } from "../src/lib/server/github/sync";
import { handleWebhook, verifySignature } from "../src/lib/server/github/webhook";
import { freshSite, SAMPLE_IMAGE } from "./helpers";

env.authSecret = "test-secret-test-secret-test-secret";
const site = freshSite();
afterAll(() => site.cleanup());

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
const sha = (text: string) => new Bun.CryptoHasher("sha1").update(text).digest("hex");

// A GitHub with one repo whose files the tests edit.
let files: Record<string, string | Uint8Array> = {};
let head = "c1";
const calls: string[] = [];
const blobs = () =>
	Object.fromEntries(
		Object.values(files).map((body) => [
			typeof body === "string" ? sha(body) : sha(Buffer.from(body).toString("base64")),
			body,
		]),
	);

useGithubFetch(async (input, init) => {
	const path = input.replace("https://api.github.com", "");
	calls.push(`${init?.method ?? "GET"} ${path}`);
	if (path === "/app-manifests/the-code/conversions") {
		return Response.json({
			id: 42,
			slug: "site-docs",
			client_id: "Iv1",
			client_secret: "cs",
			pem,
			webhook_secret: "whsec",
		});
	}
	if (path === "/app/installations/7/access_tokens") {
		return Response.json({
			token: "ghs_x",
			expires_at: new Date(Date.now() + 3600_000).toISOString(),
		});
	}
	if (path.startsWith("/installation/repositories")) {
		return Response.json({
			repositories: [{ full_name: "me/tool", default_branch: "main", private: false }],
		});
	}
	if (path.startsWith("/repos/me/tool/commits/")) {
		return Response.json({ sha: head, commit: { tree: { sha: `tree-${head}` } } });
	}
	if (path.startsWith("/repos/me/tool/branches/")) {
		return Response.json({ commit: { sha: head } });
	}
	if (path.startsWith("/repos/me/tool/git/trees/")) {
		return Response.json({
			tree: Object.entries(files).map(([file, body]) => ({
				path: file,
				type: "blob",
				sha: typeof body === "string" ? sha(body) : sha(Buffer.from(body).toString("base64")),
			})),
		});
	}
	const blob = path.match(/^\/repos\/me\/tool\/git\/blobs\/(\w+)$/);
	if (blob?.[1]) {
		const body = blobs()[blob[1]];
		if (body === undefined) {
			return new Response("no blob", { status: 404 });
		}
		return Response.json({ encoding: "base64", content: Buffer.from(body).toString("base64") });
	}
	return new Response(`unexpected ${path}`, { status: 500 });
});

beforeAll(async () => {
	await exchangeManifestCode("the-code");
	await recordInstallation(7);
	site.db
		.insert(project)
		.values({
			repo: "tool",
			name: "Tool",
			githubRepo: "me/tool",
			defaultBranch: "main",
			published: true,
		})
		.run();
});

beforeEach(() => {
	calls.length = 0;
});

describe("the app", () => {
	test("keeps its secrets sealed in the database", async () => {
		const row = site.db.$client
			.query("SELECT private_key, webhook_secret FROM github_app")
			.get() as {
			private_key: string;
			webhook_secret: string;
		};
		expect(row.private_key).not.toContain("PRIVATE KEY");
		expect(row.webhook_secret).not.toBe("whsec");
		expect((await getGithubApp())?.webhookSecret).toBe("whsec");
	});

	test("signs app JWTs GitHub accepts the shape of", () => {
		const [header, payload] = appJwt({ appId: 42, privateKey: pem }, 1000).split(".");
		expect(JSON.parse(Buffer.from(header as string, "base64url").toString())).toEqual({
			alg: "RS256",
			typ: "JWT",
		});
		expect(JSON.parse(Buffer.from(payload as string, "base64url").toString())).toEqual({
			iat: 940,
			exp: 1540,
			iss: "42",
		});
	});
});

describe("sync", () => {
	test("selects what the docs are made of", () => {
		const picked = selectDocs(
			[
				"README.md",
				"docs/a.md",
				"docs/README.md",
				"docs/deep/b.md",
				"docs/images/x.png",
				"src/y.md",
			].map((path) => ({ path, type: "blob", sha: path })),
		);
		expect(picked.guides.map((entry) => entry.path)).toEqual(["README.md", "docs/a.md"]);
		expect(picked.images.map((entry) => entry.path)).toEqual(["docs/images/x.png"]);
	});

	test("brings in guides, config and screenshots, then only what changed", async () => {
		files = {
			"README.md": "# Tool\n\nIt does things.\n",
			"docs/setup.md": "# Setup\n\nRun it.\n",
			"docs/config.json": JSON.stringify({
				categories: [{ title: "Start", pages: [{ slug: "setup" }] }],
			}),
			"docs/images/hero.png": await Bun.file(SAMPLE_IMAGE).bytes(),
		};
		const first = await syncRepo("tool");
		expect(first).toEqual({ status: "ok", changed: 3 });
		expect(site.db.select().from(guide).where(eq(guide.project, "tool")).all()).toHaveLength(2);
		expect(site.db.select().from(image).where(eq(image.project, "tool")).get()?.name).toBe("hero");
		const row = site.db.select().from(project).where(eq(project.repo, "tool")).get();
		expect(row?.docsSyncedSha).toBe("c1");
		expect(row?.docsConfig).toMatchObject({ categories: [{ title: "Start" }] });
		expect(docsStatuses().tool).toBe("valid");

		head = "c2";
		calls.length = 0;
		files["docs/setup.md"] = "# Setup\n\nRun it twice.\n";
		const second = await syncRepo("tool");
		expect(second.changed).toBe(1);
		expect(calls.filter((call) => call.includes("/git/blobs/"))).toHaveLength(2); // the guide and config
	});

	test("deletions upstream are deletions here", async () => {
		head = "c3";
		delete files["docs/setup.md"];
		delete files["docs/images/hero.png"];
		const result = await syncRepo("tool");
		expect(result.status).toBe("ok");
		expect(
			site.db
				.select()
				.from(guide)
				.where(eq(guide.project, "tool"))
				.all()
				.map((row) => row.slug),
		).toEqual(["readme"]);
		expect(site.db.select().from(image).where(eq(image.project, "tool")).all()).toHaveLength(0);
		expect(docsStatuses().tool).toBe("valid");
	});

	test("an invalid config changes nothing and says why", async () => {
		head = "c4";
		files["docs/new.md"] = "# New\n\nHello.\n";
		files["docs/config.json"] = JSON.stringify({ categories: [] });
		const result = await syncRepo("tool");
		expect(result.status).toBe("failed");
		expect(result.error).toContain("docs/config.json is invalid");
		expect(site.db.select().from(guide).where(eq(guide.slug, "new")).get()).toBeUndefined();
		expect(
			site.db.select().from(project).where(eq(project.repo, "tool")).get()?.docsSyncedSha,
		).toBe("c3");
		const run = site.db.select().from(syncRun).all().at(-1);
		expect(run?.status).toBe("failed");
		expect(docsStatuses().tool).toBe("invalid");
		files["docs/config.json"] = "{ not json";
		expect((await syncRepo("tool")).error).toContain("docs/config.json is invalid");
		expect(docsStatuses().tool).toBe("invalid");
		files["docs/config.json"] = JSON.stringify({
			categories: [{ title: "Start", pages: [{ slug: "new" }] }],
		});
	});

	test("pushes that land mid-sync fold into one more run", async () => {
		head = "c5";
		const runsBefore = site.db.select().from(syncRun).all().length;
		await Promise.all([syncRepo("tool"), syncRepo("tool"), syncRepo("tool")]);
		expect(site.db.select().from(syncRun).all().length - runsBefore).toBe(2);
	});

	test("reconcile narrates what it checks and syncs", async () => {
		head = "c6";
		files["docs/new.md"] = "# New\n\nHello again.\n";
		const lines: string[] = [];
		await reconcile((line) => lines.push(line));
		expect(lines[0]).toBe("Checking 1 project with a linked repo.");
		expect(lines).toContain("tool: me/tool@main is at c6, last synced c5");
		expect(lines).toContain("  ↓ docs/new.md");
		expect(lines).toContain("  = README.md");
		expect(lines).toContain("tool: ✓ done, 1 change");

		lines.length = 0;
		await reconcile((line) => lines.push(line));
		expect(lines).toContain("tool: me/tool@main is at c6, last synced c6, up to date");
		expect(lines.at(-1)).toBe("Every project checked.");
	});
});

describe("webhook", () => {
	const deliver = (event: string, payload: unknown, id: string, secret = "whsec") => {
		const body = JSON.stringify(payload);
		return handleWebhook(
			new Request("https://site.test/api/github/webhook", {
				method: "POST",
				body,
				headers: {
					"x-github-event": event,
					"x-github-delivery": id,
					"x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
				},
			}),
		);
	};
	const push = (ref: string, paths: string[]) => ({
		ref,
		after: head,
		repository: { full_name: "me/tool" },
		commits: [{ modified: paths }],
	});

	test("checks signatures in constant time and refuses bad ones", async () => {
		expect(
			verifySignature(
				"s",
				"body",
				`sha256=${createHmac("sha256", "s").update("body").digest("hex")}`,
			),
		).toBe(true);
		expect(verifySignature("s", "body", "sha256=00")).toBe(false);
		expect(verifySignature("s", "body", null)).toBe(false);
		expect(
			(await deliver("push", push("refs/heads/main", ["docs/a.md"]), "d-bad", "wrong")).status,
		).toBe(401);
	});

	test("syncs on a docs push to the default branch, once per delivery", async () => {
		head = "c6";
		files["docs/another.md"] = "# Another\n\nMore.\n";
		expect(
			(await deliver("push", push("refs/heads/main", ["docs/another.md"]), "d-1")).status,
		).toBe(202);
		await Bun.sleep(300);
		expect(calls.some((call) => call.includes("/commits/c6"))).toBe(true);
		calls.length = 0;
		expect(
			(await deliver("push", push("refs/heads/main", ["docs/another.md"]), "d-1")).status,
		).toBe(200);
		expect(calls).toHaveLength(0);
	});

	test("ignores other branches and pushes that don't touch docs", async () => {
		await deliver("push", push("refs/heads/feature", ["docs/a.md"]), "d-2");
		await deliver("push", push("refs/heads/main", ["src/index.ts"]), "d-3");
		await Bun.sleep(200);
		expect(calls.filter((call) => call.includes("/commits/"))).toHaveLength(0);
	});
});
