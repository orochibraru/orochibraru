// The projects whose docs this site publishes.
//
// `order` is the sidebar, and the reading order their own docs/README.md sets
// out. A guide that appears upstream without being listed here still gets a
// page — it sorts to the end and `bun run docs` says so — so a new guide is
// never silently dropped, it just wants a line adding here.
export type Project = {
	key: "penombre" | "homerun";
	name: string;
	blurb: string;
	repo: string;
	branch: string;
	order: string[];
};

export const PROJECTS: Project[] = [
	{
		key: "penombre",
		name: "Penombre",
		blurb: "A self-hosted drive: previews, notes, sharing and an admin panel, in one container.",
		repo: "https://github.com/orochibraru/penombre",
		branch: "main",
		order: [
			"getting-started",
			"showcase",
			"env",
			"deployment",
			"storage",
			"uploads",
			"volumes",
			"sharing",
			"shared-drives",
			"documents",
			"media",
			"notifications",
			"admin",
			"simple-mode",
			"reverse-proxy",
			"troubleshooting",
			"authentication",
			"architecture",
		],
	},
	{
		key: "homerun",
		name: "Homerun",
		blurb: "A single-host PaaS: deploy an image or a repo from a form, Traefik routes it with TLS.",
		repo: "https://github.com/orochibraru/homerun",
		branch: "main",
		order: [
			"getting-started",
			"showcase",
			"configuration",
			"faq-and-limitations",
			"services",
			"deploy-source-and-builds",
			"git-providers",
			"deploy-on-push",
			"pull-request-previews",
			"status-checks",
			"compose-import",
			"migrating-from-dokploy-or-coolify",
			"deploying",
			"revisions-and-rollback",
			"image-scanning",
			"env-vars",
			"networking",
			"dns-automation",
			"runtime-and-compute",
			"swarm-mode",
			"observability",
			"scheduling",
			"stacks",
			"templates",
			"storage-volumes",
			"backups",
			"remote-hosts-and-agent",
			"users-and-roles",
			"authentication-providers",
			"your-profile",
			"two-factor-and-passkeys",
			"login-wall",
			"sign-in-with-homerun",
			"dashboard",
			"system-logs",
			"docker-cleanup",
			"notifications",
			"status-pages",
			"upgrading",
			"api-and-cli",
		],
	},
];

/** Where a project's vendored Markdown lives. */
export const docsDir = (project: Project) => `src/docs/${project.key}`;

/** The URL a guide is published at. */
export const docsUrl = (project: Project, slug?: string) =>
	slug ? `/${project.key}/docs/${slug}` : `/${project.key}/docs`;
