// The shape of docs/config.json in each project repo: which guides the sidebar
// and the docs homepage show, under which category, in what order, with which
// icon. Published as JSON Schema by `bun run schema`, so those repos get
// validation and autocomplete from a `$schema` line.
import { icons } from "lucide";
import { z } from "zod";
import type { IconNode } from "$lib/components/LucideIcon.svelte";
import { ROOT_GUIDES } from "$lib/projects";
import { SITE } from "$lib/seo";

export const SCHEMA_URL = `${SITE}/docs-config.schema.json`;

// lucide keys its icons by the PascalCase of their kebab-case names, exactly:
// grid-2x2 -> Grid2x2, a-arrow-up -> AArrowUp. The reverse isn't unambiguous.
const pascal = (name: string) =>
	name
		.split("-")
		.map((part) => (part[0] ?? "").toUpperCase() + part.slice(1))
		.join("");

const iconData = icons as unknown as Record<string, IconNode | undefined>;

export const isIconName = (name: string) =>
	/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && iconData[pascal(name)] !== undefined;

// the enum of every name, for autocomplete in the project repos, is added by `bun run schema`
const Icon = z
	.string()
	.refine(isIconName, {
		error: (issue) => `"${issue.input}" is not a Lucide icon: https://lucide.dev/icons`,
	})
	.meta({ id: "Icon", description: "A Lucide icon name, kebab-case: https://lucide.dev/icons" });

const Page = z
	.object({
		slug: z
			.string()
			// readme and contributing always lead the sidebar, so they can't be placed
			.regex(new RegExp(`^(?!(?:${ROOT_GUIDES.map((guide) => guide.slug).join("|")})$)[\\w-]+$`), {
				error: "readme and contributing are always first: leave them out of config.json",
			})
			.describe("The guide's file name in docs/, without .md"),
		title: z
			.string()
			.min(1)
			.optional()
			.describe("Sidebar and card label. Defaults to the guide's first # heading"),
		icon: Icon.optional(),
	})
	.strict();

const Category = z
	.object({
		title: z.string().min(1).describe("Heading in the sidebar and on the docs homepage"),
		description: z
			.string()
			.min(1)
			.optional()
			.describe("One line under the heading on the homepage"),
		icon: Icon.optional(),
		pages: z.array(Page).min(1).describe("In reading order"),
	})
	.strict();

export const DocsConfig = z
	.object({
		$schema: z.string().optional(),
		categories: z.array(Category).min(1).describe("In reading order"),
	})
	.strict()
	.refine(
		(config) => {
			const slugs = config.categories.flatMap((category) =>
				category.pages.map((page) => page.slug),
			);
			return new Set(slugs).size === slugs.length;
		},
		{ message: "a slug is listed more than once" },
	)
	.describe("Order, titles, icons and categories for a project's docs on orochibraru.com");

export type DocsConfig = z.infer<typeof DocsConfig>;

/** An icon's SVG children, by name, bundled with the server rather than read from disk. */
export function lucideIcon(name: string): IconNode {
	const node = iconData[pascal(name)];
	if (!node) {
		throw new Error(`"${name}" is not a Lucide icon`);
	}
	return node;
}
