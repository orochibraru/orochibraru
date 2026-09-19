import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
	getProjectPage,
	invalidate,
	listProjectCards,
	projectMarkdown,
} from "../src/lib/server/content";
import { post, project } from "../src/lib/server/db/schema";
import { storeImage } from "../src/lib/server/images";
import { loadPosts } from "../src/lib/server/posts";
import { freshSite, SAMPLE_IMAGE } from "./helpers";

const site = freshSite();
afterAll(() => site.cleanup());

const BODY = `A start page for your homelab.

![The dashboard](dashboard)
**The dashboard** Links and vitals.

## Alternatives {#alternatives}

### Homepage

YAML files instead of a UI.

See the [showcase](/demo/docs/showcase).`;

const row = (repo: string, position: number, body: string) => ({
	repo,
	name: repo,
	title: repo,
	description: repo,
	image: body === BODY ? { src: "dashboard", alt: "The dashboard" } : null,
	body,
	position,
	published: true,
});

beforeAll(async () => {
	site.db
		.insert(project)
		.values([row("demo", 0, BODY), row("other", 1, "Another one.")])
		.run();
	const bytes = await Bun.file(SAMPLE_IMAGE).bytes();
	for (const name of ["dashboard", "dashboard-dark"]) {
		await storeImage(bytes, { source: "sync", project: "demo", name });
	}
	site.db
		.insert(post)
		.values({ slug: "hello", title: "Hello", date: "2026-01-01", body: "x", status: "published" })
		.run();
	invalidate();
});

describe("project pages", () => {
	test("cards follow the admin's order", () => {
		expect(listProjectCards().map((card) => card.repo)).toEqual(["demo", "other"]);
	});

	test("render tiles, screenshots from the image store, and the lede", async () => {
		const page = await getProjectPage("demo");
		expect(page?.lede).toBe("A start page for your homelab.");
		expect(page?.html).toMatch(
			/<figure class="shot"><picture><source [^>]*srcset="\/images\/[0-9a-f]{64}\.webp"/,
		);
		expect(page?.html).toContain('<section id="alternatives" class="ruled">');
		expect(page?.html).toContain('<div class="tiles"><div class="feat">');
		expect(page?.image?.url).toMatch(/^https:\/\/orochibraru\.com\/images\/[0-9a-f]{64}\.webp$/);
	});

	test("an unpublished project is not there, and invalidate() makes that true at once", () => {
		expect(getProjectPage("other")).toBeDefined();
		site.db.update(project).set({ published: false }).where(eq(project.repo, "other")).run();
		invalidate();
		expect(getProjectPage("other")).toBeUndefined();
		expect(listProjectCards().map((card) => card.repo)).not.toContain("other");
	});

	test("the Markdown twin has absolute image URLs and no anchor syntax", () => {
		const twin = projectMarkdown({ repo: "demo", name: "Demo", body: BODY });
		expect(twin).toStartWith("# Demo\n");
		expect(twin).toMatch(/\]\(https:\/\/orochibraru\.com\/images\/[0-9a-f]{64}\.webp\)/);
		expect(twin).toContain("](https://orochibraru.com/demo/docs/showcase)");
		expect(twin).not.toContain("{#alternatives}");
	});
});

describe("posts", () => {
	test("drafts never reach the public list", async () => {
		site.db
			.insert(post)
			.values({ slug: "secret", title: "Secret", date: "2099-01-01", body: "x", status: "draft" })
			.run();
		invalidate();
		const slugs = (await loadPosts()).map((item) => item.slug);
		expect(slugs).toContain("hello");
		expect(slugs).not.toContain("secret");
	});
});
