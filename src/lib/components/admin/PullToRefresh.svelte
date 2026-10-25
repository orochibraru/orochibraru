<script lang="ts">
	import { RefreshCw } from "@lucide/svelte";
	import { invalidateAll } from "$app/navigation";

	// Drag down from the top of a list page to reload it, as a phone app does. Only
	// on touch screens, and only where `enabled`: on an editor, reloading the page's
	// data would throw away unsaved edits.
	let { enabled }: { enabled: boolean } = $props();

	const THRESHOLD = 72;
	let pull = $state(0);
	let refreshing = $state(false);
	let start: number | undefined;

	function down(event: TouchEvent) {
		start =
			enabled && !refreshing && scrollY <= 0 && event.touches.length === 1
				? event.touches[0]?.clientY
				: undefined;
	}

	function move(event: TouchEvent) {
		const y = event.touches[0]?.clientY;
		if (start === undefined || y === undefined) {
			return;
		}
		// past the threshold the pull stiffens, like iOS's rubber band
		const distance = Math.max(0, y - start);
		pull = distance < THRESHOLD ? distance : THRESHOLD + (distance - THRESHOLD) * 0.3;
	}

	async function up() {
		if (start === undefined) {
			return;
		}
		start = undefined;
		if (pull < THRESHOLD) {
			pull = 0;
			return;
		}
		refreshing = true;
		pull = THRESHOLD;
		navigator.vibrate?.(8);
		await invalidateAll().finally(() => {
			refreshing = false;
			pull = 0;
		});
	}
</script>

<svelte:window
	ontouchstart={down}
	ontouchmove={move}
	ontouchend={up}
	ontouchcancel={up}
/>

{#if pull > 0 || refreshing}
	<div
		class="pointer-events-none fixed inset-x-0 z-10 flex justify-center md:hidden"
		style:top="calc(3.25rem + env(safe-area-inset-top))"
		style:transform="translateY({pull / 2}px)"
		style:opacity={Math.min(1, pull / THRESHOLD)}
		role="status"
		aria-label={refreshing ? "Refreshing" : undefined}
	>
		<span class="grid size-9 place-items-center rounded-full border border-line bg-surface shadow-lg">
			<RefreshCw
				class={["size-4 text-spark", refreshing && "animate-spin"]}
				style={refreshing ? undefined : `transform: rotate(${(pull / THRESHOLD) * 270}deg)`}
				aria-hidden="true"
			/>
		</span>
	</div>
{/if}
