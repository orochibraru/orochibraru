// Content, GitHub and sync tables. better-auth's own tables are generated into
// auth-schema.ts by `bunx @better-auth/cli generate` and re-exported here.
import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { CHANNELS } from "../../projects";

export * from "./auth-schema";

const now = sql`(unixepoch() * 1000)`;
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" }).notNull().default(now);

export type Button = { label: string; href: string; icon: string; primary?: boolean };
export type DocsConfigJson = { categories: unknown[] } & Record<string, unknown>;

export const project = sqliteTable("project", {
	/** The URL segment, and the repo name on GitHub. */
	repo: text("repo").primaryKey(),
	name: text("name").notNull(),
	tag: text("tag").notNull().default(""),
	title: text("title").notNull().default(""),
	description: text("description").notNull().default(""),
	image: text("image", { mode: "json" }).$type<{ src: string; alt: string } | null>(),
	buttons: text("buttons", { mode: "json" }).$type<Button[]>().notNull().default([]),
	schema: text("schema", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
	category: text("category").notNull().default(""),
	blurb: text("blurb").notNull().default(""),
	chips: text("chips", { mode: "json" }).$type<string[]>().notNull().default([]),
	position: integer("position").notNull().default(0),
	body: text("body").notNull().default(""),
	/** owner/name on GitHub; null for a project with no linked repo. */
	githubRepo: text("github_repo"),
	defaultBranch: text("default_branch"),
	published: integer("published", { mode: "boolean" }).notNull().default(false),
	updatedAt: timestamp("updated_at"),
});

export const post = sqliteTable("post", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	/** YYYY-MM-DD */
	date: text("date").notNull(),
	description: text("description").notNull().default(""),
	body: text("body").notNull().default(""),
	status: text("status", { enum: ["draft", "published"] })
		.notNull()
		.default("draft"),
	updatedAt: timestamp("updated_at"),
});

/** The slugs of deleted posts: their URLs redirect to the blog instead of 404ing. */
export const deletedPost = sqliteTable("deleted_post", {
	slug: text("slug").primaryKey(),
	deletedAt: timestamp("deleted_at"),
});

export type { Channel } from "../../projects";

/**
 * Which docs a row belongs to. With a GitHub release marked Latest, latest is that
 * tag and canary the default branch; without one, latest is the default branch.
 */
const channel = () => text("channel", { enum: CHANNELS }).notNull().default("latest");

/** One synced channel of a project's docs: where it was read from and its config.json. */
export const docsVersion = sqliteTable(
	"docs_version",
	{
		project: text("project")
			.notNull()
			.references(() => project.repo, { onDelete: "cascade", onUpdate: "cascade" }),
		channel: channel(),
		/** The tag or branch synced: v1.2.0, main. */
		ref: text("ref").notNull(),
		sha: text("sha").notNull(),
		config: text("config", { mode: "json" }).$type<DocsConfigJson | null>(),
	},
	(table) => [primaryKey({ columns: [table.project, table.channel] })],
);

export const guide = sqliteTable(
	"guide",
	{
		project: text("project")
			.notNull()
			.references(() => project.repo, { onDelete: "cascade", onUpdate: "cascade" }),
		channel: channel(),
		slug: text("slug").notNull(),
		/** Verbatim upstream: rewriting happens when it is rendered. */
		markdown: text("markdown").notNull(),
		sourcePath: text("source_path").notNull(),
		sha: text("sha").notNull(),
	},
	(table) => [primaryKey({ columns: [table.project, table.channel, table.slug] })],
);

/** A repo screenshot, addressed in Markdown by its name under docs/images: ![alt](hero). */
export const image = sqliteTable(
	"image",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		width: integer("width").notNull(),
		height: integer("height").notNull(),
		project: text("project")
			.notNull()
			.references(() => project.repo, { onDelete: "cascade", onUpdate: "cascade" }),
		name: text("name").notNull(),
		channel: channel(),
		/** The upstream blob sha, so a sync only re-fetches what changed. */
		sourceSha: text("source_sha").notNull(),
		/** raw.githubusercontent.com, pinned to the commit the sync read it from. */
		url: text("url").notNull(),
		createdAt: timestamp("created_at"),
	},
	(table) => [unique().on(table.project, table.channel, table.name)],
);

export const githubApp = sqliteTable("github_app", {
	id: integer("id").primaryKey(),
	appId: integer("app_id").notNull(),
	slug: text("slug").notNull(),
	clientId: text("client_id").notNull(),
	/** The three secrets are sealed with AES-GCM: see crypto.ts. */
	clientSecret: text("client_secret").notNull(),
	privateKey: text("private_key").notNull(),
	webhookSecret: text("webhook_secret").notNull(),
	installationId: integer("installation_id"),
	createdAt: timestamp("created_at"),
});

export const installedRepo = sqliteTable("installed_repo", {
	/** owner/name */
	fullName: text("full_name").primaryKey(),
	installationId: integer("installation_id").notNull(),
	defaultBranch: text("default_branch").notNull().default("main"),
	private: integer("private", { mode: "boolean" }).notNull().default(false),
});

export const syncRun = sqliteTable("sync_run", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	repo: text("repo").notNull(),
	/** Null on a run that failed before it got to a channel, and on runs from before channels. */
	channel: text("channel", { enum: CHANNELS }),
	sha: text("sha"),
	status: text("status", { enum: ["running", "ok", "failed", "skipped"] }).notNull(),
	error: text("error"),
	changed: integer("changed").notNull().default(0),
	startedAt: timestamp("started_at"),
	finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});

/** One file a sync run added, changed or removed. Images carry no diff. */
export const syncChange = sqliteTable("sync_change", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	runId: integer("run_id")
		.notNull()
		.references(() => syncRun.id, { onDelete: "cascade" }),
	path: text("path").notNull(),
	kind: text("kind", { enum: ["added", "changed", "removed"] }).notNull(),
	/** Unified diff hunks, `@@` headers included, without the file header. */
	diff: text("diff"),
});

export const webhookDelivery = sqliteTable("webhook_delivery", {
	id: text("id").primaryKey(),
	receivedAt: timestamp("received_at"),
});

/** One row, id 1: the /projects page's copy. Without it the page uses PROJECTS_PAGE's. */
export const projectsPage = sqliteTable("projects_page", {
	id: integer("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	tag: text("tag").notNull(),
	heading: text("heading").notNull(),
	accent: text("accent").notNull(),
	intro: text("intro").notNull(),
	others: text("others").notNull(),
});

/** One row, id 1: the Umami instance the admin overview reads visitor stats from. */
export const umami = sqliteTable("umami", {
	id: integer("id").primaryKey(),
	url: text("url").notNull(),
	websiteId: text("website_id").notNull(),
	/** Sealed with AES-GCM: see crypto.ts. */
	apiKey: text("api_key").notNull(),
});

/** One row, id 1: the Search Console property the admin overview reads search stats from. */
export const searchConsole = sqliteTable("search_console", {
	id: integer("id").primaryKey(),
	/** sc-domain:example.com, or a URL-prefix property's https://example.com/ */
	site: text("site").notNull(),
	/** The service account's JSON key, sealed with AES-GCM: see crypto.ts. */
	serviceAccount: text("service_account").notNull(),
});
