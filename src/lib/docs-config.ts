// The shape of docs/config.json in each project repo: which guides the sidebar
// and the docs homepage show, under which category, in what order, with which
// icon. Published as JSON Schema by `bun run schema`, so those repos get
// validation and autocomplete from a `$schema` line.
import { Glob } from "bun";
import { z } from "zod";
import { SITE } from "$lib/seo";

export const SCHEMA_URL = `${SITE}/docs-config.schema.json`;

// every icon @lucide/svelte ships, by its kebab-case file name
const ICON_NAMES = [...new Glob("*.svelte").scanSync("node_modules/@lucide/svelte/dist/icons")]
	.map((file) => file.replace(/\.svelte$/, ""))
	.sort();

const Icon = z
	.enum(ICON_NAMES as [string, ...string[]])
	.meta({ id: "Icon", description: "A Lucide icon name, kebab-case: https://lucide.dev/icons" });

const Page = z
	.object({
		slug: z
			.string()
			.regex(/^[\w-]+$/)
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
