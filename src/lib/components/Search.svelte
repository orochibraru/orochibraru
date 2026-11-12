<script lang="ts">
	import { tick } from "svelte";
	import { afterNavigate, goto } from "$app/navigation";
	import { page } from "$app/state";

	type Entry = { u: string; t: string; g: string; p: string; r: string; x: string };

	let dialog = $state<HTMLDialogElement>();
	let field = $state<HTMLInputElement>();
	let query = $state("");
	let index = $state<Entry[]>();
	let active = $state(0);

	// "@repo rest" searches only that project; "@" alone, still being typed, picks one
	const projects = $derived(
		new Map((index ?? []).filter((entry) => entry.r).map((entry) => [entry.r, entry.p])),
	);

	const picking = $derived(/^@\S*$/.test(query));
	const scope = $derived(query.match(/^@(\S+)\s/)?.[1]?.toLowerCase());
	const terms = $derived(
		(scope ? query.replace(/^@\S+\s/, "") : query).toLowerCase().split(/\s+/).filter(Boolean),
	);

	const choices = $derived.by(() => {
		if (!picking) {
			return [];
		}
		const typed = query.slice(1).toLowerCase();
		return [...projects].filter(
			([repo, name]) => repo.includes(typed) || name.toLowerCase().includes(typed),
		);
	});

	const results = $derived.by(() => {
		if (!index || picking || (scope && !projects.has(scope))) {
			return [];
		}
		const pool = scope ? index.filter((entry) => entry.r === scope) : index;
		if (!terms.length) {
			// a bare scope lists the project's pages, so there is something to start from
			return scope ? pool.filter((entry) => !entry.u.includes("#")).slice(0, 24) : [];
		}

		const scored: { entry: Entry; score: number }[] = [];
		for (const entry of pool) {
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
			if (score) {
				scored.push({ entry, score });
			}
		}
		return scored
			.sort((a, b) => b.score - a.score)
			.slice(0, 24)
			.map((hit) => hit.entry);
	});

	export async function open() {
		if (!dialog || dialog.open) {
			return;
		}
		dialog.showModal();
		field?.select();
		// on a project's pages the search starts scoped to it, unless the query was already widened
		const here = page.params.repo;
		if (here && (!query || query.startsWith("@"))) {
			choose(here, query.replace(/^@\S*\s?/, ""));
		}
		if (!index) {
			try {
				index = await (await fetch("/search.json")).json();
			} catch {
				index = [];
			}
		}
		// a [repo] route that turned out not to be a project (its 404) leaves the search site-wide
		if (here && !projects.has(here) && query.startsWith(`@${here} `)) {
			query = query.slice(here.length + 2);
		}
	}

	async function choose(repo: string, rest = "") {
		query = `@${repo} ${rest}`;
		await tick();
		field?.focus();
		field?.setSelectionRange(query.length, query.length);
	}

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === "goto") {
			return;
		}

		return dialog?.close();
	});

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			open();
		}
	}

	function onDialogKeydown(event: KeyboardEvent) {
		const count = picking ? choices.length : results.length;
		if (event.key === "ArrowDown" && count) {
			event.preventDefault();
			active = (active + 1) % count;
		} else if (event.key === "ArrowUp" && count) {
			event.preventDefault();
			active = (active - 1 + count) % count;
		} else if (event.key === "Enter") {
			const choice = picking ? choices[active] : undefined;
			const result = picking ? undefined : results[active];
			if (!choice && !result) {
				return;
			}
			event.preventDefault();
			if (choice) {
				choose(choice[0]);
			} else if (result) {
				goto(result.u);
			}
		}
	}

	$effect(() => {
		query;
		active = 0;
	});

	$effect(() => {
		dialog?.querySelectorAll("li > :first-child")[active]?.scrollIntoView({ block: "nearest" });
	});
</script>

<svelte:window onkeydown={onWindowKeydown}></svelte:window>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-label="Search"
	class="pop glass m-0 backdrop-blur-2xl mx-auto mt-[12vh] w-[min(38rem,calc(100vw-2rem))] overflow-hidden rounded-3xl p-0 text-fg"
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
			<circle cx="11" cy="11" r="7"></circle>
			<path d="m20 20-3.5-3.5"></path>
		</svg>
		<input
			bind:this={field}
			bind:value={query}
			type="search"
			autocomplete="off"
			placeholder="Search, or @project to search one"
			class="w-full bg-transparent py-1 text-[.95rem] outline-none placeholder:text-dim"
		/>
		<kbd class="kbd hidden px-1.5 sm:inline-grid">esc</kbd>
	</div>
	<ul class="max-h-[52vh] overflow-y-auto p-2">
		{#each choices as [repo, name], position (repo)}
			<li>
				<button
					type="button"
					class={["block w-full rounded-2xl px-4 py-3 text-left transition-colors", position === active && "bg-fg/6 text-accent"]}
					onclick={() => choose(repo)}
				>
					<span class="block text-[.95rem] font-bold tracking-[-.01em]">{name}</span>
					<span class="mt-0.5 block label">Search only @{repo}</span>
				</button>
			</li>
		{/each}
		{#each results as entry, position (entry.u)}
			<li>
				<a
					class={["block rounded-2xl px-4 py-3 transition-colors", position === active && "bg-fg/6 text-accent"]}
					href={entry.u}
				>
					<span class="block text-[.95rem] font-bold tracking-[-.01em]">{entry.t}</span>
					<span class="mt-0.5 flex min-w-0 items-baseline gap-2">
						<span class="label shrink-0">{entry.g || entry.p}</span>
						<span class="truncate font-mono text-[.75rem] text-dim">{entry.u}</span>
					</span>
					{#if entry.x}
						<span class="mt-1.5 block truncate text-[.85rem] text-dim"
							>{entry.x.slice(0, 120)}</span
						>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
	{#if index && scope && !projects.has(scope)}
		<p
			class="px-4 py-8 text-center text-[.9rem] text-dim"
		>No project is called “{scope}”. Type @ to pick one.</p>
	{:else if query && index && !results.length && !choices.length}
		<p
			class="px-4 py-8 text-center text-[.9rem] text-dim"
		>Nothing matches “{terms.join(" ")}”{scope ? ` in ${projects.get(scope)}` : ""}.</p>
	{/if}
</dialog>
