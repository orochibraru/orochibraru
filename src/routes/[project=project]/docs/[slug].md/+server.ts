import { error } from "@sveltejs/kit";
import { guideDoc, markdownResponse } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";

export const prerender = true;

export const entries = () =>
	loadGuides().then((guides) =>
		guides.map((guide) => ({ project: guide.project.key, slug: guide.slug })),
	);

export const GET = async ({ params }) => {
	const guide = (await loadGuides()).find(
		(guide) => guide.project.key === params.project && guide.slug === params.slug,
	);
	if (!guide) error(404);
	return markdownResponse(guideDoc(guide));
};
