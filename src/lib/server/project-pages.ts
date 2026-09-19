// The project pages, written as Markdown in src/projects/<repo>.md and dressed in
// the site's layout at build time. Plain Markdown, plus three conventions:
//
//   the first paragraph         the lede under the title
//   ### Title + one paragraph   a feature tile; consecutive tiles share a grid
//   ![alt](name) + a paragraph  a screenshot from src/docs/<repo>/images, light and
//     line starting **Title**   dark, captioned; consecutive ones share a grid
//
// `## Heading {#id}` pins a section's anchor, and a ### straight above a code
// block, with no paragraph under it, is the small uppercase label over that block.
import { z } from "zod";
import type { IconNode } from "$lib/components/LucideIcon.svelte";
import { lucideIcon } from "$lib/docs-config";
import { SITE } from "$lib/seo";
import { dimensions, IMAGES, slugify } from "./guides";
import { highlight } from "./highlight";
import { externalLinks } from "./markdown";
import { frontmatter } from "./posts";

const Front = z
	.object({
		name: z.string().min(1),
		/** The pill beside "All projects", e.g. "Storage · MIT". */
		tag: z.string().min(1),
		title: z.string().min(1),
		/** The meta description, and the structured data's. */
		description: z.string().min(1),
		/** A screenshot name: its dark variant is the social card. */
		image: z.object({ src: z.string(), alt: z.string() }).strict().optional(),
		buttons: z
			.array(
				z
					.object({
						label: z.string().min(1),
						href: z.string().min(1),
						/** "github", "docker", or a Lucide icon name. */
						icon: z.string().min(1),
						primary: z.boolean().optional(),
					})
					.strict(),
			)
			.min(1),
		/** Extra SoftwareApplication fields: applicationCategory, license, keywords… */
		schema: z.record(z.string(), z.unknown()),
	})
	.strict();

export type Button = {
	label: string;
	href: string;
	primary: boolean;
	external: boolean;
	brand?: "github" | "docker";
	node?: IconNode;
};

export type ProjectPage = {
	repo: string;
	name: string;
	tag: string;
	title: string;
	description: string;
	image?: { url: string; width: number; height: number; alt: string };
	buttons: Button[];
	structuredData: unknown[];
	lede: string;
	html: string;
};

export async function loadProjectPage(repo: string): Promise<ProjectPage> {
	const file = `src/projects/${repo}.md`;
	const [meta, markdown] = frontmatter(await Bun.file(file).text());
	const parsed = Front.safeParse(meta);
	if (!parsed.success) {
		throw new Error(`${file} is invalid:\n${z.prettifyError(parsed.error)}`);
	}
	const front = parsed.data;

	const image = (name: string) => {
		const path = `src/docs/${repo}/images/${name}.webp`;
		const url = IMAGES[`/${path}`];
		const size = dimensions(path);
		if (!url || !size) {
			throw new Error(`${file}: ${path} is missing, run \`bun run docs\``);
		}
		return { url, ...size };
	};

	const html = await highlight(externalLinks(Bun.markdown.html(markdown)));
	const lede = html.match(/^<p>([\s\S]*?)<\/p>\n?/);
	if (!lede) {
		throw new Error(`${file}: the body has to open with the lede paragraph`);
	}

	const card = front.image && { ...image(`${front.image.src}-dark`), alt: front.image.alt };
	const url = `${SITE}/${repo}`;

	return {
		repo,
		name: front.name,
		tag: front.tag,
		title: front.title,
		description: front.description,
		image: card && { ...card, url: `${SITE}${card.url}` },
		buttons: front.buttons.map(({ icon, primary, ...button }) => ({
			...button,
			primary: primary ?? false,
			external: /^https?:/.test(button.href),
			...(icon === "github" || icon === "docker" ? { brand: icon } : { node: lucideIcon(icon) }),
		})),
		structuredData: [
			{
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				name: front.name,
				description: front.description,
				url,
				...(card && { screenshot: `${SITE}${card.url}` }),
				...front.schema,
				isAccessibleForFree: true,
				codeRepository: `https://github.com/orochibraru/${repo}`,
				author: { "@id": `${SITE}/#person` },
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
					availability: "https://schema.org/InStock",
				},
			},
		],
		lede: lede[1] ?? "",
		html: sections(html.slice(lede[0].length), image),
	};
}

type Image = (name: string) => { url: string; width: number; height: number };

/** One <section> per ##, plus an untitled one for anything between the lede and the first. */
function sections(html: string, image: Image): string {
	return html
		.split(/(?=<h2>)/)
		.filter((chunk) => chunk.trim())
		.map((chunk, index) => {
			const heading = chunk.match(/^<h2>([\s\S]*?)(?:\s*\{#([\w-]+)\})?<\/h2>\n?/);
			// only what sits above the first ## loads eagerly: it is in the first screen
			const body = tiles(heading ? chunk.slice(heading[0].length) : chunk, image, !!index);
			if (!heading) {
				return `<section>${body}</section>`;
			}
			const [, title = "", id = slugify(title)] = heading;
			const ruled = body.includes('class="tiles"') ? ' class="ruled"' : "";
			return `<section id="${id}"${ruled}><h2>${title}</h2>${body}</section>`;
		})
		.join("\n");
}

function tiles(html: string, image: Image, lazy: boolean): string {
	return (
		html
			.replace(
				/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g,
				'<div class="feat"><h3>$1</h3><p>$2</p></div>',
			)
			.replace(
				/<p><img src="([^"]*)" alt="([^"]*)" \/>\s*(?:<strong>([\s\S]*?)<\/strong>)?\s*([\s\S]*?)<\/p>/g,
				(_m, name: string, alt: string, title = "", caption: string) => {
					const light = image(name);
					const dark = image(`${name}-dark`);
					const loading = lazy ? ' loading="lazy"' : "";
					return (
						`<figure class="shot"><picture>` +
						`<source media="(prefers-color-scheme: dark)" srcset="${dark.url}">` +
						`<img src="${light.url}" width="${light.width}" height="${light.height}"${loading} decoding="async" alt="${alt}">` +
						`</picture><figcaption><b>${title}</b> ${caption}</figcaption></figure>`
					);
				},
			)
			// a run of tiles or screenshots becomes one grid
			.replace(
				/(?:(?:<div class="feat">[\s\S]*?<\/div>|<figure class="shot">[\s\S]*?<\/figure>)\s*)+/g,
				(run) => `<div class="tiles">${run.trim()}</div>\n`,
			)
	);
}
