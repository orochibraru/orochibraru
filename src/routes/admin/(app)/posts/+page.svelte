<script lang="ts">
	import { resolve } from "$app/paths";
	import { statusClass } from "$lib/admin";

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

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Posts</h1>
	<div class="flex border border-line bg-surface p-0.5 text-[.8125rem]">
		{#each FILTERS as [status, label] (label)}
			<a
				class={[
					"px-2.5 py-0.5 transition-colors",
					data.status === status ? "bg-fg/8 text-fg" : "text-dim hover:text-fg",
				]}
				aria-current={data.status === status ? "page" : undefined}
				href={status ? `${resolve("/admin/posts")}?status=${status}` : resolve("/admin/posts")}
				>{label}</a
			>
		{/each}
	</div>
	<form class="ml-auto" method="POST" action="?/create">
		<button class="abtn abtn-primary" type="submit">New post</button>
	</form>
</div>

<div class="apanel overflow-x-auto">
	<table class="atable">
		<thead>
			<tr>
				<th>Title</th>
				<th>Status</th>
				<th>Slug</th>
				<th class="text-right">Date</th>
			</tr>
		</thead>
		<tbody>
			{#each data.posts as post (post.id)}
				<tr>
					<td class="w-full">
						<a class="row-link" href={resolve("/admin/(app)/posts/[id]", { id: String(post.id) })}>{post.title}</a>
					</td>
					<td><span class={statusClass(post.status)}>{post.status}</span></td>
					<td class="font-mono text-xs text-dim">{post.slug}</td>
					<td class="text-right font-mono text-xs whitespace-nowrap text-dim">{post.date}</td>
				</tr>
			{:else}
				<tr>
					<td class="py-10 text-center text-dim" colspan="4">
						{data.status ? `No ${data.status} posts.` : "No posts yet. Start one with New post."}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
