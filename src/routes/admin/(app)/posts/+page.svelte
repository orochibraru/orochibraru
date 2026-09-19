<script lang="ts">
	import { resolve } from "$app/paths";

	let { data } = $props();

	const FILTERS = [
		[null, "All"],
		["draft", "Drafts"],
		["published", "Published"],
	] as const;
</script>

<svelte:head>
	<title>Posts | orochibraru admin</title>
</svelte:head>

<div class="mb-8 flex flex-wrap items-center gap-4">
	<h1 class="text-3xl font-extrabold tracking-[-.03em]">Posts</h1>
	<div class="flex gap-3 text-[.9rem]">
		{#each FILTERS as [status, label] (label)}
			<a
				class={[data.status === status ? "text-acid" : "text-dim", "hover:text-acid"]}
				href={status ? `${resolve("/admin/posts")}?status=${status}` : resolve("/admin/posts")}
				>{label}</a
			>
		{/each}
	</div>
	<form class="ml-auto" method="POST" action="?/create">
		<button class="btn btn-primary" type="submit">New post</button>
	</form>
</div>

<div class="grid gap-px border border-line bg-line">
	{#each data.posts as post (post.id)}
		<a
			class="flex items-baseline gap-4 bg-surface px-5 py-4 hover:bg-fg/4"
			href={resolve("/admin/(app)/posts/[id]", { id: String(post.id) })}
		>
			<span class="w-24 shrink-0 font-mono text-[.8rem] text-dim">{post.date}</span>
			<span class="flex-1 font-semibold">{post.title}</span>
			<span class="chip">{post.status}</span>
		</a>
	{:else}
		<p class="bg-surface px-5 py-4 text-dim">Nothing here yet.</p>
	{/each}
</div>
