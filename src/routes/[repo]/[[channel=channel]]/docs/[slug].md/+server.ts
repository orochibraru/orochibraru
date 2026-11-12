import { error } from "@sveltejs/kit";
import { guideDoc, markdownResponse } from "#lib/server/documents.ts";
import { loadGuides } from "#lib/server/guides.ts";

export const GET = async ({ params }) => {
	const guide = (await loadGuides(params.channel)).find(
		(guide) => guide.project.key === params.repo && guide.slug === params.slug,
	);
	if (!guide) {
		throw error(404);
	}
	return markdownResponse(guideDoc(guide));
};
