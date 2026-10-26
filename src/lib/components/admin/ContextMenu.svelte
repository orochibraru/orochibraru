<script lang="ts">
	import type { Snippet } from "svelte";
	import { swipeToClose } from "$lib/admin";

	// A context menu: a small popover at the pointer on a desktop, a bottom drawer on a
	// phone, where a menu pinned to a fingertip is too small to hit and runs off screen.
	let { title, children }: { title?: string; children: Snippet } = $props();

	let menu = $state<HTMLElement>();
	let at = $state({ x: 0, y: 0 });
	let drawer = $state(false);

	// A manual popover, dismissed here rather than by the browser: a right-click fires
	// contextmenu with the button still down, and the browser's own light dismiss then
	// took the release for a click outside and closed the menu the moment it opened.
	function outside(event: PointerEvent) {
		if (!menu?.contains(event.target as Node)) {
			close();
		}
	}
	function onKey(event: KeyboardEvent) {
		if (event.key === "Escape") {
			close();
		}
	}

	/** Open at a pointer position; a phone ignores it and slides the drawer up. */
	export function open(x: number, y: number) {
		drawer = matchMedia("(width < 48rem)").matches;
		// keep it on screen: the popover is 12rem wide and about 7.5rem tall
		at = { x: Math.min(x, innerWidth - 200), y: Math.min(y, innerHeight - 130) };
		menu?.showPopover();
		addEventListener("pointerdown", outside, true);
		addEventListener("keydown", onKey);
	}

	/** Close it, whichever shape it took. */
	export function close() {
		removeEventListener("pointerdown", outside, true);
		removeEventListener("keydown", onKey);
		if (menu?.matches(":popover-open")) {
			menu.hidePopover();
		}
	}
</script>

<div
	bind:this={menu}
	popover="manual"
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
