<script lang="ts">
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import Editor from "$lib/components/admin/Editor.svelte";
	import Preview from "$lib/components/admin/Preview.svelte";

	let { data, form } = $props();

	const TABS = ["Page", "Card", "SEO", "Buttons", "Docs"] as const;
	let tab = $state<(typeof TABS)[number]>("Page");
	let previewing = $state(false);

	// writable deriveds: edited here, reset whenever another project loads
	let body = $derived(data.project.body);
	let buttons = $derived(data.project.buttons.map((button) => ({ ...button })));
</script>

<svelte:head>
	<title>{data.project.name} | orochibraru admin</title>
</svelte:head>

<form
	method="POST"
	action="?/save"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	<div class="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
		<a class="text-[.9rem] text-dim hover:text-acid" href={resolve("/admin/projects")}>&larr; Projects</a>
		<h1 class="text-3xl font-extrabold tracking-[-.03em]">{data.project.name}</h1>
		<div class="flex gap-4 text-[.9rem]" role="tablist">
			{#each TABS as name (name)}
				<button
					type="button"
					role="tab"
					aria-selected={tab === name}
					class={[tab === name ? "text-acid" : "text-dim", "hover:text-acid"]}
					onclick={() => (tab = name)}>{name}</button
				>
			{/each}
		</div>
		<label class="ml-auto flex items-center gap-2 text-[.9rem]">
			<input type="checkbox" name="published" checked={data.project.published}> Published
		</label>
		<button class="btn btn-primary" type="submit">Save</button>
	</div>
	{#if form?.message}
		<pre class="mb-5 whitespace-pre-wrap text-plasma" role="alert">{form.message}</pre>
	{:else if form?.saved}
		<p class="mb-5 text-acid" role="status">Saved.</p>
	{:else if form && "synced" in form}
		<p class="mb-5 text-acid" role="status">Synced: {form.synced} file(s) changed.</p>
	{/if}

	<section hidden={tab !== "Page"}>
		<p class="mb-4 text-[.9rem] text-dim">
			The first paragraph is the lede. A <code>###</code> heading with one paragraph is a feature
			tile; an image named after a synced screenshot, followed by a <strong>bold</strong> title, is
			a captioned screenshot. <code>/</code> offers both.
			<button class="ml-2 text-cyan" type="button" onclick={() => (previewing = !previewing)}>
				{previewing ? "Back to editing" : "Preview"}
			</button>
		</p>
		{#if previewing}
			<Preview kind="project" markdown={body} repo={data.project.repo} />
		{/if}
		<div hidden={previewing}>
			{#key data.project.repo}
				<Editor name="body" bind:value={body} conventions images={data.images} />
			{/key}
		</div>
	</section>

	<section class="admin-form grid max-w-3xl gap-4" hidden={tab !== "Card"}>
		<label>Name <input name="name" value={data.project.name} required></label>
		<label>Category <input name="category" value={data.project.category}></label>
		<label>
			Blurb
			<textarea name="blurb" rows="3">{data.project.blurb}</textarea>
		</label>
		<label>
			Chips, comma separated
			<input name="chips" value={data.project.chips.join(", ")}>
		</label>
	</section>

	<section class="admin-form grid max-w-3xl gap-4" hidden={tab !== "SEO"}>
		<label>Tag, beside “All projects” <input name="tag" value={data.project.tag}></label>
		<label>Page title <input name="title" value={data.project.title}></label>
		<label>
			Description, for search engines and link previews
			<textarea name="description" rows="3">{data.project.description}</textarea>
		</label>
		<div class="grid gap-4 sm:grid-cols-2">
			<label>
				Social image: a screenshot name
				<input name="imageSrc" value={data.project.image?.src ?? ""} placeholder="hero">
			</label>
			<label>Its alt text <input name="imageAlt" value={data.project.image?.alt ?? ""}></label>
		</div>
		<label>
			Structured data: extra SoftwareApplication fields, as JSON
			<textarea class="font-mono" name="schema" rows="12"
				>{JSON.stringify(data.project.schema, null, 2)}</textarea
			>
		</label>
	</section>

	<section class="admin-form grid max-w-3xl gap-3" hidden={tab !== "Buttons"}>
		<input type="hidden" name="buttons" value={JSON.stringify(buttons)}>
		<p class="text-[.9rem] text-dim">
			Icon: <code>github</code>, <code>docker</code>, or any
			<a class="text-cyan" href="https://lucide.dev/icons" target="_blank" rel="noopener">Lucide</a> name.
		</p>
		{#each buttons as button, index (index)}
			<div class="grid items-end gap-3 border border-line bg-surface p-3 sm:grid-cols-[1fr_1.4fr_.8fr_auto_auto]">
				<label>Label <input bind:value={button.label}></label>
				<label>Link <input bind:value={button.href}></label>
				<label>Icon <input bind:value={button.icon}></label>
				<label class="flex-row! items-center"><input class="w-auto!" type="checkbox" bind:checked={button.primary}> Primary</label>
				<button class="text-dim hover:text-plasma" type="button" onclick={() => buttons.splice(index, 1)}>Remove</button>
			</div>
		{/each}
		<button
			class="btn self-start"
			type="button"
			onclick={() => buttons.push({ label: "", href: "", icon: "link", primary: false })}>Add a button</button
		>
	</section>

	<section hidden={tab !== "Docs"}>
		{#if data.project.githubRepo}
			<p class="mb-4 text-dim">
				Docs sync from <code class="text-cyan">{data.project.githubRepo}</code>
				({data.project.defaultBranch}), last at
				<code>{data.project.docsSyncedSha?.slice(0, 7) ?? "never"}</code>.
			</p>
			<button class="btn mb-6" type="submit" formaction="?/resync">Resync now</button>
			{#each data.runs as run (run.id)}
				<p class="py-1 text-[.9rem]">
					<span class="chip mr-2">{run.status}</span>{run.startedAt.toLocaleString()}
					<span class="text-dim">{run.sha?.slice(0, 7) ?? ""} · {run.changed} changed</span>
					{#if run.error}<span class="block text-plasma">{run.error}</span>{/if}
				</p>
			{:else}
				<p class="text-dim">No syncs yet.</p>
			{/each}
		{:else}
			<p class="text-dim">This project has no linked repo, so it has no synced docs.</p>
		{/if}
	</section>
</form>
