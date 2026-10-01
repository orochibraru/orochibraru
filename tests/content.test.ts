import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import {
	getProjectPage,
	getProjectsPage,
	invalidate,
	listProjectCards,
	PROJECTS_PAGE,
	projectMarkdown,
	wasPostDeleted,
} from "../src/lib/server/content";
import { guide, post, project } from "../src/lib/server/db/schema";
import {
	createPost,
	deletePost,
	setPostStatus,
	updateProjectsPage,
} from "../src/lib/server/editor";
import { loadGuides } from "../src/lib/server/guides";
import { recordScreenshot } from "../src/lib/server/images";
import { loadPosts } from "../src/lib/server/posts";
import { freshSite } from "./helpers";

const site = freshSite();
afterAll(() => site.cleanup());

const BODY = `A start page for your homelab.

![The dashboard](dashboard)
**The dashboard** Links and vitals.

![A graphic](graphics/feature)
**From a subfolder** Of docs/images.

## Alternatives {#alternatives}

### Homepage

YAML files instead of a UI.

See the [showcase](/demo/docs/showcase).`;

const raw = (sha: string, name: string) =>
	`https://raw.githubusercontent.com/me/demo/${sha.repeat(40)}/docs/images/${name}.png`;

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
	for (const [name, sha] of [
		["dashboard", "a"],
		["dashboard-dark", "b"],
		["graphics/feature", "c"],
	] as const) {
		recordScreenshot(
			{ width: 1200, height: 675 },
			{
				project: "demo",
				channel: "latest",
				name,
				sourceSha: sha.repeat(40),
				url: raw(sha, name),
			},
		);
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

	test("cards carry their screenshot and guide count", () => {
		const [demo, other] = listProjectCards();
		expect(demo?.shot?.light).toBe(raw("a", "dashboard"));
		expect(demo?.shot?.dark).toBe(raw("b", "dashboard-dark"));
		expect(demo?.shot?.alt).toBe("The dashboard");
		expect(other?.shot).toBeUndefined();
		expect(demo?.guides).toBe(0);
	});

	test("render tiles, screenshots hosted on GitHub, and the lede", async () => {
		const page = await getProjectPage("demo");
		expect(page?.lede).toBe("A start page for your homelab.");
		// a `-dark` twin: one <img> per theme, so the site's toggle picks, not just the OS
		expect(page?.html).toMatch(
			/<figure class="shot"><img class="on-light" src="https:\/\/raw\.githubusercontent\.com\/me\/demo\/a{40}\/docs\/images\/dashboard\.png" width="1200" height="675"[^>]*><img class="on-dark" /,
		);
		expect(page?.html).toContain(`<img src="${raw("c", "graphics/feature")}"`);
		expect(page?.html).toContain('<section id="alternatives" class="ruled">');
		expect(page?.html).toContain('<div class="tiles"><div class="feat">');
		expect(page?.image?.url).toBe(raw("b", "dashboard-dark"));
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
		expect(twin).toContain(`](${raw("a", "dashboard")})`);
		expect(twin).toContain(`](${raw("c", "graphics/feature")})`);
		expect(twin).toContain("](https://orochibraru.com/demo/docs/showcase)");
		expect(twin).not.toContain("{#alternatives}");
	});
});

describe("the /projects page", () => {
	test("reads the built-in copy until the admin saves its own", () => {
		expect(getProjectsPage()).toEqual(PROJECTS_PAGE);
		updateProjectsPage({ ...PROJECTS_PAGE, heading: "Stop renting", accent: "" });
		expect(getProjectsPage()).toMatchObject({ heading: "Stop renting", accent: "" });
		expect(() => updateProjectsPage({ ...PROJECTS_PAGE, title: " " })).toThrow();
	});
});

describe("guides", () => {
	test("a docs/images screenshot with a -dark twin follows the site's theme", async () => {
		site.db.update(project).set({ githubRepo: "me/demo" }).where(eq(project.repo, "demo")).run();
		site.db
			.insert(guide)
			.values({
				project: "demo",
				slug: "readme",
				sourcePath: "README.md",
				sha: "x",
				markdown:
					'# Demo\n\n<picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/dashboard-dark.png"><img alt="Dash" src="docs/images/dashboard.png"></picture>\n',
			})
			.run();
		invalidate();
		const [readme] = await loadGuides();
		expect(readme?.html).not.toContain("<source");
		expect(readme?.html).toMatch(/<img class="on-light" [^>]*><img class="on-dark" /);
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

	test("a deleted post leaves the list but its slug is remembered", async () => {
		const gone = setPostStatus(createPost({ title: "Gone soon" }).id, "published");
		expect((await loadPosts()).map((item) => item.slug)).toContain(gone.slug);
		deletePost(gone.id);
		expect((await loadPosts()).map((item) => item.slug)).not.toContain(gone.slug);
		expect(wasPostDeleted(gone.slug)).toBe(true);
		expect(wasPostDeleted("hello")).toBe(false);
		// deleting it twice, or a post that was never there, is harmless
		deletePost(gone.id);
	});
});
