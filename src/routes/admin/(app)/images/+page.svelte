<script lang="ts">
	import { enhance } from "$app/forms";

	let { data, form } = $props();
	let copied = $state<number | null>(null);

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

<div class="mb-8 flex flex-wrap items-end gap-4">
	<h1 class="text-3xl font-extrabold tracking-[-.03em]">Images</h1>
	<form
		class="admin-form ml-auto flex items-end gap-3"
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance
	>
		<label>Image <input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/tiff" required></label>
		<label>Alt text <input name="alt"></label>
		<button class="btn btn-primary" type="submit">Upload</button>
	</form>
</div>
{#if form?.message}
	<p class="mb-5 text-plasma" role="alert">{form.message}</p>
{/if}

<div class="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
	{#each data.images as image (image.id)}
		<div class="flex flex-col gap-3 bg-surface p-4">
			<img
				class="aspect-video w-full border border-line object-cover"
				src={image.url}
				alt={image.alt}
				width={image.width}
				height={image.height}
				loading="lazy"
			>
			<p class="text-[.85rem] text-dim">
				<span class="chip">{image.label}</span>
				{image.width}×{image.height}
				{#if image.usages.length}
					<span class="mt-1 block">Used by {image.usages.join(", ")}</span>
				{/if}
			</p>
			<form class="admin-form flex items-end gap-2" method="POST" action="?/alt" use:enhance>
				<input type="hidden" name="id" value={image.id}>
				<label class="flex-1">Alt text <input name="alt" value={image.alt}></label>
				<button class="btn" type="submit">Save</button>
			</form>
			<button
				class="self-start text-[.85rem] text-cyan"
				type="button"
				onclick={() => copy(image.id, `![${image.alt}](${image.url})`)}
				>{copied === image.id ? "Copied" : "Copy Markdown"}</button
			>
		</div>
	{/each}
</div>
