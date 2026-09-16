import { error } from "@sveltejs/kit";
import { PROJECTS } from "$lib/projects";
import { loadGuides } from "$lib/server/guides";

export const load = async ({ params }) => {
	const project = PROJECTS.find((project) => project.key === params.project);
	if (!project) {
		throw error(404);
	}
	const { order: _, ...summary } = project;
	const guides = (await loadGuides())
		.filter((guide) => guide.project.key === project.key)
		.map((guide) => ({
			slug: guide.slug,
			url: guide.url,
			title: guide.title,
			intro: guide.intro,
		}));
	return { project: summary, guides };
};
