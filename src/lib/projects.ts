// A project whose docs this site publishes, as the docs routes see it. The rows
// live in the database; order, titles, icons and categories come from each
// repo's docs/config.json (see docs-config.ts).
export type Project = {
	/** The URL segment, and the repo name. */
	key: string;
	name: string;
	blurb: string;
	/** https://github.com/owner/name */
	repo: string;
	branch: string;
};

/**
 * Repo-root files published as guides. They come first, in this order, whatever
 * config.json says — which is why it may not list them.
 */
export const ROOT_GUIDES = [
	{ slug: "readme", file: "README.md", label: "Introduction", icon: "book-text" },
	{ slug: "contributing", file: "CONTRIBUTING.md", label: "Contributing", icon: "hand-heart" },
] as const;

/** The URL a guide is published at. */
export const docsUrl = (project: Pick<Project, "key">, slug?: string) =>
	slug ? `/${project.key}/docs/${slug}` : `/${project.key}/docs`;
