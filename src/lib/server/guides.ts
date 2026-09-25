// The synced guides, turned into something this site can publish.
//
// Upstream writes them to be read in a repo: links point at `env.md`, images at
// `images/hero.png`, and anchors assume GitHub's heading slugs. Nothing is
// rewritten at sync time — the `guide` rows stay verbatim upstream — so all of
// that happens here, when they are first rendered, and is cached until the next
// sync or edit.
import { posix } from "node:path";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { IconNode } from "$lib/components/LucideIcon.svelte";
import { DocsConfig, lucideIcon } from "$lib/docs-config";
import { type Channel, docsUrl, type Project, ROOT_GUIDES } from "$lib/projects";
import { SITE } from "$lib/seo";
import { getDb } from "./db";
import { docsVersion, guide as guideTable, project as projectTable } from "./db/schema";
import { highlight } from "./highlight";
import { imageByName } from "./images";
import { externalLinks } from "./markdown";

export type Section = { id: string; heading: string; text: string; level: number };

export type Guide = {
	project: Project;
	slug: string;
	url: string;
	/** The guide's own # heading. */
	title: string;
	/** What the sidebar and cards call it: config.json's title, else the heading. */
	label: string;
	icon: IconNode;
	/** First paragraph, as plain text: the meta description and the index blurb. */
	intro: string;
	/** Rendered body, with the leading <h1> removed — the layout prints the title. */
	html: string;
	/** The upstream file on GitHub. */
	source: string;
	/** The source with links rewritten, published at <url>.md. */
	markdown: string;
	sections: Section[];
};

/**
 * GitHub's heading slug: lowercase, drop anything that isn't a letter, digit,
 * space, hyphen or underscore, then spaces to hyphens. Worth matching exactly —
 * guides link to each other's anchors (`services.md#custom-domains--ssl`, whose
 * double hyphen is the removed `&`), and those have to keep landing.
 */
export const slugify = (text: string) =>
	text
		.toLowerCase()
		.replace(/<[^>]+>/g, "")
		// the renderer escapes first, and "&" has to be a removed character rather
		// than the letters "amp": GitHub slugs "Custom domains & SSL" with the
		// double hyphen its absence leaves, and guides link to exactly that
		.replace(/&(amp|lt|gt|quot|#39|apos);/g, "")
		.replace(/[^\p{L}\p{N} _-]/gu, "")
		.trim()
		.replace(/ /g, "-");

/** Strip enough Markdown to leave readable prose for descriptions and search. */
const plain = (markdown: string) =>
	markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*_`]/g, "")
		.replace(/\s+/g, " ")
		.trim();

/**
 * One link target, as this site should serve it. Targets resolve from the file's own
 * folder: docs/ for guides, the repo root for README and CONTRIBUTING.
 *   env.md, env.md#redis   another guide, here
 *   ../CONTRIBUTING.md     a root guide, here
 *   #redis                 same page, left alone
 *   images/hero.png        the vendored WebP
 *   ../compose.yaml        a file only the repo has: send people to the repo
 *   https://…              left alone
 */
function rewrite(
	target: string,
	project: Project,
	slugs: Set<string>,
	image: (name: string) => string,
	folder: string,
): string {
	if (/^(https?:|mailto:|#|\/)/.test(target)) {
		return target;
	}

	const [path = "", hash] = target.split("#", 2);
	const anchor = hash ? `#${hash}` : "";
	const inRepo = posix.join(folder, path);

	const picture = imageName(inRepo);
	if (picture) {
		return image(picture);
	}

	const guide =
		ROOT_GUIDES.find((root) => root.file === inRepo)?.slug ??
		inRepo.match(/^docs\/([\w-]+)\.md$/)?.[1];
	if (guide && slugs.has(guide)) {
		return `${docsUrl(project, guide)}${anchor}`;
	}

	// anything else is a repo file this site doesn't publish
	return `${project.repo}/blob/${project.branch}/${inRepo}${anchor}`;
}

/** docs/images/hero.png -> hero, the name its WebP is vendored under. */
const imageName = (inRepo: string) =>
	inRepo.match(/^docs\/images\/(.+)\.(?:png|jpe?g|webp)$/i)?.[1];

/** Split the body by heading: one search result should land on a section. */
function sections(body: string, title: string): Section[] {
	const found: Section[] = [{ id: "", heading: title, text: "", level: 1 }];
	let fenced = false;

	for (const line of body.split("\n")) {
		if (line.startsWith("```")) {
			fenced = !fenced;
			continue;
		}
		if (fenced) {
			continue;
		}

		const heading = line.match(/^(#{2,4})\s+(.+?)\s*$/);
		if (heading) {
			const [, hashes = "", name = ""] = heading;
			found.push({ id: slugify(name), heading: plain(name), text: "", level: hashes.length });
			continue;
		}
		// table rows read as noise out of context
		if (/^\s*\|/.test(line)) {
			continue;
		}

		// drop the markers a line carries into prose: blockquote arrows, bullets
		const text = plain(line.replace(/^\s*>\s?/, "").replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
		const last = found.at(-1);
		if (text && last) {
			last.text += `${text} `;
		}
	}

	return found
		.map((section) => ({ ...section, text: section.text.trim().slice(0, 400) }))
		.filter((section) => section.heading && (section.text || section.id));
}

export type Category = {
	/** Absent for the leading README/CONTRIBUTING group, which has no heading. */
	title?: string;
	description?: string;
	icon?: IconNode;
	slugs: string[];
};

type Loaded = {
	guides: Guide[];
	projects: Map<Project["key"], Project>;
	categories: Map<Project["key"], Category[]>;
};

const loaded = new Map<Channel, Promise<Loaded>>();

const load = (channel: Channel) => {
	let pending = loaded.get(channel);
	if (!pending) {
		pending = readGuides(channel).catch((cause) => {
			loaded.delete(channel);
			throw cause;
		});
		loaded.set(channel, pending);
	}
	return pending;
};

/** Every save and sync calls this: the next request renders from the rows again. */
export const invalidateGuides = () => {
	loaded.clear();
};

/** The projects with at least one guide in this channel, as the docs routes know them. */
export const loadDocProjects = (channel: Channel = "latest") =>
	load(channel).then(({ projects }) => [...projects.values()]);

/** Every guide of a channel, each project's in its config.json reading order. */
export const loadGuides = (channel: Channel = "latest") =>
	load(channel).then(({ guides }) => guides);

/** A project's sidebar sections: config.json's categories, then anything it doesn't list. */
export const loadCategories = (project: Project) =>
	load(project.channel).then(({ categories }) => categories.get(project.key) ?? []);

/** The synced docs/config.json, or null when the repo has none. */
function readConfig(repo: string, json: unknown): DocsConfig | null {
	if (!json) {
		return null;
	}
	const parsed = DocsConfig.safeParse(json);
	if (!parsed.success) {
		// the sync validates before it stores, so this means a hand edit gone wrong
		console.warn(`${repo}: stored docs config is invalid:\n${z.prettifyError(parsed.error)}`);
		return null;
	}
	return parsed.data;
}

async function readGuides(channel: Channel): Promise<Loaded> {
	const guides: Guide[] = [];
	const projects = new Map<Project["key"], Project>();
	const categories = new Map<Project["key"], Category[]>();

	const db = getDb();
	const rows = db
		.select()
		.from(projectTable)
		.where(and(eq(projectTable.published, true), isNotNull(projectTable.githubRepo)))
		.orderBy(asc(projectTable.position))
		.all();

	for (const row of rows) {
		const files = new Map(
			db
				.select()
				.from(guideTable)
				.where(and(eq(guideTable.project, row.repo), eq(guideTable.channel, channel)))
				.all()
				.map((file) => [file.slug, file]),
		);
		if (!files.size) {
			continue;
		}
		const version = db
			.select()
			.from(docsVersion)
			.where(and(eq(docsVersion.project, row.repo), eq(docsVersion.channel, channel)))
			.get();
		const project: Project = {
			key: row.repo,
			name: row.name,
			blurb: row.blurb || row.description,
			repo: `https://github.com/${row.githubRepo}`,
			branch: version?.ref ?? row.defaultBranch ?? "main",
			channel,
		};
		projects.set(project.key, project);
		const directory = `${row.repo} docs`;
		const slugs = new Set(files.keys());
		const config = readConfig(row.repo, version?.config);
		const pages = new Map(
			config?.categories.flatMap((category) => category.pages.map((page) => [page.slug, page])),
		);
		const groups: Category[] = (config?.categories ?? []).map((category) => ({
			title: category.title,
			description: category.description,
			icon: category.icon ? lucideIcon(category.icon) : undefined,
			slugs: category.pages.map((page) => page.slug).filter((slug) => slugs.has(slug)),
		}));
		for (const slug of pages.keys()) {
			if (!slugs.has(slug)) {
				console.warn(`${directory}/config.json lists ${slug}, which has no ${slug}.md`);
			}
		}
		const roots = ROOT_GUIDES.filter((root) => slugs.has(root.slug));
		groups.unshift({ slugs: roots.map((root) => root.slug) });
		// never drop a guide config.json forgot: it gets a page, in a trailing section
		const unlisted = [...slugs]
			.filter((slug) => !pages.has(slug) && !roots.some((root) => root.slug === slug))
			.sort();
		if (unlisted.length) {
			if (config) {
				console.warn(
					`${directory}/config.json doesn't list ${unlisted.join(", ")}: they sort last`,
				);
			}
			groups.push({ title: config ? "More" : "Guides", slugs: unlisted });
		}
		categories.set(
			project.key,
			groups.filter((group) => group.slugs.length),
		);

		for (const slug of groups.flatMap((group) => group.slugs)) {
			const stored = files.get(slug);
			if (!stored) {
				continue;
			}
			const raw = stored.markdown;
			const root = roots.find((root) => root.slug === slug);
			const file = stored.sourcePath;
			const folder = posix.dirname(file) === "." ? "" : posix.dirname(file);

			const heading = raw.match(/^#\s+(.+?)\s*$/m);
			const title = heading?.[1] ? plain(heading[1]) : slug;
			const body = heading ? raw.replace(heading[0], "").trimStart() : raw;

			const image = (name: string) => {
				const found = imageByName(project.key, name, channel);
				if (!found) {
					console.warn(`${directory}: image ${name} is missing, resync the project`);
				}
				return found?.url ?? "";
			};

			const absolute = (target: string) => {
				const url = rewrite(target, project, slugs, image, folder);
				return url.startsWith("/") ? `${SITE}${url}` : url;
			};

			const ids = new Map<string, number>();
			const html = await highlight(
				externalLinks(
					Bun.markdown
						.html(body)
						.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_tag, level: string, inner: string) => {
							const base = slugify(inner);
							const seen = ids.get(base) ?? 0;
							ids.set(base, seen + 1);
							const id = seen ? `${base}-${seen}` : base;
							// a sibling of the text, not a wrapper: a heading can hold a link itself
							return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-label="Copy link to this section">#</a>${inner}</h${level}>`;
						})
						.replace(
							/<a href="([^"]*)"/g,
							(_tag, href: string) => `<a href="${rewrite(href, project, slugs, image, folder)}"`,
						)
						// raw HTML in a README puts src anywhere: <img alt="…" src="…">
						.replace(
							/<img ([^>]*?)src="([^"]*)"([^>]*?)\/?>/g,
							(_tag, before: string, src: string, rest: string) => {
								const source = rewrite(src, project, slugs, image, folder);
								const name = imageName(posix.join(folder, src));
								const size = name ? imageByName(project.key, name, channel) : undefined;
								const sized = size ? ` width="${size.width}" height="${size.height}"` : "";
								const img = (src: string, theme: string) =>
									`<img ${theme}${before}src="${src}"${rest}${sized} loading="lazy" decoding="async">`;
								// a `-dark` twin in docs/images: one <img> each, the site's theme picks
								const dark = name ? imageByName(project.key, `${name}-dark`, channel) : undefined;
								return dark
									? img(source, 'class="on-light" ') + img(dark.url, 'class="on-dark" ')
									: img(source, "");
							},
						)
						// a README's <picture> OS-only dark source: the pair above follows the toggle instead
						.replace(/<source [^>]*>/g, (tag) => {
							const src = tag.match(/srcset="([^"]*)"/)?.[1];
							return tag.includes("prefers-color-scheme") &&
								src &&
								imageName(posix.join(folder, src))
								? ""
								: tag;
						})
						// <picture><source srcset="docs/images/hero-dark.png"> for the dark variant
						.replace(
							/ srcset="([^"]*)"/g,
							(_attr, src: string) => ` srcset="${rewrite(src, project, slugs, image, folder)}"`,
						)
						// the env references are mostly tables, and some are wider than a phone
						.replace(/<table>/g, '<div class="md-table"><table>')
						.replace(/<\/table>/g, "</table></div>"),
				),
			);

			const firstParagraph =
				body.split(/\n\s*\n/).find((block) => !/^(?:[#`|\-!<]|\[!)/.test(block.trim())) ?? "";
			const intro = plain(firstParagraph);

			guides.push({
				project,
				slug,
				url: docsUrl(project, slug),
				title,
				label: root?.label ?? pages.get(slug)?.title ?? title,
				icon: lucideIcon(root?.icon ?? pages.get(slug)?.icon ?? "file"),
				intro,
				html,
				// edits land on the default branch, whatever ref this channel reads
				source: `${project.repo}/blob/${row.defaultBranch ?? "main"}/${file}`,
				// read away from this site, so every link and image has to be absolute
				markdown: raw
					.replace(/\]\(([^)]+)\)/g, (_link, target: string) => `](${absolute(target)})`)
					.replace(
						/ (src|srcset)="([^"]*)"/g,
						(_attr, name: string, target: string) => ` ${name}="${absolute(target)}"`,
					),
				sections: sections(body, title),
			});
		}
	}

	return { guides, projects, categories };
}
