import { error } from "@sveltejs/kit";
import { markdownResponse, pageDoc } from "$lib/server/documents";
import { PAGES } from "$lib/site";

export const GET = async ({ params, fetch }) => {
	const page = PAGES.find(
		(page) => page.path === (params.page === "index" ? "/" : `/${params.page}`),
	);
	if (!page) {
		throw error(404);
	}
	return markdownResponse(await pageDoc(fetch, page));
};
