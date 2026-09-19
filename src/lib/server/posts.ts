import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { post as postTable } from "./db/schema";
import { highlight } from "./highlight";
import { externalLinks } from "./markdown";

export type Post = {
	slug: string;
	title: string;
	date: string;
	description: string;
	html: string;
	markdown: string;
};

export type PostRow = typeof postTable.$inferSelect;

/** A leading `---` YAML block. Real YAML, because prettier folds long values onto several lines. */
export function frontmatter(raw: string): [Record<string, unknown>, string] {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		return [{}, raw];
	}
	const meta = Bun.YAML.parse(match[1] ?? "") as Record<string, unknown> | null;
	return [meta ?? {}, raw.slice(match[0].length)];
}

/** Also what the admin preview shows, so a draft looks exactly as it will. */
export async function renderPost(
	row: Pick<PostRow, "slug" | "title" | "date" | "description" | "body">,
): Promise<Post> {
	return {
		slug: row.slug,
		title: row.title,
		date: row.date,
		description: row.description,
		html: await highlight(externalLinks(Bun.markdown.html(row.body))),
		markdown: row.body.trim(),
	};
}

async function readPosts(): Promise<Post[]> {
	const rows = getDb()
		.select()
		.from(postTable)
		.where(eq(postTable.status, "published"))
		.orderBy(desc(postTable.date))
		.all();
	return Promise.all(rows.map(renderPost));
}

let loaded: Promise<Post[]> | undefined;

/** Published posts, newest first. Drafts never leave the admin. */
export const loadPosts = () => {
	loaded ??= readPosts().catch((cause) => {
		loaded = undefined;
		throw cause;
	});
	return loaded;
};

export const invalidatePosts = () => {
	loaded = undefined;
};
