<script lang="ts">
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import Editor from "$lib/components/admin/Editor.svelte";
	import Preview from "$lib/components/admin/Preview.svelte";

	let { data, form } = $props();
	// writable deriveds: edited locally, reset when another post loads
	let body = $derived(data.post.body);
	let status = $derived(data.post.status);
	let previewing = $state(false);
</script>

<svelte:head>
	<title>{data.post.title} | orochibraru admin</title>
</svelte:head>

<form
	method="POST"
	action="?/save"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
	class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
>
	<div class="min-w-0">
		<div class="mb-5 flex items-center gap-3">
			<a class="text-[.9rem] text-dim hover:text-acid" href={resolve("/admin/posts")}>&larr; Posts</a>
			<button class="ml-auto text-[.9rem] text-dim hover:text-acid" type="button" onclick={() => (previewing = !previewing)}>
				{previewing ? "Edit" : "Preview"}
			</button>
		</div>
		{#if previewing}
			<Preview kind="post" markdown={body} />
		{/if}
		<div hidden={previewing}>
			{#key data.post.id}
				<Editor name="body" bind:value={body} />
			{/key}
		</div>
	</div>

	<aside class="admin-form flex flex-col gap-4">
		<label>Title <input name="title" value={data.post.title} required></label>
		<label>Slug <input name="slug" value={data.post.slug} pattern={"[a-z0-9]+(-[a-z0-9]+)*"}></label>
		<label>Date <input name="date" type="date" value={data.post.date}></label>
		<label>
			Description
			<textarea name="description" rows="4">{data.post.description}</textarea>
		</label>
		<label>
			Status
			<select name="status" bind:value={status}>
				<option value="draft">Draft</option>
				<option value="published">Published</option>
			</select>
		</label>
		<button class="btn btn-primary justify-center" type="submit">Save</button>
		{#if form?.message}
			<p class="text-plasma" role="alert">{form.message}</p>
		{:else if form?.saved}
			<p class="text-acid" role="status">Saved.</p>
		{/if}
		{#if data.post.status === "published"}
			<a class="text-[.9rem] text-cyan" href={resolve("/blog/[slug]", { slug: data.post.slug })}
				>View on the site &rarr;</a
			>
		{/if}
		<button
			class="mt-6 text-left text-[.85rem] text-dim hover:text-plasma"
			type="submit"
			formaction="?/delete"
			onclick={(event) => {
				if (!confirm(`Delete “${data.post.title}”? This can't be undone.`)) {
					event.preventDefault();
				}
			}}>Delete this post</button
		>
	</aside>
</form>
