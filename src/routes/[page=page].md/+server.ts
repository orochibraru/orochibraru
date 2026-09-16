import { error } from "@sveltejs/kit";
import { markdownResponse, pageDoc } from "$lib/server/documents";
import { PAGES } from "$lib/site";

export const prerender = true;

export const entries = () =>
	PAGES.map((page) => ({ page: page.path === "/" ? "index" : page.path.slice(1) }));

export const GET = async ({ params, fetch }) => {
	const page = PAGES.find(
		(page) => page.path === (params.page === "index" ? "/" : `/${params.page}`),
	);
	if (!page) error(404);
	return markdownResponse(await pageDoc(fetch, page));
};
