import { PAGES } from "$lib/site";

export const match = (param: string) =>
	PAGES.some((page) => page.path === (param === "index" ? "/" : `/${param}`));
