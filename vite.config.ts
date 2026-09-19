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
	return { plugins: [tailwindcss(), sveltekit()] };
});
