import { error } from "@sveltejs/kit";
import { PROJECTS } from "$lib/projects";
import { SITE } from "$lib/seo";
import { guideDoc, pageDoc, projectDoc, twin } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";
import { PAGES } from "$lib/site";

export const prerender = true;

export const entries = () => PROJECTS.map((project) => ({ project: project.key }));

export const GET = async ({ fetch, params }) => {
	const project = PROJECTS.find((project) => project.key === params.project);
	const page = PAGES.find((page) => page.path === `/${params.project}`);
	if (!project || !page) {
		throw error(404);
	}
	const guides = await loadGuides();
	const docs = [
		await pageDoc(fetch, page),
		projectDoc(project, guides),
		...guides.filter((guide) => guide.project.key === project.key).map(guideDoc),
	];
	return new Response(
		`# ${project.name}: the project page and every guide, as Markdown\n\n` +
			`Generated ${new Date().toISOString().slice(0, 10)}. Index: ${SITE}/${project.key}/llms.txt\n\n` +
			docs.map((doc) => `---\n\n${twin(doc)}`).join("\n\n") +
			"\n",
	);
};
