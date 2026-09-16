import { Glob } from "bun";
import { externalLinks } from "./markdown";

export type Post = {
	slug: string;
	title: string;
	date: string;
	description: string;
	html: string;
	markdown: string;
};

/** Minimal frontmatter: a leading `---` block of `key: value` scalars. */
function frontmatter(raw: string): [Record<string, string>, string] {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		return [{}, raw];
	}
	const meta: Record<string, string> = {};
	for (const line of match[1]?.split("\n") ?? []) {
		const colon = line.indexOf(":");
		if (colon > 0) {
			meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
		}
	}
	return [meta, raw.slice(match[0].length)];
}

async function readPosts(): Promise<Post[]> {
	const posts: Post[] = [];
	for (const file of new Glob("src/posts/*.md").scanSync(".")) {
		const slug = file.split("/").pop()?.replace(/\.md$/, "") ?? file;
		const [meta, markdown] = frontmatter(await Bun.file(file).text());
		const { title, date, description } = meta;
		if (!title || !date || !description) {
			throw new Error(`${file}: frontmatter needs title, date and description`);
		}
		posts.push({
			slug,
			title,
			date,
			description,
			html: externalLinks(Bun.markdown.html(markdown)),
			markdown: markdown.trim(),
		});
	}
	return posts.sort((a, b) => b.date.localeCompare(a.date));
}

let loaded: Promise<Post[]> | undefined;

export const loadPosts = () => {
	loaded ??= readPosts();
	return loaded;
};
