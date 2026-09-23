<script lang="ts">
	import { ChevronDown, ChevronUp } from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { statusClass } from "$lib/admin";

	let { data, form } = $props();

	const DOCS = {
		valid: ["status status-on", "docs/ · config.json"],
		invalid: ["status status-bad", "config.json invalid"],
		"no config": ["status", "docs/ · no config.json"],
		"no docs": ["status", "no docs/"],
		"not synced": ["status", "not synced"],
	} as const;
</script>

<svelte:head>
	<title>Projects | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Projects</h1>
	<p class="text-sm text-dim">Listed in home page order.</p>
	{#if data.addable.length}
		<form class="ml-auto flex items-center gap-2" method="POST" action="?/add" use:enhance>
			<select class="field h-8 w-auto py-0" name="repo" aria-label="Repo to add">
				{#each data.addable as repo (repo)}
					<option>{repo}</option>
				{/each}
			</select>
			<button class="abtn abtn-primary" type="submit">Add project</button>
		</form>
	{:else}
		<a class="ml-auto text-[.8125rem] text-dim hover:text-fg" href={resolve("/admin/github")}
			>Install the GitHub App on more repos to add projects</a
		>
	{/if}
</div>
{#if form?.message}
	<p class="mb-4 border border-plasma/40 bg-plasma/8 px-3 py-2 text-sm text-plasma" role="alert">{form.message}</p>
{/if}

<div class="apanel overflow-x-auto">
	<table class="atable">
		<thead>
			<tr>
				<th class="w-16"><span class="sr-only">Order</span></th>
				<th>Name</th>
				<th>Category</th>
				<th>Status</th>
				<th>Docs</th>
				<th>Repo</th>
			</tr>
		</thead>
		<tbody>
			{#each data.projects as project, index (project.repo)}
				<tr>
					<td class="py-1">
						<form class="relative z-10 flex" method="POST" action="?/move" use:enhance>
							<input type="hidden" name="repo" value={project.repo}>
							<button
								class="grid size-6 place-items-center text-dim hover:text-fg disabled:opacity-25"
								name="direction"
								value="up"
								disabled={index === 0}
								aria-label="Move {project.name} up"><ChevronUp class="size-4" aria-hidden="true" /></button
							>
							<button
								class="grid size-6 place-items-center text-dim hover:text-fg disabled:opacity-25"
								name="direction"
								value="down"
								disabled={index === data.projects.length - 1}
								aria-label="Move {project.name} down"><ChevronDown class="size-4" aria-hidden="true" /></button
							>
						</form>
					</td>
					<td class="w-full">
						<a class="row-link" href={resolve("/admin/(app)/projects/[repo]", { repo: project.repo })}>{project.name}</a>
					</td>
					<td class="whitespace-nowrap text-dim">{project.category}</td>
					<td>
						<span class={statusClass(project.published ? "published" : "draft")}>{project.published ? "live" : "draft"}</span>
					</td>
					<td class="whitespace-nowrap">
						<span class="{DOCS[project.docs][0]} normal-case">{DOCS[project.docs][1]}</span>
					</td>
					<td class="font-mono text-xs whitespace-nowrap text-dim">{project.githubRepo ?? "no repo"}</td>
				</tr>
			{:else}
				<tr><td class="py-10 text-center text-dim" colspan="6">No projects yet. Add a repo above.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
