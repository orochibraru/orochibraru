import { error, json } from "@sveltejs/kit";
import { z } from "zod";
import { requireAdmin } from "$lib/server/admin";
import { getProject } from "$lib/server/editor";
import { renderPost } from "$lib/server/posts";
import { renderProjectPage } from "$lib/server/project-pages";

const Body = z.object({
	kind: z.enum(["post", "project"]),
	markdown: z.string(),
	repo: z.string().optional(),
});

export const POST = async (event) => {
	await requireAdmin(event);
	const parsed = Body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) {
		throw error(400, "Expected { kind, markdown, repo? }");
	}
	const { kind, markdown, repo } = parsed.data;
	if (kind === "post") {
		const post = await renderPost({
			slug: "",
			title: "",
			date: "",
			description: "",
			body: markdown,
		});
		return json({ html: post.html });
	}
	const row = repo ? getProject(repo) : undefined;
	if (!row) {
		throw error(404, "No such project");
	}
	const page = await renderProjectPage({ ...row, body: markdown });
	return json({ html: page.html, lede: page.lede });
};
