<script lang="ts">
import { resolve } from "$app/paths";

let { width }: { width: string } = $props();
</script>

<footer
	class="mx-auto flex {width} flex-wrap justify-between gap-4 border-t border-line px-6 pt-8 pb-15 text-[12.5px] text-dim"
>
	<span>&copy; orochibraru. Built for homelabs, priced at zero.</span>
	<div class="flex flex-wrap gap-4.5">
		<a class="hover:text-acid" href={resolve("/")}>Home</a>
		<a class="hover:text-acid" href={resolve("/feed.xml")} data-sveltekit-reload>RSS</a>
		<a class="hover:text-acid" href="https://github.com/orochibraru?tab=repositories" rel="noopener"
			>GitHub</a
		>
		<a class="hover:text-acid" href={resolve("/sitemap.xml")} data-sveltekit-reload>Sitemap</a>
		<a class="hover:text-acid" href={resolve("/llms.txt")} data-sveltekit-reload>llms.txt</a>
	</div>
</footer>
