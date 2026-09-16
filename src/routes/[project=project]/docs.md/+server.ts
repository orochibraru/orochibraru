import { error } from "@sveltejs/kit";
import { PROJECTS } from "$lib/projects";
import { markdownResponse, projectDoc } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";

export const prerender = true;

export const entries = () => PROJECTS.map((project) => ({ project: project.key }));

export const GET = async ({ params }) => {
	const project = PROJECTS.find((project) => project.key === params.project);
	if (!project) {
		throw error(404);
	}
	return markdownResponse(projectDoc(project, await loadGuides()));
};
