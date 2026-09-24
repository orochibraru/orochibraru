<script lang="ts">
	import { X } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import { afterNavigate } from "$app/navigation";

	let { label, side, children }: { label: string; side: "left" | "right"; children: Snippet } =
		$props();

	let dialog = $state<HTMLDialogElement>();

	export function open() {
		dialog?.showModal();
	}

	// the drawer is all links: once one is followed, the new page is what you want to see
	afterNavigate(() => dialog?.close());
</script>

<!-- a modal <dialog> already traps focus, closes on Escape and draws the backdrop -->
<dialog
	bind:this={dialog}
	aria-label={label}
	class={[
		"drawer inset-y-0 m-0 h-dvh overflow-hidden max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none flex-col border-line p-0 text-fg open:flex",
		side === "left"
			? "right-auto left-0 rounded-r-3xl border-r [--drawer-from:-100%]"
			: "right-0 left-auto rounded-l-3xl border-l [--drawer-from:100%]",
	]}
	onclick={(event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	}}
>
	<div class="flex h-16 shrink-0 items-center justify-between border-b border-line pr-3 pl-5">
		<span class="label">{label}</span>
		<button
			type="button"
			aria-label="Close {label.toLowerCase()}"
			class="grid size-9 place-items-center rounded-full border border-edge transition hover:border-accent hover:text-accent"
			onclick={() => dialog?.close()}
		>
			<X class="size-4" aria-hidden="true" />
		</button>
	</div>
	<!-- fills the height, so a tap on empty space below the links doesn't count as the backdrop -->
	<div class="flex flex-1 flex-col overflow-y-auto">
		{@render children()}
	</div>
</dialog>
