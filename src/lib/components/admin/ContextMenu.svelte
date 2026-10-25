<script lang="ts">
	import type { Snippet } from "svelte";
	import { swipeToClose } from "$lib/admin";

	// A context menu: a small popover at the pointer on a desktop, a bottom drawer on a
	// phone, where a menu pinned to a fingertip is too small to hit and runs off screen.
	let { title, children }: { title?: string; children: Snippet } = $props();

	let menu = $state<HTMLElement>();
	let at = $state({ x: 0, y: 0 });
	let drawer = $state(false);

	/** Open at a pointer position; a phone ignores it and slides the drawer up. */
	export function open(x: number, y: number) {
		drawer = matchMedia("(width < 48rem)").matches;
		// keep it on screen: the popover is 12rem wide and about 7.5rem tall
		at = { x: Math.min(x, innerWidth - 200), y: Math.min(y, innerHeight - 130) };
		menu?.showPopover();
	}

	/** Close it, whichever shape it took. */
	export function close() {
		menu?.hidePopover();
	}
</script>

<div
	bind:this={menu}
	popover
	role="menu"
	aria-label={title}
	class={drawer
		? "drawer"
		: "inset-auto m-0 w-48 rounded-lg border border-edge bg-surface p-1 text-[13px] text-fg shadow-2xl"}
	style:left={drawer ? undefined : `${at.x}px`}
	style:top={drawer ? undefined : `${at.y}px`}
	{@attach (node) => swipeToClose(node, close)}
>
	{#if drawer}
		<div class="drawer-handle" aria-hidden="true"></div>
		{#if title}
			<p class="mb-3 truncate px-1 text-center text-sm text-dim">{title}</p>
		{/if}
		<div class="drawer-group">{@render children()}</div>
		<div class="drawer-group mt-3">
			<button type="button" class="justify-center font-semibold" onclick={close}>Cancel</button>
		</div>
	{:else}
		{@render children()}
	{/if}
</div>
