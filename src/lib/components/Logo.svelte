<script lang="ts">
	import type { HTMLImgAttributes } from "svelte/elements";
	import mark from "#lib/assets/mark.webp";

	let { class: className, ...rest }: HTMLImgAttributes = $props();
</script>

<img src={mark} alt="" width="28" height="28" class={className} {...rest} />
