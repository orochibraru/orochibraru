import { error } from "@sveltejs/kit";
import { lucideIcon } from "$lib/docs-config";
import { CHANNELS } from "$lib/projects";
import { loadCategories, loadDocProjects, loadGuides } from "$lib/server/guides";

export const load = async ({ params }) => {
	const channel = params.channel ?? "latest";
	const versions = await Promise.all(
		CHANNELS.map(async (each) => {
			const project = (await loadDocProjects(each)).find((project) => project.key === params.repo);
			const slugs = (await loadGuides(each))
				.filter((guide) => guide.project.key === params.repo)
				.map((guide) => guide.slug);
			return project && { channel: each, ref: project.branch, slugs };
		}),
	);
	const project = (await loadDocProjects(channel)).find((project) => project.key === params.repo);
	if (!project) {
		throw error(404);
	}
	const guides = (await loadGuides(channel))
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
		source: project.repo,
		guides,
		// more than one: the repo cuts releases, and latest is its Latest one
		versions: versions.filter((version) => version !== undefined),
		categories: await loadCategories(project),
		overviewIcon: lucideIcon("book-open"),
	};
};
