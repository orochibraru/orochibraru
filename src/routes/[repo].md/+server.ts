import { error } from "@sveltejs/kit";
import { markdownResponse, projectPageDoc } from "$lib/server/documents";

export const GET = ({ params }) => {
	const doc = projectPageDoc(params.repo);
	if (!doc) {
		throw error(404);
	}
	return markdownResponse(doc);
};
