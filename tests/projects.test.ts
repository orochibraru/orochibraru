import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { wasProjectDeleted } from "../src/lib/server/content";
import {
	docsVersion,
	guide,
	image,
	installedRepo,
	project,
	syncChange,
	syncJob,
	syncRun,
} from "../src/lib/server/db/schema";
import {
	createProject,
	deleteProject,
	EditorError,
	getProject,
	lastSyncs,
	linkProjectRepo,
} from "../src/lib/server/editor";
import { freshSite } from "./helpers";

const site = freshSite();
afterAll(() => site.cleanup());

describe("deleting a project", () => {
	test("takes everything it owns, and leaves a redirect", () => {
		const db = site.db;
		db.insert(installedRepo)
			.values({ fullName: "me/tool", installationId: 7, defaultBranch: "main" })
			.run();
		createProject("me/tool");
		db.insert(guide)
			.values({
				project: "tool",
				slug: "readme",
				sourcePath: "README.md",
				sha: "x",
				markdown: "# Tool",
			})
			.run();
		db.insert(image)
			.values({
				project: "tool",
				name: "hero",
				width: 1,
				height: 1,
				sourceSha: "s",
				url: "https://x",
			})
			.run();
		db.insert(docsVersion)
			.values({ project: "tool", channel: "latest", ref: "main", sha: "c1" })
			.run();
		const run = db.insert(syncRun).values({ repo: "tool", status: "ok" }).returning().get();
		db.insert(syncChange).values({ runId: run.id, path: "README.md", kind: "added" }).run();
		db.insert(syncJob).values({ repo: "tool", reason: "push", status: "queued" }).run();
		// another project's history stays
		db.insert(syncRun).values({ repo: "other", status: "ok" }).run();

		deleteProject("tool");

		expect(db.select().from(project).all()).toHaveLength(0);
		for (const table of [guide, image, docsVersion]) {
			expect(db.select().from(table).all()).toHaveLength(0);
		}
		expect(
			db
				.select()
				.from(syncRun)
				.all()
				.map((row) => row.repo),
		).toEqual(["other"]);
		expect(db.select().from(syncChange).all()).toHaveLength(0);
		expect(db.select().from(syncJob).where(eq(syncJob.repo, "tool")).all()).toHaveLength(0);
		expect(wasProjectDeleted("tool")).toBe(true);
		expect(() => deleteProject("tool")).toThrow(EditorError);
	});

	test("adding the repo back makes its address a page again", () => {
		createProject("me/tool");
		expect(wasProjectDeleted("tool")).toBe(false);
	});
});

describe("linking a project to a repo", () => {
	test("follows a moved repo, refuses one the app can't read or another project has, and unlinks", () => {
		const db = site.db;
		db.insert(installedRepo)
			.values([
				{ fullName: "new-owner/tool", installationId: 8, defaultBranch: "trunk" },
				{ fullName: "me/other", installationId: 7, defaultBranch: "main" },
			])
			.run();
		createProject("me/other");
		db.delete(installedRepo).where(eq(installedRepo.fullName, "me/tool")).run();
		expect(lastSyncs().find((row) => row.repo === "tool")?.readable).toBe(false);

		linkProjectRepo("tool", "new-owner/tool");
		expect(getProject("tool")).toMatchObject({
			githubRepo: "new-owner/tool",
			defaultBranch: "trunk",
		});
		expect(lastSyncs().find((row) => row.repo === "tool")?.readable).toBe(true);

		expect(() => linkProjectRepo("tool", "gone/tool")).toThrow(
			"isn't a repo the GitHub App can read",
		);
		expect(() => linkProjectRepo("tool", "me/other")).toThrow("already linked to /other");

		linkProjectRepo("tool", null);
		expect(getProject("tool")).toMatchObject({ githubRepo: null, defaultBranch: null });
	});
});
