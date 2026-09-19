import { highlightCode } from "$lib/server/highlight";

const CONFIG = `// svelte.config.js
import adapter from "@orochibraru/svelte-smol";

export default {
  kit: { adapter: adapter() },
};`;

export const load = async () => ({
	install: await highlightCode("bun add -d @orochibraru/svelte-smol", "bash"),
	config: await highlightCode(CONFIG, "javascript"),
});
