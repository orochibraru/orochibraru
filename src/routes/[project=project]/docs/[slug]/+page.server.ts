import { error } from "@sveltejs/kit";
import { loadGuides } from "$lib/server/guides";

export const entries = () =>
	loadGuides().then((guides) =>
		guides.map((guide) => ({ project: guide.project.key, slug: guide.slug })),
	);

export const load = async ({ params }) => {
	const guide = (await loadGuides()).find(
		(guide) => guide.project.key === params.project && guide.slug === params.slug,
	);
	if (!guide) {
		throw error(404);
	}
	return {
		slug: guide.slug,
		title: guide.title,
		html: guide.html,
		source: guide.source,
		contents: guide.sections
			.filter((section) => section.id && section.level <= 3)
			.map(({ id, heading, level }) => ({ id, heading, level })),
	};
};
