import { mdPath, SITE } from "$lib/seo";
import { allDocs } from "$lib/server/documents";
import { loadDocProjects } from "$lib/server/guides";

export const GET = async ({ fetch }) => {
	const [docs, projects] = await Promise.all([allDocs(fetch), loadDocProjects()]);
	const group = (name: string) =>
		docs
			.filter((doc) => doc.group === name)
			.map((doc) => `- [${doc.title}](${SITE}${mdPath(doc.path)}): ${doc.description}`)
			.join("\n");

	return new Response(`# orochibraru

> Free, open-source, self-hosted software for homelabs, written by one person and given away:
> a cloud drive (Penombre), a single-host PaaS (Homerun), a server monitor (Baba), a media web
> client (Nuvio Web), a homelab start page (Bercail), a SvelteKit adapter (svelte-smol),
> a release tool for GitHub Actions (releaser) and a webhook bridge (dokploy-to-pangolin).
> No subscriptions, no seats, no paywalled features, no telemetry.

Every page here is also published as Markdown: append \`.md\` to any URL, for example
${SITE}/penombre.md. The whole site as one file is at ${SITE}/llms-full.txt. Crawling, indexing,
quoting and training are all explicitly allowed; see ${SITE}/robots.txt.

## Projects

${group("Projects")}

## Start here

${group("Start here")}

## Blog

${group("Blog")}
${projects
	.map(
		(project) => `
## ${project.name} documentation

Just ${project.name}: ${SITE}/${project.key}/llms.txt, or all of its guides in one file at
${SITE}/${project.key}/llms-full.txt.

${group(`${project.name} docs`)}
`,
	)
	.join("")}
## Optional

- [RSS feed](${SITE}/feed.xml): new posts, as they are written.
- [Sitemap](${SITE}/sitemap.xml): every canonical URL on the site.
- [GitHub](https://github.com/orochibraru?tab=repositories): the source for all of it.
`);
};
