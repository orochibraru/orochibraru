/**
 * The hand-written pages, in the order a reader should meet them. Project pages
 * live in the database and are listed from there.
 */
export const PAGES = [
	{ path: "/", group: "Start here", priority: "1.0" },
	{ path: "/blog", group: "Start here", priority: "0.9" },
	{ path: "/about", group: "Start here", priority: "0.7" },
	{ path: "/privacy", group: "Start here", priority: "0.3" },
] as const;
