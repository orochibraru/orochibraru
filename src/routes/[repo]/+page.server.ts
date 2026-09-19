import { error } from "@sveltejs/kit";
import { getProjectPage } from "$lib/server/content";

export const load = async ({ params }) => {
	const page = getProjectPage(params.repo);
	if (!page) {
		throw error(404);
	}
	return await page;
};
