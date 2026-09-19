// Everything renders on request: most pages read the database, and rendering the
// few that don't in-process keeps their Markdown twins from fetching over the network.
export const prerender = false;
export const trailingSlash = "never";
