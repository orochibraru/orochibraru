import { error } from "@sveltejs/kit";
import { guideDoc, markdownResponse } from "$lib/server/documents";
import { loadGuides } from "$lib/server/guides";

export const GET = async ({ params }) => {
	const guide = (await loadGuides()).find(
		(guide) => guide.project.key === params.repo && guide.slug === params.slug,
	);
	if (!guide) {
		throw error(404);
	}
	return markdownResponse(guideDoc(guide));
};
