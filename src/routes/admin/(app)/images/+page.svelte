<script lang="ts">
	import { Check, Copy, Upload } from "@lucide/svelte";
	import { enhance } from "$app/forms";

	let { data, form } = $props();
	let copied = $state<number | null>(null);
	let file = $state<FileList>();

	async function copy(id: number, markdown: string) {
		await navigator.clipboard.writeText(markdown);
		copied = id;
		setTimeout(() => {
			copied = null;
		}, 1500);
	}
</script>

<svelte:head>
	<title>Images | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Images</h1>
	<p class="text-sm text-dim">{data.images.length}</p>
	<form
		class="ml-auto flex flex-wrap items-center gap-2"
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				file = undefined;
			}}
	>
		<label class="abtn cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-acid">
			<Upload class="size-3.5" aria-hidden="true" />
			<span class="max-w-40 truncate">{file?.[0]?.name ?? "Choose an image"}</span>
			<input
				class="sr-only"
				type="file"
				name="file"
				accept="image/png,image/jpeg,image/webp,image/tiff"
				required
				bind:files={file}
			>
		</label>
		<input class="field h-8 w-48 py-0" name="alt" placeholder="Alt text" aria-label="Alt text">
		<button class="abtn abtn-primary" type="submit" disabled={!file?.length}>Upload</button>
	</form>
</div>
{#if form?.message}
	<p class="mb-4 border border-plasma/40 bg-plasma/8 px-3 py-2 text-sm text-plasma" role="alert">{form.message}</p>
{/if}

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	{#each data.images as image (image.id)}
		<figure class="apanel group m-0 flex flex-col">
			<div class="relative">
				<img
					class="aspect-video w-full border-b border-line bg-[repeating-conic-gradient(var(--color-line)_0_25%,transparent_0_50%)] bg-size-[16px_16px] object-contain"
					src={image.url}
					alt={image.alt}
					width={image.width}
					height={image.height}
					loading="lazy"
				>
				<button
					class="absolute top-2 right-2 flex items-center gap-1.5 border border-line bg-surface/90 px-2 py-1 text-xs opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
					type="button"
					onclick={() => copy(image.id, `![${image.alt}](${image.url})`)}
				>
					{#if copied === image.id}
						<Check class="size-3" aria-hidden="true" /> Copied
					{:else}
						<Copy class="size-3" aria-hidden="true" /> Markdown
					{/if}
				</button>
			</div>
			<figcaption class="flex flex-1 flex-col gap-2 p-3">
				<p class="flex items-baseline gap-2 text-[.8125rem]">
					<span class="truncate font-medium">{image.label}</span>
					<span class="ml-auto shrink-0 font-mono text-[.6875rem] text-dim">{image.width}×{image.height}</span>
				</p>
				<p class="truncate text-xs text-dim" title={image.usages.join(", ")}>
					{image.usages.length ? `Used by ${image.usages.join(", ")}` : "Not used anywhere"}
				</p>
				<form class="mt-auto flex gap-1.5" method="POST" action="?/alt" use:enhance={() => async ({ update }) => update({ reset: false })}>
					<input type="hidden" name="id" value={image.id}>
					<input class="field h-7 py-0 text-[.8125rem]" name="alt" value={image.alt} placeholder="Alt text" aria-label="Alt text for {image.label}">
					<button class="abtn h-7 px-2 text-xs" type="submit">Save</button>
				</form>
			</figcaption>
		</figure>
	{:else}
		<p class="apanel p-10 text-center text-sm text-dim sm:col-span-2 lg:col-span-3 xl:col-span-4">No images yet. Upload one, or paste one into a post.</p>
	{/each}
</div>
