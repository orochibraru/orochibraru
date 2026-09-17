// The projects whose docs this site publishes. Order, titles, icons and
// categories come from each repo's docs/config.json (see docs-config.ts).
export type Project = {
	key: "penombre" | "homerun";
	name: string;
	blurb: string;
	repo: string;
	branch: string;
};

export const PROJECTS: Project[] = [
	{
		key: "penombre",
		name: "Penombre",
		blurb: "A self-hosted drive: previews, notes, sharing and an admin panel, in one container.",
		repo: "https://github.com/orochibraru/penombre",
		branch: "main",
	},
	{
		key: "homerun",
		name: "Homerun",
		blurb: "A single-host PaaS: deploy an image or a repo from a form, Traefik routes it with TLS.",
		repo: "https://github.com/orochibraru/homerun",
		branch: "main",
	},
];

/**
 * Repo-root files published as guides. They come first, in this order, whatever
 * config.json says — which is why it may not list them.
 */
export const ROOT_GUIDES = [
	{ slug: "readme", file: "README.md", label: "Introduction", icon: "book-text" },
	{ slug: "contributing", file: "CONTRIBUTING.md", label: "Contributing", icon: "hand-heart" },
] as const;

/** Where a project's vendored Markdown lives. */
export const docsDir = (project: Project) => `src/docs/${project.key}`;

/** The URL a guide is published at. */
export const docsUrl = (project: Project, slug?: string) =>
	slug ? `/${project.key}/docs/${slug}` : `/${project.key}/docs`;
