<script lang="ts">
	import { Ellipsis } from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { statusClass } from "$lib/admin";
	import Confirm from "$lib/components/admin/Confirm.svelte";

	let { data } = $props();

	type Row = (typeof data.posts)[number];

	// one menu for the whole table, opened by a row's ⋯ button or a right-click on the row
	let menu = $state<HTMLElement>();
	let target = $state<Row>();
	let at = $state({ x: 0, y: 0 });
	let confirmer = $state<Confirm>();

	function open(post: Row, x: number, y: number) {
		target = post;
		// keep it on screen: the menu is 12rem wide and about 7.5rem tall
		at = { x: Math.min(x, innerWidth - 200), y: Math.min(y, innerHeight - 130) };
		menu?.showPopover();
	}

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
				<th><span class="sr-only">Actions</span></th>
			</tr>
		</thead>
		<tbody>
			{#each data.posts as post (post.id)}
				<tr
					oncontextmenu={(event) => {
						event.preventDefault();
						open(post, event.clientX, event.clientY);
					}}
				>
					<td class="w-full">
						<a class="row-link" href={resolve("/admin/(app)/posts/[id]", { id: String(post.id) })}>{post.title}</a>
					</td>
					<td><span class={statusClass(post.status)}>{post.status}</span></td>
					<td class="font-mono text-xs text-dim">{post.slug}</td>
					<td class="text-right font-mono text-xs whitespace-nowrap text-dim">{post.date}</td>
					<td class="py-0 pl-0">
						<!-- above the row link's overlay -->
						<button
							class="relative z-1 grid size-7 place-items-center rounded-md text-dim transition-colors hover:bg-fg/8 hover:text-fg"
							type="button"
							aria-label="Actions for {post.title}"
							aria-haspopup="menu"
							onclick={(event) => {
								const box = event.currentTarget.getBoundingClientRect();
								open(post, box.right - 192, box.bottom + 4);
							}}><Ellipsis size={16} /></button
						>
					</td>
				</tr>
			{:else}
				<tr>
					<td class="py-10 text-center text-dim" colspan="5">
						{data.status ? `No ${data.status} posts.` : "No posts yet. Start one with New post."}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<div
	bind:this={menu}
	popover
	role="menu"
	class="inset-auto m-0 w-48 rounded-lg border border-edge bg-surface p-1 text-[13px] text-fg shadow-2xl"
	style:left="{at.x}px"
	style:top="{at.y}px"
>
	{#if target}
		{@const post = target}
		<form
			method="POST"
			use:enhance={() => {
				menu?.hidePopover();
			}}
		>
			<input type="hidden" name="id" value={post.id} />
			<a class="menu-item" role="menuitem" href={resolve("/admin/(app)/posts/[id]", { id: String(post.id) })}>Edit</a>
			{#if post.status === "published"}
				<a class="menu-item" role="menuitem" href={resolve("/blog/[slug]", { slug: post.slug })} target="_blank" rel="noreferrer">View on site</a>
				<button class="menu-item" role="menuitem" formaction="?/unpublish">Unpublish</button>
			{:else}
				<button class="menu-item" role="menuitem" formaction="?/publish">Publish</button>
			{/if}
			<button
				class="menu-item text-hot"
				role="menuitem"
				formaction="?/delete"
				onclick={(event) => {
					menu?.hidePopover();
					confirmer?.guard(event, {
						title: `Delete “${post.title}”?`,
						body: "This can't be undone. Its URL will redirect to the blog.",
						action: "Delete post",
					});
				}}>Delete</button
			>
		</form>
	{/if}
</div>

<Confirm bind:this={confirmer} />
