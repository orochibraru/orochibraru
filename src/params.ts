import { defineParams } from "@sveltejs/kit/params";
import { CHANNELS, type Channel } from "#lib/projects.ts";
import { PAGES } from "#lib/site.ts";

/** Latest has no segment of its own: /<key>/docs is the released docs. */
const matchChannel = (param: string): param is Exclude<Channel, "latest"> =>
	param !== "latest" && CHANNELS.some((channel) => channel === param);

const matchPage = (param: string) =>
	PAGES.some((page) => page.path === (param === "index" ? "/" : `/${param}`));

export const params = defineParams({
	channel: (param) => (matchChannel(param) ? param : undefined),
	page: (param) => (matchPage(param) ? param : undefined),
});
