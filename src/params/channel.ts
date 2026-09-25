import { CHANNELS, type Channel } from "$lib/projects";

/** Latest has no segment of its own: /<key>/docs is the released docs. */
export const match = (param: string): param is Exclude<Channel, "latest"> =>
	param !== "latest" && CHANNELS.some((channel) => channel === param);
