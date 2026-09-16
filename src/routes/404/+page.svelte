<script lang="ts">
import { resolve } from "$app/paths";
import Meta from "$lib/components/Meta.svelte";
</script>

<Meta
	title="404: nothing deployed here"
	description="This route does not resolve."
	path="/404"
	twin={false}
	noindex
/>

<main class="mx-auto max-w-page px-6">
	<div class="pt-15 pb-22.5">
		<span class="tag">404 &middot; container not found</span>
		<h1 class="mt-6.5 text-[clamp(2.6rem,9vw,5rem)]/[.92] font-extrabold tracking-[-.045em]">
			Nothing
			<span class="bg-linear-to-r from-acid via-cyan to-plasma bg-clip-text text-transparent"
				>deployed</span
			>
			here.
		</h1>
		<p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">
			This route doesn&rsquo;t resolve. The projects, however, do.
		</p>
		<div class="mt-9 flex flex-wrap gap-3">
			<a class="btn btn-primary" href={resolve("/#projects")}>Back to the projects</a>
		</div>
	</div>
</main>
