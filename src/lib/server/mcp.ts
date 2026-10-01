// The MCP server Claude talks to: posts, project pages, docs syncs and analytics, through the
// same editor functions the admin UI uses. Stateless: every request builds a
// fresh server and transport, so nothing lingers between calls.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { SITE } from "$lib/seo";
import { getProjectsPage, guideCounts } from "./content";
import {
	createPost,
	createProject,
	docsStatuses,
	docsVersions,
	EditorError,
	getPostBySlug,
	getProject,
	lastSyncs,
	listAddableRepos,
	listAllPosts,
	listAllProjects,
	type PostRow,
	ProjectPatch,
	ProjectsPageInput,
	projectImages,
	reorderProjects,
	setPostStatus,
	updatePost,
	updateProject,
	updateProjectsPage,
} from "./editor";
import { syncRepo } from "./github/sync";
import { getSearchConsole, searchStats } from "./search-console";
import { getUmami, umamiReport } from "./umami";

type Result = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (value: unknown): Result => ({
	content: [
		{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
	],
});

/** Validation and not-found problems go back to the model as tool errors it can fix; anything else is a bug. */
const run = async (work: () => unknown): Promise<Result> => {
	try {
		return ok(await work());
	} catch (cause) {
		if (cause instanceof EditorError) {
			return { content: [{ type: "text", text: cause.message }], isError: true };
		}
		throw cause;
	}
};

const postOr = (slug: string): PostRow => {
	const found = getPostBySlug(slug);
	if (!found) {
		throw new EditorError(`no post with the slug ${slug}; list_posts shows them all`);
	}
	return found;
};

const summary = (row: PostRow) => ({
	slug: row.slug,
	title: row.title,
	date: row.date,
	status: row.status,
	url: row.status === "published" ? `${SITE}/blog/${row.slug}` : undefined,
});

export function createMcpServer(): McpServer {
	const server = new McpServer({ name: "orochibraru.com", version: "1.0.0" });

	server.registerTool(
		"list_posts",
		{
			title: "List posts",
			description:
				"Every blog post, newest first, with its slug and whether it is a draft or published.",
			inputSchema: { status: z.enum(["draft", "published"]).optional() },
			annotations: { readOnlyHint: true },
		},
		({ status }) => run(() => listAllPosts(status).map(summary)),
	);

	server.registerTool(
		"get_post",
		{
			title: "Get a post",
			description: "One post, with its Markdown body.",
			inputSchema: { slug: z.string() },
			annotations: { readOnlyHint: true },
		},
		({ slug }) =>
			run(() => {
				const row = postOr(slug);
				return { ...summary(row), description: row.description, body: row.body };
			}),
	);

	server.registerTool(
		"create_post",
		{
			title: "Create a draft post",
			description:
				"Create a blog post as a draft. The body is Markdown. It stays a draft until publish_post; " +
				"the slug is derived from the title unless given, and the date defaults to today.",
			inputSchema: {
				title: z.string(),
				description: z
					.string()
					.describe("One or two sentences: the meta description and feed summary"),
				body: z.string().describe("Markdown"),
				slug: z.string().optional(),
				date: z.string().optional().describe("YYYY-MM-DD"),
			},
		},
		(input) => run(() => summary(createPost(input))),
	);

	server.registerTool(
		"update_post",
		{
			title: "Update a post",
			description: "Change any of a post's fields. Publishing is publish_post, not this.",
			inputSchema: {
				slug: z.string().describe("The post to change"),
				title: z.string().optional(),
				new_slug: z.string().optional(),
				date: z.string().optional(),
				description: z.string().optional(),
				body: z.string().optional().describe("Markdown, replacing the whole body"),
			},
		},
		({ slug, new_slug, ...patch }) =>
			run(() =>
				summary(updatePost(postOr(slug).id, { ...patch, ...(new_slug && { slug: new_slug }) })),
			),
	);

	server.registerTool(
		"publish_post",
		{
			title: "Publish a post",
			description: "Make a draft public on the blog, the feed and the sitemap.",
			inputSchema: { slug: z.string() },
		},
		({ slug }) => run(() => summary(setPostStatus(postOr(slug).id, "published"))),
	);

	server.registerTool(
		"unpublish_post",
		{
			title: "Unpublish a post",
			description: "Take a post off the site, back to a draft.",
			inputSchema: { slug: z.string() },
		},
		({ slug }) => run(() => summary(setPostStatus(postOr(slug).id, "draft"))),
	);

	server.registerTool(
		"list_projects",
		{
			title: "List projects",
			description: "Every project page, in home page order.",
			annotations: { readOnlyHint: true },
		},
		() =>
			run(() =>
				listAllProjects().map(({ repo, name, category, published, githubRepo }) => ({
					repo,
					name,
					category,
					published,
					githubRepo,
				})),
			),
	);

	server.registerTool(
		"get_project",
		{
			title: "Get a project page",
			description:
				"Every field of a project page. The body is Markdown with this site's conventions: the first " +
				"paragraph is the lede; a ### heading followed by one paragraph is a feature tile; " +
				"![alt](name) followed by a **Title** caption line is a synced repo screenshot; " +
				"`## Heading {#id}` pins an anchor; a ### directly above a code block labels it. " +
				"`screenshots` maps the names synced from the repo's docs/images to their URLs.",
			inputSchema: { repo: z.string() },
			annotations: { readOnlyHint: true },
		},
		({ repo }) =>
			run(() => {
				const row = getProject(repo);
				if (!row) {
					throw new EditorError(`no project ${repo}; list_projects shows them all`);
				}
				return { ...row, screenshots: projectImages(repo) };
			}),
	);

	server.registerTool(
		"update_project",
		{
			title: "Update a project page",
			description:
				"Change a project page's fields. Only the fields given change. Keep the body's conventions " +
				"(see get_project) and the site's voice: first person, dry, short sentences.",
			inputSchema: { repo: z.string(), ...ProjectPatch.shape },
		},
		({ repo, ...patch }) =>
			run(() => {
				const row = updateProject(repo, patch);
				return { repo: row.repo, updated: Object.keys(patch), url: `${SITE}/${row.repo}` };
			}),
	);

	server.registerTool(
		"list_addable_repos",
		{
			title: "List repos that could become projects",
			description:
				"Repos the site's GitHub App can read that have no project page yet: what create_project takes.",
			annotations: { readOnlyHint: true },
		},
		() =>
			run(() =>
				listAddableRepos().map(({ fullName, private: hidden }) => ({ fullName, private: hidden })),
			),
	);

	server.registerTool(
		"create_project",
		{
			title: "Create a project page",
			description:
				"Create an unpublished project page for a repo from list_addable_repos, and sync its docs. " +
				"Fill it in with update_project, then publish it with update_project's `published`.",
			inputSchema: { github_repo: z.string().describe("owner/name") },
		},
		({ github_repo }) =>
			run(async () => {
				const row = createProject(github_repo);
				const sync = await syncRepo(row.repo);
				return { repo: row.repo, published: false, sync };
			}),
	);

	server.registerTool(
		"reorder_projects",
		{
			title: "Reorder projects",
			description:
				"Set the order of the projects on the home page and /projects. List every repo (see " +
				"list_projects), first shown first. On /projects, projects with a social image come first.",
			inputSchema: { repos: z.array(z.string()) },
		},
		({ repos }) =>
			run(() => {
				reorderProjects(repos);
				return listAllProjects().map((row) => row.repo);
			}),
	);

	server.registerTool(
		"get_projects_page",
		{
			title: "Get the /projects page copy",
			description:
				"The words around the project list on /projects: `title` and `description` for search " +
				"engines, `tag` after the project count, `heading` and its highlighted second line " +
				"`accent`, `intro`, and `others`, the heading over the projects without a social image.",
			annotations: { readOnlyHint: true },
		},
		() => run(() => ({ ...getProjectsPage(), url: `${SITE}/projects` })),
	);

	server.registerTool(
		"update_projects_page",
		{
			title: "Update the /projects page copy",
			description:
				"Change the /projects copy (see get_projects_page). Only the fields given change.",
			inputSchema: ProjectsPageInput.partial().shape,
		},
		(patch) =>
			run(() => {
				updateProjectsPage(Object.assign({}, getProjectsPage(), patch));
				return { ...getProjectsPage(), url: `${SITE}/projects` };
			}),
	);

	server.registerTool(
		"get_docs_status",
		{
			title: "Get the docs sync status",
			description:
				"Each project with a linked repo: what its docs/ looks like (config.json valid or not), " +
				"its guide count, the ref and commit each channel was synced from, and its last sync run, " +
				"with the error if it failed.",
			annotations: { readOnlyHint: true },
		},
		() =>
			run(() => {
				const statuses = docsStatuses();
				const guides = guideCounts();
				const versions = docsVersions();
				const syncs = new Map(lastSyncs().map((row) => [row.repo, row.run]));
				return listAllProjects()
					.filter((row) => row.githubRepo)
					.map((row) => {
						const last = syncs.get(row.repo);
						return {
							repo: row.repo,
							githubRepo: row.githubRepo,
							docs: statuses[row.repo],
							guides: guides.get(row.repo) ?? 0,
							channels: versions
								.filter((version) => version.project === row.repo)
								.map(({ channel, ref, sha }) => ({ channel, ref, sha })),
							lastSync: last && {
								status: last.status,
								changed: last.changed,
								error: last.error,
								at: last.startedAt.toISOString(),
							},
						};
					});
			}),
	);

	server.registerTool(
		"sync_project",
		{
			title: "Sync a project's docs",
			description:
				"Pull a project's guides, screenshots and docs/config.json from GitHub now, rather than " +
				"waiting for the next push. Returns what it did, line by line.",
			inputSchema: { repo: z.string() },
		},
		({ repo }) =>
			run(async () => {
				const log: string[] = [];
				const result = await syncRepo(repo, undefined, (line) => log.push(line));
				return { ...result, log };
			}),
	);

	server.registerTool(
		"get_analytics",
		{
			title: "Get the site's analytics",
			description:
				"Visitors from Umami (totals, the same over the period before, a series, top pages, " +
				"referrers, countries, devices) and Google Search Console (clicks, impressions, CTR, " +
				"position, top queries and pages) over the last `days` days. Either can be missing if " +
				"it isn't connected, or carry an error if it couldn't be reached.",
			inputSchema: { days: z.number().int().min(1).max(365).optional().describe("Defaults to 28") },
			annotations: { readOnlyHint: true },
		},
		({ days = 28 }) =>
			run(async () => {
				const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
				if (!umami && !search) {
					throw new EditorError(
						"neither Umami nor Search Console is connected: they're set up in /admin/settings",
					);
				}
				const failed = (cause: unknown) => ({
					error: cause instanceof Error ? cause.message : String(cause),
				});
				const [visitors, searches] = await Promise.all([
					umami && umamiReport(umami, days).catch(failed),
					search && searchStats(search, days).catch(failed),
				]);
				return { days, visitors, search: searches };
			}),
	);

	return server;
}

/** One MCP request, answered by a server built for it alone. */
export async function handleMcp(request: Request): Promise<Response> {
	const server = createMcpServer();
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	});
	await server.connect(transport);
	try {
		return await transport.handleRequest(request);
	} finally {
		void server.close();
	}
}
