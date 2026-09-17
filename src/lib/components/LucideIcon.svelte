<script lang="ts" module>
	/** A Lucide icon's SVG children, as `lucideIcon()` reads them on the server. */
	export type IconNode = [tag: string, attrs: Record<string, string>][];
</script>

<script lang="ts">
	import type { SVGAttributes } from "svelte/elements";

	// Icons picked by name in a repo's docs/config.json can't be static imports, and
	// importing all of Lucide would ship every icon: the server sends only the ones used.
	let { node, ...rest }: { node: IconNode } & SVGAttributes<SVGSVGElement> = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width="24"
	height="24"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...rest}
>
	{#each node as [tag, attrs], index (index)}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
