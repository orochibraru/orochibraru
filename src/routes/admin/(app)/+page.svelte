<script lang="ts">
	import { resolve } from "$app/paths";

	let { data } = $props();
</script>

<svelte:head>
	<title>Overview | orochibraru admin</title>
</svelte:head>

<div class="grid gap-10 lg:grid-cols-3">
	<section>
		<h2 class="mb-4 text-xl font-bold tracking-[-.02em]">Recent posts</h2>
		{#each data.posts as item (item.id)}
			<a class="block py-1.5 hover:text-acid" href={resolve("/admin/(app)/posts/[id]", { id: String(item.id) })}>
				{item.title} <span class="chip ml-1.5">{item.status}</span>
			</a>
		{:else}
			<p class="text-dim">
				No posts yet. <a class="text-cyan" href={resolve("/admin/posts")}>Write one</a>.
			</p>
		{/each}
	</section>
	<section>
		<h2 class="mb-4 text-xl font-bold tracking-[-.02em]">Projects</h2>
		{#each data.projects as item (item.repo)}
			<a class="block py-1.5 hover:text-acid" href={resolve("/admin/(app)/projects/[repo]", { repo: item.repo })}>
				{item.name}
				{#if !item.published}<span class="chip ml-1.5">draft</span>{/if}
			</a>
		{:else}
			<p class="text-dim">No projects yet.</p>
		{/each}
	</section>
	<section>
		<h2 class="mb-4 text-xl font-bold tracking-[-.02em]">Docs sync</h2>
		{#each data.runs as run (run.id)}
			<p class="py-1.5 text-[.9rem]">
				<span class="chip mr-1.5">{run.status}</span>{run.repo}
				<span class="text-dim">{run.sha?.slice(0, 7) ?? ""}</span>
				{#if run.error}<span class="block text-plasma">{run.error}</span>{/if}
			</p>
		{:else}
			<p class="text-dim">No syncs yet.</p>
		{/each}
	</section>
</div>
