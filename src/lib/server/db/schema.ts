// Content, GitHub and sync tables. better-auth's own tables are generated into
// auth-schema.ts by `bunx @better-auth/cli generate` and re-exported here.
import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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
	docsConfig: text("docs_config", { mode: "json" }).$type<DocsConfigJson | null>(),
	docsSyncedSha: text("docs_synced_sha"),
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

export const guide = sqliteTable(
	"guide",
	{
		project: text("project")
			.notNull()
			.references(() => project.repo, { onDelete: "cascade", onUpdate: "cascade" }),
		slug: text("slug").notNull(),
		/** Verbatim upstream: rewriting happens when it is rendered. */
		markdown: text("markdown").notNull(),
		sourcePath: text("source_path").notNull(),
		sha: text("sha").notNull(),
	},
	(table) => [primaryKey({ columns: [table.project, table.slug] })],
);

export const image = sqliteTable(
	"image",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		sha256: text("sha256").notNull(),
		width: integer("width").notNull(),
		height: integer("height").notNull(),
		alt: text("alt").notNull().default(""),
		source: text("source", { enum: ["upload", "sync"] }).notNull(),
		/** Repo screenshots are addressed by (project, name): ![alt](hero). */
		project: text("project").references(() => project.repo, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		name: text("name"),
		/** The upstream blob sha, so a sync only re-fetches what changed. */
		sourceSha: text("source_sha"),
		createdAt: timestamp("created_at"),
	},
	(table) => [unique().on(table.project, table.name)],
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
	sha: text("sha"),
	status: text("status", { enum: ["running", "ok", "failed", "skipped"] }).notNull(),
	error: text("error"),
	changed: integer("changed").notNull().default(0),
	startedAt: timestamp("started_at"),
	finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
});

export const webhookDelivery = sqliteTable("webhook_delivery", {
	id: text("id").primaryKey(),
	receivedAt: timestamp("received_at"),
});

/** One row, id 1: the Umami instance the admin overview reads visitor stats from. */
export const umami = sqliteTable("umami", {
	id: integer("id").primaryKey(),
	url: text("url").notNull(),
	websiteId: text("website_id").notNull(),
	/** Sealed with AES-GCM: see crypto.ts. */
	apiKey: text("api_key").notNull(),
});
