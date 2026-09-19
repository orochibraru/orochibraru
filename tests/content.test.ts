import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { importContent } from "../scripts/import";
import {
	getProjectPage,
	invalidate,
	listProjectCards,
	projectMarkdown,
} from "../src/lib/server/content";
import type { DB } from "../src/lib/server/db";
import { post, project } from "../src/lib/server/db/schema";
import { loadDocProjects, loadGuides } from "../src/lib/server/guides";
import { loadPosts } from "../src/lib/server/posts";

let dir: string;
let db: DB;
beforeAll(async () => {
	dir = mkdtempSync(`${tmpdir()}/site-content-`);
	db = await importContent(dir);
});
afterAll(() => {
	db.$client.close();
	rmSync(dir, { recursive: true, force: true });
});

describe("import", () => {
	test("brings in every project, guide and post", async () => {
		expect(listProjectCards().map((card) => card.repo)).toEqual([
			"penombre",
			"homerun",
			"baba",
			"nuvio-web",
			"bercail",
			"svelte-smol",
			"releaser",
			"dokploy-to-pangolin",
		]);
		expect((await loadGuides()).length).toBe(112);
		expect((await loadDocProjects()).map((project) => project.key)).not.toContain("baba");
		expect((await loadPosts()).length).toBeGreaterThan(0);
	});

	test("refuses a database that already has content", async () => {
		await expect(importContent(dir)).rejects.toThrow(/already has content/);
	});
});

describe("project pages", () => {
	test("render tiles, screenshots from the image store, and the lede", async () => {
		const page = await getProjectPage("bercail");
		expect(page?.lede).toContain("A start page for your homelab");
		expect(page?.html).toContain('<div class="tiles"><div class="feat">');
		expect(page?.html).toMatch(
			/<figure class="shot"><picture><source [^>]*srcset="\/images\/[0-9a-f]{64}\.webp"/,
		);
		expect(page?.html).toContain('<section id="alternatives" class="ruled">');
		expect(page?.image?.url).toMatch(/^https:\/\/orochibraru\.com\/images\/[0-9a-f]{64}\.webp$/);
	});

	test("an unpublished project is not there, and invalidate() makes that true at once", async () => {
		expect(getProjectPage("baba")).toBeDefined();
		db.update(project).set({ published: false }).where(eq(project.repo, "baba")).run();
		invalidate();
		expect(getProjectPage("baba")).toBeUndefined();
		expect(listProjectCards().map((card) => card.repo)).not.toContain("baba");
		db.update(project).set({ published: true }).where(eq(project.repo, "baba")).run();
		invalidate();
	});

	test("the Markdown twin has absolute image URLs and no anchor syntax", () => {
		const row = db.select().from(project).where(eq(project.repo, "penombre")).get();
		const twin = projectMarkdown(row as NonNullable<typeof row>);
		expect(twin).toStartWith("# Penombre\n");
		expect(twin).toMatch(/\]\(https:\/\/orochibraru\.com\/images\/[0-9a-f]{64}\.webp\)/);
		expect(twin).toContain("](https://orochibraru.com/penombre/docs/showcase)");
		expect(twin).not.toContain("{#alternatives}");
	});
});

describe("posts", () => {
	test("drafts never reach the public list", async () => {
		db.insert(post)
			.values({ slug: "secret", title: "Secret", date: "2099-01-01", body: "x", status: "draft" })
			.run();
		invalidate();
		expect((await loadPosts()).map((item) => item.slug)).not.toContain("secret");
	});
});
