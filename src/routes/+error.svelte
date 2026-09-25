<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
</script>

<svelte:head>
	<title>{page.status}: {page.error?.message}</title>
	<meta name="robots" content="noindex">
</svelte:head>

<main class="mx-auto max-w-page px-6">
	<div class="pt-15 pb-22.5">
		<span class="tag">{page.status} &middot; {page.error?.message}</span>
		<h1 class="mt-6.5 text-[clamp(2.6rem,7.5vw,4.4rem)]/[.92] animate-rise stereo font-extrabold tracking-[-.045em]">
			Nothing
			<span class="grad"
				>deployed</span
			>
			here.
		</h1>
		<div class="mt-9 flex flex-wrap gap-3">
			<a class="btn btn-primary" href={resolve("/projects")}>Back to the projects</a>
		</div>
	</div>
</main>
