import { error } from "@sveltejs/kit";
import { SITE } from "$lib/seo";
import { guideDoc, projectDoc, projectPageDoc, twin } from "$lib/server/documents";
import { loadDocProjects, loadGuides } from "$lib/server/guides";

export const GET = async ({ params }) => {
	const project = (await loadDocProjects()).find((project) => project.key === params.repo);
	const page = projectPageDoc(params.repo);
	if (!project || !page) {
		throw error(404);
	}
	const guides = await loadGuides();
	const docs = [
		page,
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
