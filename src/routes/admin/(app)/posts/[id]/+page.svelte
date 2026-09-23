<script lang="ts">
	import { ArrowLeft, Eye, PenLine } from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { syncScroll } from "$lib/admin";
	import Editor from "$lib/components/admin/Editor.svelte";
	import Preview from "$lib/components/admin/Preview.svelte";

	let { data, form } = $props();
	// writable deriveds: edited locally, reset when another post loads
	let body = $derived(data.post.body);
	let status = $derived(data.post.status);
	let previewing = $state(false);
	let saving = $state(false);
</script>

<svelte:head>
	<title>{data.post.title} | orochibraru admin</title>
</svelte:head>

<form
	data-save
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<div
		class="sticky top-11 z-10 -mx-4 mb-8 flex h-12 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur sm:-mx-8 sm:px-8"
	>
		<a
			class="flex items-center gap-1.5 text-[.8125rem] text-dim hover:text-fg"
			href={resolve("/admin/posts")}
		>
			<ArrowLeft class="size-3.5" aria-hidden="true" /> Posts
		</a>
		<div class="ml-auto flex border border-line bg-surface p-0.5 text-[.8125rem]" role="radiogroup" aria-label="Status">
			{#each ["draft", "published"] as const as option (option)}
				<label
					class={[
						"cursor-pointer px-2.5 py-0.5 capitalize transition-colors has-focus-visible:outline-2 has-focus-visible:outline-acid",
						status === option ? "bg-fg/8 text-fg" : "text-dim hover:text-fg",
					]}
				>
					<input class="sr-only" type="radio" name="status" value={option} bind:group={status}>
					{option}
				</label>
			{/each}
		</div>
		<button class="abtn 2xl:hidden" type="button" onclick={() => (previewing = !previewing)}>
			{#if previewing}
				<PenLine class="size-3.5" aria-hidden="true" /> Edit
			{:else}
				<Eye class="size-3.5" aria-hidden="true" /> Preview
			{/if}
		</button>
		<button class="abtn abtn-primary" type="submit" disabled={saving}>
			{saving ? "Saving…" : "Save"}<span class="kbd border-onneon/30 text-onneon/70">⌘S</span>
		</button>
	</div>

	<div>
		{#if form?.message}
			<p class="mb-6 border border-plasma/40 bg-plasma/8 px-3 py-2 text-sm text-plasma" role="alert">{form.message}</p>
		{/if}

		<input
			class="w-full bg-transparent text-[clamp(1.75rem,4vw,2.5rem)]/tight font-bold tracking-[-.02em] outline-none placeholder:text-dim"
			name="title"
			value={data.post.title}
			placeholder="Title"
			aria-label="Title"
			required
		>

		<dl class="mt-5 mb-8 grid max-w-5xl grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-1 border-y border-line py-3 text-sm">
			<dt class="text-dim"><label for="slug">Slug</label></dt>
			<dd class="flex items-center gap-2">
				<input id="slug" class="field border-transparent bg-transparent hover:border-line focus:border-acid font-mono text-[.8125rem]" name="slug" value={data.post.slug} pattern={"[a-z0-9]+(-[a-z0-9]+)*"}>
				{#if data.post.status === "published"}
					<a
						class="shrink-0 text-xs text-cyan hover:underline"
						href={resolve("/blog/[slug]", { slug: data.post.slug })}
						target="_blank">Open</a
					>
				{/if}
			</dd>
			<dt class="text-dim"><label for="date">Date</label></dt>
			<dd><input id="date" class="field w-auto border-transparent bg-transparent hover:border-line focus:border-acid" name="date" type="date" value={data.post.date}></dd>
			<dt class="self-start pt-1.5 text-dim"><label for="description">Description</label></dt>
			<dd>
				<textarea
					id="description"
					class="field field-sizing-content resize-none border-transparent bg-transparent hover:border-line focus:border-acid"
					name="description"
					rows="1"
					placeholder="One or two sentences for the blog index and link previews">{data.post.description}</textarea
				>
			</dd>
		</dl>

		<!-- wide screens show the editor and the real render side by side -->
		<div class="2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-8" {@attach syncScroll}>
			<div class={previewing ? "hidden 2xl:block" : undefined}>
				{#key data.post.id}
					<Editor name="body" bind:value={body} />
				{/key}
			</div>
			<div data-preview class={[!previewing && "hidden 2xl:block", "2xl:sticky 2xl:top-26 2xl:max-h-[calc(100dvh-7.5rem)] 2xl:overflow-y-auto 2xl:border-l 2xl:border-line 2xl:pl-8"]}>
				<Preview kind="post" markdown={body} />
			</div>
		</div>

		<div class="mt-16 flex items-center gap-3 border-t border-line pt-4 text-sm text-dim">
			<span>Deleting a post can't be undone.</span>
			<button
				class="abtn abtn-danger ml-auto"
				type="submit"
				formaction="?/delete"
				onclick={(event) => {
					if (!confirm(`Delete “${data.post.title}”? This can't be undone.`)) {
						event.preventDefault();
					}
				}}>Delete post</button
			>
		</div>
	</div>
</form>
