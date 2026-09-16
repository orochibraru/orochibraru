import { error } from "@sveltejs/kit";
import { docsUrl, PROJECTS } from "$lib/projects";
import { clip, mdPath, SITE } from "$lib/seo";
import { loadGuides } from "$lib/server/guides";

export const prerender = true;

export const entries = () => PROJECTS.map((project) => ({ project: project.key }));

// One project's slice of /llms.txt: an assistant asked about Penombre needs Penombre, not the whole site.
export const GET = async ({ params }) => {
	const project = PROJECTS.find((project) => project.key === params.project);
	if (!project) {
		throw error(404);
	}
	const guides = (await loadGuides()).filter((guide) => guide.project.key === project.key);

	return new Response(`# ${project.name}

> ${project.blurb} Free, open source and self-hosted, by orochibraru.

- Project page: ${SITE}${mdPath(`/${project.key}`)}
- Documentation index: ${SITE}${mdPath(docsUrl(project))}
- Every guide below in one file: ${SITE}/${project.key}/llms-full.txt
- Source code: ${project.repo}

## Documentation

${guides.map((guide) => `- [${guide.title}](${SITE}${mdPath(guide.url)}): ${clip(guide.intro, 160)}`).join("\n")}

## Optional

- [Everything on orochibraru.com](${SITE}/llms.txt): the other projects and the blog.
`);
};
