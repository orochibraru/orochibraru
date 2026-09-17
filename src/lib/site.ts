/** The hand-written pages, in the order a reader should meet them. */
export const PAGES = [
	{ path: "/", group: "Start here", priority: "1.0" },
	{ path: "/penombre", group: "Projects", priority: "0.8" },
	{ path: "/homerun", group: "Projects", priority: "0.8" },
	{ path: "/baba", group: "Projects", priority: "0.8" },
	{ path: "/nuvio-web", group: "Projects", priority: "0.8" },
	{ path: "/svelte-smol", group: "Projects", priority: "0.8" },
	{ path: "/dokploy-to-pangolin", group: "Projects", priority: "0.8" },
	{ path: "/blog", group: "Start here", priority: "0.9" },
	{ path: "/about", group: "Start here", priority: "0.7" },
	{ path: "/privacy", group: "Start here", priority: "0.3" },
] as const;

/** A project page's first path segment is also its repository name. */
export const REPOSITORIES = new Set(
	PAGES.filter((page) => page.group === "Projects").map((page) => page.path.slice(1)),
);
