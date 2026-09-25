import { error } from "@sveltejs/kit";
import { loadGuides } from "$lib/server/guides";

export const load = async ({ params }) => {
	const guide = (await loadGuides(params.channel)).find(
		(guide) => guide.project.key === params.repo && guide.slug === params.slug,
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
