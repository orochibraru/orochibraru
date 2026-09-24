<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	// The mark: a serpent biting its own tail (orochi is a snake), crimson to gold like
	// the stereo channels. `mono` draws it in currentColor, for filled badges.
	// static/favicon.svg is the same drawing, kept in sync by hand.
	let { mono = false, ...rest }: { mono?: boolean } & SVGAttributes<SVGSVGElement> = $props();

	const id = $props.id();
	const stroke = $derived(mono ? "currentColor" : `url(#${id}-ring)`);
	const head = $derived(mono ? "currentColor" : "var(--color-cool)");
</script>

<svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...rest}>
	<defs>
		{#if !mono}
			<linearGradient id="{id}-ring" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
				<stop style="stop-color: var(--color-hot)" />
				<stop offset="1" style="stop-color: var(--color-cool)" />
			</linearGradient>
		{/if}
		<!-- the eye is a hole, so it shows whatever the mark sits on -->
		<mask id="{id}-eye">
			<rect width="32" height="32" fill="#fff" />
			<circle cx="26.46" cy="11.83" r="0.9" fill="#000" />
		</mask>
	</defs>
	<!-- tail, thinner, then the body, then the head closing on the tail -->
	<path d="M22.16 8.12A10 10 0 0 0 13.41 6.34" stroke={stroke} stroke-width="2.2" stroke-linecap="round" />
	<path d="M13.41 6.34A10 10 0 1 0 25.78 13.92" stroke={stroke} stroke-width="4.5" stroke-linecap="round" />
	<circle cx="25.57" cy="12.94" r="3.4" fill={head} mask="url(#{id}-eye)" />
</svg>
