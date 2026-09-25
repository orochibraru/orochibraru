<script lang="ts">
	import { Asterisk, Check, ChevronDown, Copy, FileText } from "@lucide/svelte";
	import { mdPath, SITE } from "$lib/seo";

	// What a docs page offers an LLM: its Markdown twin, copied, opened, or handed to Claude.
	let { path }: { path: string } = $props();
	const markdown = $derived(mdPath(path));
	const claude = $derived(
		`https://claude.ai/new?q=${encodeURIComponent(`Read ${SITE}${markdown} so I can ask questions about it.`)}`,
	);

	let open = $state(false);
	let copied = $state(false);
	let root = $state<HTMLElement>();

	async function copy() {
		open = false;
		// a promise inside the ClipboardItem, not an await before it: Safari drops the
		// click's permission to write by the time a fetch comes back
		const text = fetch(markdown)
			.then((response) => response.text())
			.then((body) => new Blob([body], { type: "text/plain" }));
		await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 1500);
	}

	const item =
		"flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-fg/4";
</script>

<svelte:window
	onclick={(event) => {
		if (open && !root?.contains(event.target as Node)) {
			open = false;
		}
	}}
	onkeydown={(event) => {
		if (event.key === "Escape") {
			open = false;
		}
	}}
/>

{#snippet label(title: string, hint: string)}
	<span
		><span class="block font-medium text-fg">{title}</span><span class="block text-xs text-dim"
			>{hint}</span
		></span
	>
{/snippet}

<div class="relative flex shrink-0 font-sans text-[.85rem]" bind:this={root}>
	<button
		class="flex items-center gap-2 rounded-l-full border border-line bg-bg py-1.5 pr-3 pl-3.5 text-fg/80 transition hover:border-edge hover:text-fg"
		onclick={copy}
	>
		{#if copied}
			<Check class="size-3.5 text-accent" aria-hidden="true" /> Copied
		{:else}
			<Copy class="size-3.5" aria-hidden="true" /> Copy page
		{/if}
	</button>
	<button
		class="-ml-px rounded-r-full border border-line bg-bg px-2.5 text-fg/80 transition hover:border-edge hover:text-fg"
		aria-label="More ways to read this page"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<ChevronDown class={["size-3.5 transition-transform", open && "rotate-180"]} aria-hidden="true" />
	</button>
	{#if open}
		<div
			class="glass absolute top-full right-0 z-20 mt-2 grid w-72 gap-0.5 rounded-2xl p-1.5 backdrop-blur-2xl"
		>
			<button class={item} onclick={copy}>
				<Copy class="mt-0.5 size-4 shrink-0 text-dim" aria-hidden="true" />
				{@render label("Copy page", "Markdown, ready to paste into an LLM")}
			</button>
			<a class={item} href={markdown} target="_blank" rel="noopener" onclick={() => (open = false)}>
				<FileText class="mt-0.5 size-4 shrink-0 text-dim" aria-hidden="true" />
				{@render label("View as Markdown", "This page as plain text")}
			</a>
			<a class={item} href={claude} target="_blank" rel="noopener" onclick={() => (open = false)}>
				<Asterisk class="mt-0.5 size-4 shrink-0 text-dim" aria-hidden="true" />
				{@render label("Open in Claude ↗", "Ask Claude about this page")}
			</a>
		</div>
	{/if}
</div>
