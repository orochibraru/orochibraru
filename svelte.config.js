import adapter from "@orochibraru/svelte-smol";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ precompress: true }),
		alias: { $docs: "src/docs" },
		// SvelteKit's own check can't exempt a route, and the OAuth token and
		// registration endpoints take cross-origin form posts from MCP clients' servers.
		// hooks.server.ts runs the same check with those endpoints left out.
		csrf: { trustedOrigins: ["*"] },
		paths: { relative: false },
		typescript: {
			config: (tsconfig) => {
				tsconfig.include.push("../scripts/**/*.ts", "../tests/**/*.ts");
			},
		},
	},
};

export default config;
