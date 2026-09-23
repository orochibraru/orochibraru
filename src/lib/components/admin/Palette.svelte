<script lang="ts" module>
	export type Command = { label: string; kind: string; run: () => void };
</script>

<script lang="ts">
	import { Search } from "@lucide/svelte";

	let { commands }: { commands: Command[] } = $props();

	let dialog = $state<HTMLDialogElement>();
	let query = $state("");
	let active = $state(0);

	// every word typed must appear somewhere in the label or its kind
	const matches = $derived.by(() => {
		const words = query.toLowerCase().split(/\s+/).filter(Boolean);
		return commands
			.filter((command) => {
				const haystack = `${command.label} ${command.kind}`.toLowerCase();
				return words.every((word) => haystack.includes(word));
			})
			.slice(0, 40);
	});

	export function open() {
		query = "";
		active = 0;
		dialog?.showModal();
	}

	function choose(command: Command | undefined) {
		if (!command) {
			return;
		}
		dialog?.close();
		command.run();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			if (dialog?.open) {
				dialog.close();
			} else {
				open();
			}
		}
	}

	function onInputKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			active = (active + 1) % Math.max(matches.length, 1);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			active = (active - 1 + matches.length) % Math.max(matches.length, 1);
		} else if (event.key === "Enter") {
			event.preventDefault();
			choose(matches[active]);
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- a modal <dialog> already traps focus, closes on Escape and draws the backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-label="Jump to"
	class="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] max-w-none border border-edge bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40"
	onclick={(event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	}}
>
	<label class="flex h-12 items-center gap-3 border-b border-line px-4">
		<Search class="size-4 shrink-0 text-dim" aria-hidden="true" />
		<input
			class="w-full bg-transparent text-[.9375rem] outline-none placeholder:text-dim"
			placeholder="Jump to a page, post or project"
			aria-label="Jump to"
			bind:value={query}
			oninput={() => (active = 0)}
			onkeydown={onInputKeydown}
		>
	</label>
	<ul class="max-h-[min(24rem,60dvh)] overflow-y-auto p-1.5" role="listbox" aria-label="Results">
		{#each matches as command, index (`${command.kind}:${command.label}:${index}`)}
			<li role="option" aria-selected={index === active}>
				<button
					type="button"
					class={[
						"flex w-full items-center gap-3 px-2.5 py-2 text-left text-sm",
						index === active && "bg-fg/6",
					]}
					onmousemove={() => (active = index)}
					onclick={() => choose(command)}
				>
					<span class="flex-1 truncate">{command.label}</span>
					<span class="text-xs text-dim">{command.kind}</span>
				</button>
			</li>
		{:else}
			<li class="px-2.5 py-6 text-center text-sm text-dim">Nothing matches “{query}”.</li>
		{/each}
	</ul>
	<p class="flex gap-4 border-t border-line px-4 py-2 text-xs text-dim">
		<span><span class="kbd">↑</span> <span class="kbd">↓</span> to move</span>
		<span><span class="kbd">↵</span> to open</span>
		<span><span class="kbd">esc</span> to close</span>
	</p>
</dialog>
