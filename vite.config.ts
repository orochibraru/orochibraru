import adapter from "@sveltejs/adapter-bun";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
	// The server reads process.env (so scripts and tests see what it sees), and a
	// dev server started through `bun run` doesn't reliably inherit .env: load it
	// here. Real environment variables still win. Builds read the runtime env.
	if (command === "serve") {
		for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
			process.env[key] ??= value;
		}
	}

	return {
		plugins: [
			enhancedImages(),
			tailwindcss(),
			sveltekit({
				// one executable with the client assets embedded (precompress is ignored then)
				adapter: adapter({ buildOptions: { compile: true } }),
				// SvelteKit's own check can't exempt a route, and the OAuth token and
				// registration endpoints take cross-origin form posts from MCP clients' servers.
				// hooks.server.ts runs the same check with those endpoints left out.
				csrf: { trustedOrigins: ["*"] },
				paths: { relative: false },
				// the service worker is the admin's alone: the admin layout registers it under
				// /admin, so the public site never installs one
				serviceWorker: { register: false },
			}),
		],
	};
});
