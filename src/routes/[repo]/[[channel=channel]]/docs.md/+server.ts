import { error } from "@sveltejs/kit";
import { markdownResponse, projectDoc } from "#lib/server/documents.ts";
import { loadDocProjects, loadGuides } from "#lib/server/guides.ts";

export const GET = async ({ params }) => {
	const project = (await loadDocProjects(params.channel)).find(
		(project) => project.key === params.repo,
	);
	if (!project) {
		throw error(404);
	}
	return markdownResponse(projectDoc(project, await loadGuides(params.channel)));
};
