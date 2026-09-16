<script lang="ts">
	import { afterNavigate, goto } from "$app/navigation";

	type Entry = { u: string; t: string; g: string; p: string; x: string };

	let dialog = $state<HTMLDialogElement>();
	let field = $state<HTMLInputElement>();
	let query = $state("");
	let index = $state<Entry[]>();
	let active = $state(0);

	const results = $derived.by(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		if (!index || !terms.length) return [];

		const scored: { entry: Entry; score: number }[] = [];
		for (const entry of index) {
			const heading = entry.t.toLowerCase();
			const context = entry.g.toLowerCase();
			const body = entry.x.toLowerCase();

			let score = 0;
			for (const term of terms) {
				const hit = heading.includes(term)
					? 8
					: context.includes(term)
						? 4
						: body.includes(term)
							? 2
							: 0;
				if (!hit) {
					score = 0;
					break;
				}
				score += hit + (heading.startsWith(term) ? 3 : 0);
			}
			if (score) scored.push({ entry, score });
		}
		return scored
			.sort((a, b) => b.score - a.score)
			.slice(0, 24)
			.map((hit) => hit.entry);
	});

	export async function open() {
		if (!dialog || dialog.open) return;
		dialog.showModal();
		field?.select();
		if (!index) {
			try {
				index = await (await fetch("/search.json")).json();
			} catch {
				index = [];
			}
		}
	}

	afterNavigate(() => dialog?.close());

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			open();
		}
	}

	function onDialogKeydown(event: KeyboardEvent) {
		const count = results.length;
		if (event.key === "ArrowDown" && count) {
			event.preventDefault();
			active = (active + 1) % count;
		} else if (event.key === "ArrowUp" && count) {
			event.preventDefault();
			active = (active - 1 + count) % count;
		} else if (event.key === "Enter") {
			const result = results[active];
			if (!result) return;
			event.preventDefault();
			goto(result.u);
		}
	}

	$effect(() => {
		query;
		active = 0;
	});

	$effect(() => {
		dialog?.querySelectorAll("a")[active]?.scrollIntoView({ block: "nearest" });
	});
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-label="Search"
	class="m-0 mx-auto mt-[12vh] w-[min(38rem,calc(100vw-2rem))] border border-edge bg-surface p-0 text-fg backdrop:bg-black/50"
	onkeydown={onDialogKeydown}
	onclick={(event) => event.target === dialog && dialog.close()}
>
	<div class="flex items-center gap-3 border-b border-line px-4 py-3">
		<svg
			viewBox="0 0 24 24"
			class="size-4 shrink-0 text-dim"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
		<input
			bind:this={field}
			bind:value={query}
			type="search"
			autocomplete="off"
			placeholder="Search the guides"
			class="w-full bg-transparent py-1 text-[.95rem] outline-none placeholder:text-dim"
		>
		<kbd class="hidden text-[11px] text-edge sm:block">esc</kbd>
	</div>
	<ul class="max-h-[52vh] divide-y divide-line overflow-y-auto">
		{#each results as entry, position (entry.u)}
			<li>
				<a class={["block px-4 py-3", position === active && "bg-fg/5 text-acid"]} href={entry.u}>
					<span class="block text-[.95rem] font-bold tracking-[-.01em]">{entry.t}</span>
					<span class="mt-0.5 block text-[11px] tracking-[.14em] text-plasma uppercase"
						>{entry.g || entry.p}</span
					>
					{#if entry.x}
						<span class="mt-1.5 block truncate text-[.85rem] text-dim"
							>{entry.x.slice(0, 120)}</span
						>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
	{#if query && index && !results.length}
		<p class="px-4 py-8 text-center text-[.9rem] text-dim">
			Nothing matches &ldquo;{query}&rdquo;.
		</p>
	{/if}
</dialog>
