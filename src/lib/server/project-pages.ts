// The project pages: a `project` row whose `body` is Markdown, dressed in the
// site's layout. Plain Markdown, plus three conventions:
//
//   the first paragraph         the lede under the title
//   ### Title + one paragraph   a feature tile; consecutive tiles share a grid
//   ![alt](name) + a paragraph  a repo screenshot (`name` and `name-dark`, synced
//     line starting **Title**   from docs/images), captioned; consecutive ones share a grid
//
// `## Heading {#id}` pins a section's anchor, and a ### straight above a code
// block, with no paragraph under it, is the small uppercase label over that block.
import { z } from "zod";
import type { IconNode } from "$lib/components/LucideIcon.svelte";
import { isIconName, lucideIcon } from "$lib/docs-config";
import { SITE } from "$lib/seo";
import type { project } from "./db/schema";
import { slugify } from "./guides";
import { highlight } from "./highlight";
import { imageByName } from "./images";
import { externalLinks } from "./markdown";

const BRANDS = ["github", "docker"] as const;

/** Everything about a project page but its body: the admin form, MCP and the import all validate with it. */
export const ProjectFields = z
	.object({
		name: z.string().min(1),
		/** The pill beside "All projects", e.g. "Storage · MIT". */
		tag: z.string().min(1),
		title: z.string().min(1),
		/** The meta description, and the structured data's. */
		description: z.string().min(1),
		/** A screenshot name: its dark variant is the social card. */
		image: z
			.object({ src: z.string().min(1), alt: z.string() })
			.strict()
			.nullable()
			.optional(),
		buttons: z
			.array(
				z
					.object({
						label: z.string().min(1),
						href: z.string().min(1),
						icon: z
							.string()
							.refine((icon) => (BRANDS as readonly string[]).includes(icon) || isIconName(icon), {
								error: 'icon is "github", "docker" or a Lucide icon name',
							}),
						primary: z.boolean().optional(),
					})
					.strict(),
			)
			.min(1),
		/** Extra SoftwareApplication fields: applicationCategory, license, keywords… */
		schema: z.record(z.string(), z.unknown()),
		/** The home page card. */
		category: z.string().min(1),
		blurb: z.string().min(1),
		chips: z.array(z.string().min(1)),
	})
	.strict();

export type ProjectFields = z.infer<typeof ProjectFields>;
export type ProjectRow = typeof project.$inferSelect;

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
	/** The repo, when there is one: the header's source link. */
	source?: string;
	image?: { url: string; width: number; height: number; alt: string };
	buttons: Button[];
	structuredData: unknown[];
	lede: string;
	html: string;
};

export async function renderProjectPage(row: ProjectRow): Promise<ProjectPage> {
	const image: Image = (name) => {
		const found = imageByName(row.repo, name);
		if (!found) {
			console.warn(`${row.repo}: screenshot ${name} is missing, resync the project`);
		}
		return found;
	};

	const html = await highlight(externalLinks(Bun.markdown.html(row.body)));
	// no lede is an unfinished page, not a broken one: the editor shows it as it is
	const lede = html.match(/^<p>([\s\S]*?)<\/p>\n?/);

	const dark = row.image ? image(`${row.image.src}-dark`) : undefined;
	const card =
		row.image && dark ? { ...dark, url: `${SITE}${dark.url}`, alt: row.image.alt } : undefined;
	const url = `${SITE}/${row.repo}`;
	const source = row.githubRepo ? `https://github.com/${row.githubRepo}` : undefined;

	return {
		repo: row.repo,
		name: row.name,
		tag: row.tag,
		title: row.title,
		description: row.description,
		source,
		image: card,
		buttons: row.buttons.map(({ icon, primary, ...button }) => ({
			...button,
			primary: primary ?? false,
			external: /^https?:/.test(button.href),
			...(icon === "github" || icon === "docker" ? { brand: icon } : { node: lucideIcon(icon) }),
		})),
		structuredData: [
			{
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				name: row.name,
				description: row.description,
				url,
				...(card && { screenshot: card.url }),
				...row.schema,
				isAccessibleForFree: true,
				...(source && { codeRepository: source }),
				author: { "@id": `${SITE}/#person` },
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
					availability: "https://schema.org/InStock",
				},
			},
		],
		lede: lede?.[1] ?? "",
		html: sections(lede ? html.slice(lede[0].length) : html, image),
	};
}

type Size = { url: string; width: number; height: number };
type Image = (name: string) => Size | undefined;

/** A screenshot and its `-dark` twin, one <img> each: the site's theme toggle picks, not just the OS. */
function themed(light: Size, dark: Size | undefined, alt: string, lazy: boolean): string {
	const img = ({ url, width, height }: Size, theme: string) =>
		`<img${theme} src="${url}" width="${width}" height="${height}"${lazy ? ' loading="lazy"' : ""} decoding="async" alt="${alt}">`;
	return dark ? img(light, ' class="on-light"') + img(dark, ' class="on-dark"') : img(light, "");
}

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
				/<p><img src="([\w-]+)" alt="([^"]*)" \/>\s*(?:<strong>([\s\S]*?)<\/strong>)?\s*([\s\S]*?)<\/p>/g,
				(_m, name: string, alt: string, title = "", caption: string) => {
					const light = image(name);
					if (!light) {
						return "";
					}
					return `<figure class="shot">${themed(light, image(`${name}-dark`), alt, lazy)}<figcaption><b>${title}</b> ${caption}</figcaption></figure>`;
				},
			)
			// a run of tiles or screenshots becomes one grid
			.replace(
				/(?:(?:<div class="feat">[\s\S]*?<\/div>|<figure class="shot">[\s\S]*?<\/figure>)\s*)+/g,
				(run) => `<div class="tiles">${run.trim()}</div>\n`,
			)
	);
}
