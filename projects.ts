// The projects whose docs this site publishes.
//
// `order` is the sidebar, and the reading order their own docs/README.md sets
// out. A guide that appears upstream without being listed here still gets a
// page — it sorts to the end and `bun run docs` says so — so a new guide is
// never silently dropped, it just wants a line adding here.
export type Project = {
  key: string;
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
      "documents",
      "media",
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
      "configuration",
      "services",
      "projects-and-templates",
      "storage-and-backups",
      "remote-hosts-and-agent",
      "users-and-access",
      "api-and-cli",
      "faq-and-limitations",
    ],
  },
];

/** Where a project's vendored Markdown lives. */
export const docsDir = (project: Project) => `src/docs/${project.key}`;

/** The URL a guide is published at. */
export const docsUrl = (project: Project, slug?: string) =>
  slug ? `/${project.key}/docs/${slug}` : `/${project.key}/docs`;
