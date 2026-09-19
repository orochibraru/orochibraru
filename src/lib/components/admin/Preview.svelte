<script lang="ts">
	import { copyButtons } from "$lib/copy";

	let { kind, markdown, repo }: { kind: "post" | "project"; markdown: string; repo?: string } =
		$props();

	// Rendered by the server's own renderer, so a draft looks exactly as it will.
	let rendered = $state<{ html: string; lede?: string } | { error: string }>({ html: "" });

	$effect(() => {
		const body = JSON.stringify({ kind, markdown, repo });
		const controller = new AbortController();
		fetch("/admin/preview", { method: "POST", body, signal: controller.signal })
			.then(async (response) => (response.ok ? response.json() : { error: await response.text() }))
			.then((result) => {
				rendered = result;
			})
			.catch(() => {});
		return () => controller.abort();
	});
</script>

{#if "error" in rendered}
	<p class="text-plasma" role="alert">{rendered.error}</p>
{:else if kind === "post"}
	<div class="md" {@attach copyButtons}>{@html rendered.html}</div>
{:else}
	<article class="prose project" {@attach copyButtons}>
		{#if rendered.lede}
			<p class="mb-10 max-w-[72ch] text-[1.15rem] text-dim">{@html rendered.lede}</p>
		{/if}
		{@html rendered.html}
	</article>
{/if}
