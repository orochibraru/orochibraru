<script lang="ts">
	import {
		ArrowLeft,
		ChevronDown,
		ChevronUp,
		Eye,
		PenLine,
		Plus,
		RefreshCw,
		X,
	} from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { ago, statusClass, syncScroll } from "$lib/admin";
	import Editor from "$lib/components/admin/Editor.svelte";
	import Preview from "$lib/components/admin/Preview.svelte";

	let { data, form } = $props();

	const TABS = ["Page", "Card", "SEO", "Buttons", "Docs"] as const;
	let tab = $state<(typeof TABS)[number]>("Page");
	let previewing = $state(false);
	let saving = $state(false);

	// writable deriveds: edited here, reset whenever another project loads
	let body = $derived(data.project.body);
	// a $derived isn't deeply reactive: without the $state proxy, push, splice and
	// bind:value on a row would change an array nothing is listening to
	let buttons = $derived.by(() => {
		const rows = $state(data.project.buttons.map((button) => ({ ...button })));
		return rows;
	});

	function move(from: number, to: number) {
		const [button] = buttons.splice(from, 1);
		if (button) {
			buttons.splice(to, 0, button);
		}
	}
</script>

<svelte:head>
	<title>{data.project.name} | orochibraru admin</title>
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
		class="sticky top-11 z-10 -mx-4 mb-8 flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/85 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8"
	>
		<a
			class="flex items-center gap-1.5 text-[.8125rem] text-dim hover:text-fg"
			href={resolve("/admin/projects")}
		>
			<ArrowLeft class="size-3.5" aria-hidden="true" /> Projects
		</a>
		<span class="text-sm font-semibold">{data.project.name}</span>
		<div class="flex border border-line bg-surface p-0.5 text-[.8125rem]" role="tablist">
			{#each TABS as name (name)}
				<button
					type="button"
					role="tab"
					aria-selected={tab === name}
					class={[
						"px-2.5 py-0.5 transition-colors",
						tab === name ? "bg-fg/8 text-fg" : "text-dim hover:text-fg",
					]}
					onclick={() => (tab = name)}>{name}</button
				>
			{/each}
		</div>
		<label class="ml-auto flex cursor-pointer items-center gap-2 text-[.8125rem]">
			<input class="peer sr-only" type="checkbox" name="published" checked={data.project.published}>
			<span
				class="relative h-4 w-7 border border-edge bg-surface transition-colors peer-checked:border-spark peer-checked:bg-spark peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-2.5 after:bg-dim after:transition-transform after:content-[''] peer-checked:after:translate-x-3 peer-checked:after:bg-onspark"
				aria-hidden="true"
			></span>
			Live
		</label>
		<button class="abtn abtn-primary" type="submit" disabled={saving}>
			{saving ? "Saving…" : "Save"}<span class="kbd border-onspark/30 text-onspark/70">⌘S</span>
		</button>
	</div>

	<div>
		{#if form?.message}
			<pre class="mb-6 border border-hot/40 bg-hot/8 px-3 py-2 text-sm whitespace-pre-wrap text-hot" role="alert">{form.message}</pre>
		{:else if form && "synced" in form}
			<p class="mb-6 border border-line bg-surface px-3 py-2 text-sm" role="status">
				<span class="status status-on">Synced</span>, {form.synced} file{form.synced === 1 ? "" : "s"} changed.
			</p>
		{/if}

		<section hidden={tab !== "Page"}>
			<div class="mb-4 flex items-start gap-4">
				<p class="max-w-[90ch] flex-1 text-[.8125rem] text-dim">
					The first paragraph is the lede. A <code class="text-fg">###</code> heading with one paragraph is
					a feature tile; an image named after a synced screenshot, then a <strong class="text-fg">bold</strong>
					title, is a captioned screenshot. Type <code class="text-fg">/</code> for both.
				</p>
				<button class="abtn shrink-0 2xl:hidden" type="button" onclick={() => (previewing = !previewing)}>
					{#if previewing}
						<PenLine class="size-3.5" aria-hidden="true" /> Edit
					{:else}
						<Eye class="size-3.5" aria-hidden="true" /> Preview
					{/if}
				</button>
			</div>
			<!-- wide screens show the editor and the real render side by side -->
			<div class="2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-8" {@attach syncScroll}>
				<div class={previewing ? "hidden 2xl:block" : undefined}>
					{#key data.project.repo}
						<Editor name="body" bind:value={body} conventions images={data.images} />
					{/key}
				</div>
				<div data-preview class={[!previewing && "hidden 2xl:block", "2xl:sticky 2xl:top-26 2xl:max-h-[calc(100dvh-7.5rem)] 2xl:overflow-y-auto 2xl:border-l 2xl:border-line 2xl:pl-8"]}>
					<Preview kind="project" markdown={body} repo={data.project.repo} />
				</div>
			</div>
		</section>

		<section class="admin-form grid max-w-4xl gap-5" hidden={tab !== "Card"}>
			<p class="text-[.8125rem] text-dim">What the project's card on the home page shows.</p>
			<div class="grid gap-5 sm:grid-cols-2">
				<label>Name <input name="name" value={data.project.name} required></label>
				<label>Category <input name="category" value={data.project.category}></label>
			</div>
			<label>
				Blurb
				<textarea class="field-sizing-content min-h-20" name="blurb">{data.project.blurb}</textarea>
			</label>
			<label>
				Chips, comma separated
				<input name="chips" value={data.project.chips.join(", ")}>
			</label>
		</section>

		<section class="admin-form grid max-w-4xl gap-5" hidden={tab !== "SEO"}>
			<p class="text-[.8125rem] text-dim">What search engines and link previews see.</p>
			<div class="grid gap-5 sm:grid-cols-2">
				<label>Page title <input name="title" value={data.project.title}></label>
				<label>Tag beside “All projects” <input name="tag" value={data.project.tag}></label>
			</div>
			<label>
				Description
				<textarea class="field-sizing-content min-h-20" name="description">{data.project.description}</textarea>
			</label>
			<div class="grid gap-5 sm:grid-cols-2">
				<label>
					Social image, by screenshot name
					<input class="font-mono" name="imageSrc" value={data.project.image?.src ?? ""} placeholder="hero">
				</label>
				<label>Its alt text <input name="imageAlt" value={data.project.image?.alt ?? ""}></label>
			</div>
			<label>
				Extra SoftwareApplication fields, as JSON
				<textarea class="font-mono text-[.8125rem]!" name="schema" rows="12" spellcheck="false"
					>{JSON.stringify(data.project.schema, null, 2)}</textarea
				>
			</label>
		</section>

		<section class="admin-form grid max-w-6xl gap-3" hidden={tab !== "Buttons"}>
			<input type="hidden" name="buttons" value={JSON.stringify(buttons)}>
			<p class="text-[.8125rem] text-dim">
				The links under the project's title. Icon is <code class="text-fg">github</code>,
				<code class="text-fg">docker</code>, or any
				<a class="text-cool hover:underline" href="https://lucide.dev/icons" target="_blank" rel="noopener">Lucide</a> name.
			</p>
			<div class="apanel">
				{#each buttons as button, index (index)}
					<div class="grid items-end gap-3 border-b border-line p-3 sm:grid-cols-[auto_1fr_1.5fr_.8fr_auto_auto]">
						<div class="flex h-8 items-center">
							<button
								class="grid size-6 place-items-center text-dim hover:text-fg disabled:opacity-25"
								type="button"
								disabled={index === 0}
								aria-label="Move {button.label || 'this button'} up"
								onclick={() => move(index, index - 1)}><ChevronUp class="size-4" aria-hidden="true" /></button
							>
							<button
								class="grid size-6 place-items-center text-dim hover:text-fg disabled:opacity-25"
								type="button"
								disabled={index === buttons.length - 1}
								aria-label="Move {button.label || 'this button'} down"
								onclick={() => move(index, index + 1)}><ChevronDown class="size-4" aria-hidden="true" /></button
							>
						</div>
						<label>Label <input bind:value={button.label}></label>
						<label>Link <input class="font-mono" bind:value={button.href}></label>
						<label>Icon <input class="font-mono" bind:value={button.icon}></label>
						<label class="h-8 flex-row! items-center gap-2! text-fg!">
							<input type="checkbox" class="accent-spark" bind:checked={button.primary}> Primary
						</label>
						<button
							class="grid size-8 place-items-center text-dim hover:text-hot"
							type="button"
							aria-label="Remove {button.label || 'this button'}"
							onclick={() => buttons.splice(index, 1)}><X class="size-4" aria-hidden="true" /></button
						>
					</div>
				{:else}
					<p class="border-b border-line p-6 text-center text-sm text-dim">No buttons.</p>
				{/each}
				<button
					class="flex w-full items-center gap-2 px-3 py-2.5 text-[.8125rem] text-dim hover:bg-fg/3 hover:text-fg"
					type="button"
					onclick={() => buttons.push({ label: "", href: "", icon: "link", primary: false })}
					><Plus class="size-3.5" aria-hidden="true" /> Add a button</button
				>
			</div>
		</section>

		<section hidden={tab !== "Docs"}>
			{#if data.project.githubRepo}
				<div class="mb-4 flex flex-wrap items-center gap-3 text-[.8125rem] text-dim">
					<p>
						Synced from <code class="text-fg">{data.project.githubRepo}</code> on
						<code class="text-fg">{data.project.defaultBranch}</code>, now at
						<code class="text-fg">{data.project.docsSyncedSha?.slice(0, 7) ?? "nothing yet"}</code>.
					</p>
					<button class="abtn ml-auto" type="submit" formaction="?/resync">
						<RefreshCw class="size-3.5" aria-hidden="true" /> Resync now
					</button>
				</div>
				<div class="apanel overflow-x-auto">
					<table class="atable">
						<tbody>
							{#each data.runs as run (run.id)}
								<tr>
									<td class="w-24"><span class={statusClass(run.status)}>{run.status}</span></td>
									<td class="font-mono text-xs text-dim">{run.sha?.slice(0, 7) ?? ""}</td>
									<td class="w-full text-dim">
										{#if run.error}
											<span class="text-hot">{run.error}</span>
										{:else}
											{run.changed} file{run.changed === 1 ? "" : "s"} changed
										{/if}
									</td>
									<td class="text-xs whitespace-nowrap text-dim" title={run.startedAt.toLocaleString()}>{ago(run.startedAt)}</td>
								</tr>
							{:else}
								<tr><td class="py-8 text-center text-dim">No syncs yet.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="apanel p-8 text-center text-sm text-dim">This project has no linked repo, so there are no docs to sync.</p>
			{/if}
		</section>
	</div>
</form>
