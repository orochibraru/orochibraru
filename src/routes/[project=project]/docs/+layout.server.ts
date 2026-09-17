import { error } from "@sveltejs/kit";
import { lucideIcon } from "$lib/docs-config";
import { PROJECTS } from "$lib/projects";
import { loadCategories, loadGuides } from "$lib/server/guides";

export const load = async ({ params }) => {
	const project = PROJECTS.find((project) => project.key === params.project);
	if (!project) {
		throw error(404);
	}
	const guides = (await loadGuides())
		.filter((guide) => guide.project.key === project.key)
		.map((guide) => ({
			slug: guide.slug,
			url: guide.url,
			title: guide.title,
			label: guide.label,
			icon: guide.icon,
			intro: guide.intro,
		}));
	return {
		project,
		guides,
		categories: await loadCategories(project),
		overviewIcon: lucideIcon("book-open"),
	};
};
