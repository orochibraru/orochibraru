// Content, GitHub and sync tables. better-auth's own tables are generated into
// auth-schema.ts by `bunx @better-auth/cli generate` and re-exported here.
import { sql } from "drizzle-orm";
import {
	integer,
	primaryKey,
	sqliteTable,
	text,
	unique,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
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

/** The repos of deleted projects: their URLs redirect to /projects instead of 404ing. */
export const deletedProject = sqliteTable("deleted_project", {
	repo: text("repo").primaryKey(),
	deletedAt: timestamp("deleted_at"),
});

/** A published post's old slugs: each redirects to the slug the post has now. */
export const renamedPost = sqliteTable("renamed_post", {
	slug: text("slug").primaryKey(),
	to: text("to").notNull(),
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

export const SYNC_REASONS = ["push", "release", "manual", "reconcile", "mcp"] as const;

/**
 * A sync for the background worker (`github/worker.ts`). At most one job per repo
 * waits at a time: a second request for it joins that one instead.
 */
export const syncJob = sqliteTable(
	"sync_job",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		repo: text("repo").notNull(),
		/** The pushed commit to pin the default branch to; null reads the branch head. */
		sha: text("sha"),
		reason: text("reason", { enum: SYNC_REASONS }).notNull(),
		status: text("status", {
			enum: ["queued", "running", "ok", "failed", "skipped"],
		}).notNull(),
		attempts: integer("attempts").notNull().default(0),
		changed: integer("changed").notNull().default(0),
		error: text("error"),
		queuedAt: timestamp("queued_at"),
		/** A job retried after GitHub failed waits until then. */
		runAfter: integer("run_after", { mode: "timestamp_ms" }),
		startedAt: integer("started_at", { mode: "timestamp_ms" }),
		finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
	},
	(table) => [
		uniqueIndex("sync_job_one_queued").on(table.repo).where(sql`${table.status} = 'queued'`),
	],
);

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

/** One row, id 1: the VAPID key pair push messages are signed with. */
export const pushKeys = sqliteTable("push_keys", {
	id: integer("id").primaryKey(),
	publicKey: text("public_key").notNull(),
	/** Sealed with AES-GCM: see crypto.ts. */
	privateKey: text("private_key").notNull(),
});

/** A browser an admin turned notifications on in. */
export const pushSubscription = sqliteTable("push_subscription", {
	endpoint: text("endpoint").primaryKey(),
	p256dh: text("p256dh").notNull(),
	auth: text("auth").notNull(),
	email: text("email").notNull(),
	/** What the browser said it was, so the admin can tell their devices apart. */
	device: text("device").notNull().default(""),
	createdAt: timestamp("created_at"),
	lastSentAt: integer("last_sent_at", { mode: "timestamp_ms" }),
});

/** A week's report, kept so its notification has something to open. One per week. */
export const weeklyReport = sqliteTable("weekly_report", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	/** The Monday the week starts on, YYYY-MM-DD, UTC. */
	weekStart: text("week_start").notNull().unique(),
	data: text("data", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
	createdAt: timestamp("created_at"),
	/** How many browsers its notification reached. */
	delivered: integer("delivered").notNull().default(0),
});
