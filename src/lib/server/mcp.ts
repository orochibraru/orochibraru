// The MCP server Claude talks to: posts, images and project pages, through the
// same editor functions the admin UI uses. Stateless: every request builds a
// fresh server and transport, so nothing lingers between calls.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { SITE } from "$lib/seo";
import {
	createPost,
	EditorError,
	getPostBySlug,
	getProject,
	listAllPosts,
	listAllProjects,
	type PostRow,
	ProjectPatch,
	setPostStatus,
	updatePost,
	updateProject,
} from "./editor";
import { storeImage } from "./images";

const IMAGE_LIMIT = 20 * 1024 * 1024;

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

async function fetchImage(url: string): Promise<Uint8Array> {
	if (!url.startsWith("https://")) {
		throw new EditorError("only https:// image URLs are fetched");
	}
	const response = await fetch(url, {
		signal: AbortSignal.timeout(15_000),
		redirect: "follow",
	}).catch(() => {
		throw new EditorError(`couldn't fetch ${url}`);
	});
	if (!response.ok) {
		throw new EditorError(`${url} answered ${response.status}`);
	}
	if (Number(response.headers.get("content-length") ?? 0) > IMAGE_LIMIT) {
		throw new EditorError("images are limited to 20 MB");
	}
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.length > IMAGE_LIMIT) {
		throw new EditorError("images are limited to 20 MB");
	}
	return bytes;
}

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
		"upload_image",
		{
			title: "Upload an image",
			description:
				"Store an image (PNG, JPEG, WebP or TIFF, from an https URL or base64) and get back the " +
				"Markdown to put in a post or page.",
			inputSchema: {
				alt: z.string().describe("What the image shows, for screen readers"),
				url: z.string().optional(),
				base64: z.string().optional(),
			},
		},
		({ alt, url, base64 }) =>
			run(async () => {
				if (!url === !base64) {
					throw new EditorError("give exactly one of url or base64");
				}
				const bytes = url
					? await fetchImage(url)
					: Uint8Array.from(Buffer.from(base64 ?? "", "base64"));
				if (bytes.length > IMAGE_LIMIT) {
					throw new EditorError("images are limited to 20 MB");
				}
				const stored = await storeImage(bytes, { source: "upload", alt }).catch((cause) => {
					throw new EditorError(cause instanceof Error ? cause.message : "not an image");
				});
				return {
					url: stored.url,
					markdown: `![${alt}](${stored.url})`,
					width: stored.width,
					height: stored.height,
				};
			}),
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
				"`## Heading {#id}` pins an anchor; a ### directly above a code block labels it.",
			inputSchema: { repo: z.string() },
			annotations: { readOnlyHint: true },
		},
		({ repo }) =>
			run(() => {
				const row = getProject(repo);
				if (!row) {
					throw new EditorError(`no project ${repo}; list_projects shows them all`);
				}
				return row;
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
