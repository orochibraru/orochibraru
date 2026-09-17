import { highlightCode } from "$lib/server/highlight";

export const load = async () => ({
	install: await highlightCode("bun add -d @orochibraru/svelte-smol", "bash"),
});
