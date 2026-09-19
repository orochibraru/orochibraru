<script lang="ts">
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Projects | orochibraru admin</title>
</svelte:head>

<div class="mb-8 flex flex-wrap items-center gap-4">
	<h1 class="text-3xl font-extrabold tracking-[-.03em]">Projects</h1>
	{#if data.addable.length}
		<form class="admin-form ml-auto flex items-end gap-3" method="POST" action="?/add" use:enhance>
			<label>
				Add a repo the GitHub App can read
				<select name="repo">
					{#each data.addable as repo (repo)}
						<option>{repo}</option>
					{/each}
				</select>
			</label>
			<button class="btn btn-primary" type="submit">Add project</button>
		</form>
	{:else}
		<a class="ml-auto text-[.9rem] text-dim hover:text-acid" href={resolve("/admin/github")}
			>Install the GitHub App on more repos to add projects &rarr;</a
		>
	{/if}
</div>
{#if form?.message}
	<p class="mb-5 text-plasma" role="alert">{form.message}</p>
{/if}

<p class="mb-4 text-[.9rem] text-dim">The order here is the order of the cards on the home page.</p>
<div class="grid gap-px border border-line bg-line">
	{#each data.projects as project, index (project.repo)}
		<div class="flex items-center gap-4 bg-surface px-5 py-3">
			<form class="flex flex-col" method="POST" action="?/move" use:enhance>
				<input type="hidden" name="repo" value={project.repo}>
				<button
					class="text-dim hover:text-acid disabled:opacity-30"
					name="direction"
					value="up"
					disabled={index === 0}
					aria-label="Move {project.name} up">&uarr;</button
				>
				<button
					class="text-dim hover:text-acid disabled:opacity-30"
					name="direction"
					value="down"
					disabled={index === data.projects.length - 1}
					aria-label="Move {project.name} down">&darr;</button
				>
			</form>
			<a
				class="flex flex-1 items-baseline gap-4 hover:text-acid"
				href={resolve("/admin/(app)/projects/[repo]", { repo: project.repo })}
			>
				<span class="font-semibold">{project.name}</span>
				<span class="text-[.85rem] text-dim">{project.category}</span>
			</a>
			{#if !project.published}<span class="chip">draft</span>{/if}
			<span class="font-mono text-[.8rem] text-dim">{project.githubRepo ?? "no repo"}</span>
		</div>
	{/each}
</div>
