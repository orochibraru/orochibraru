<script lang="ts">
	import { ChevronDown, ChevronUp, ExternalLink } from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { ago, statusClass } from "$lib/admin";

	let { data, form } = $props();

	const DOCS = {
		valid: ["status status-on", "docs/ · config.json"],
		invalid: ["status status-bad", "config.json invalid"],
		"no config": ["status", "docs/ · no config.json"],
		"no docs": ["status", "no docs/"],
		"not synced": ["status", "not synced"],
	} as const;

	const number = new Intl.NumberFormat("en");
</script>

<svelte:head>
	<title>Projects | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Projects</h1>
	<p class="text-sm text-dim">In the order the home page and /projects list them.</p>
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
	<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{form.message}</p>
{/if}

<div class="apanel overflow-x-auto">
	<table class="atable">
		<thead>
			<tr>
				<th class="w-16"><span class="sr-only">Order</span></th>
				<th>Project</th>
				<th>Status</th>
				<th>Docs</th>
				<th>Last sync</th>
				{#if data.views}<th class="text-right" title="Pageviews over the last 30 days, docs included">Views</th>{/if}
				<th class="text-right">Edited</th>
			</tr>
		</thead>
		<tbody>
			{#each data.projects as project, index (project.repo)}
				<tr>
					<td class="py-1">
						<form class="relative z-10 flex flex-col" method="POST" action="?/move" use:enhance>
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
					<td class="w-full max-w-0 min-w-80">
						<div class="flex items-center gap-3">
							<div class="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-bg">
								{#if project.shot}
									<img class="on-light size-full object-cover object-top" src={project.shot.light} alt="" loading="lazy">
									<img class="on-dark size-full object-cover object-top" src={project.shot.dark} alt="" loading="lazy">
								{:else}
									<span class="text-lg font-semibold text-dim" aria-hidden="true">{project.name.slice(0, 1)}</span>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="flex items-baseline gap-2">
									<a class="row-link" href={resolve("/admin/(app)/projects/[repo]", { repo: project.repo })}>{project.name}</a>
									{#if project.category}<span class="truncate text-xs text-dim">{project.category}</span>{/if}
								</p>
								<p class="mt-0.5 truncate text-[13px] text-dim">
									{#if project.blurb}
										{project.blurb}
									{:else}
										<span class="text-hot/80">No blurb</span>
									{/if}
								</p>
								{#if project.githubRepo}
									<a
										class="relative z-1 mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-dim hover:text-fg"
										href="https://github.com/{project.githubRepo}"
										target="_blank"
										rel="noopener">{project.githubRepo}<ExternalLink class="size-3" aria-hidden="true" /></a
									>
								{:else}
									<span class="font-mono text-xs text-dim">no repo</span>
								{/if}
							</div>
						</div>
					</td>
					<td>
						<span class={statusClass(project.published ? "published" : "draft")}>{project.published ? "live" : "draft"}</span>
					</td>
					<td class="whitespace-nowrap">
						<span class="{DOCS[project.docs][0]} normal-case">{DOCS[project.docs][1]}</span>
						{#if project.channels.length}
							<div class="mt-0.5 text-xs text-dim">
								{project.guides} guide{project.guides === 1 ? "" : "s"},
								{#each project.channels as version, index (version.channel)}
									{index ? " + " : ""}<span class="font-mono" title={version.channel}>{version.ref}</span>
								{/each}
							</div>
						{/if}
					</td>
					<td class="whitespace-nowrap">
						{#if project.sync}
							<span class={statusClass(project.sync.status)} title={project.sync.error ?? undefined}>{project.sync.status}</span>
							<div class="mt-0.5 text-xs text-dim" title={project.sync.at.toLocaleString()}>{ago(project.sync.at)}</div>
						{:else}
							<span class="text-xs text-dim">never</span>
						{/if}
					</td>
					{#if data.views}
						<td class="text-right font-mono text-xs whitespace-nowrap">
							{#await data.views}
								<span class="text-dim">&hellip;</span>
							{:then views}
								{#if views && project.published}
									{number.format(views[project.repo] ?? 0)}
								{:else}
									<span class="text-dim">&ndash;</span>
								{/if}
							{/await}
						</td>
					{/if}
					<td class="text-right text-xs whitespace-nowrap text-dim" title={project.updatedAt.toLocaleString()}>{ago(project.updatedAt)}</td>
				</tr>
			{:else}
				<tr><td class="py-10 text-center text-dim" colspan="7">No projects yet. Add a repo above.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<form
	data-save
	class="apanel mt-8"
	method="POST"
	action="?/copy"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
>
	<header>
		The /projects page
		<a class="inline-flex items-center gap-1 text-xs font-normal text-dim hover:text-fg" href={resolve("/projects")} target="_blank"
			>View<ExternalLink class="size-3" aria-hidden="true" /></a
		>
		<button class="abtn abtn-primary ml-auto h-7" type="submit">Save<span class="kbd border-onspark/30 text-onspark/70">⌘S</span></button>
	</header>
	<div class="admin-form grid gap-5 p-4 lg:grid-cols-2">
		<div class="grid content-start gap-5">
			<p class="text-[13px] text-dim">
				What the page says above the projects. Projects with a social image get the big treatment; the rest go
				under the second heading.
			</p>
			<label>
				Tag, after the project count
				<input name="tag" value={data.copy.tag} placeholder="MIT & AGPL">
			</label>
			<div class="grid gap-5 sm:grid-cols-2">
				<label>Heading <input name="heading" value={data.copy.heading} required></label>
				<label>Its highlighted second line <input name="accent" value={data.copy.accent}></label>
			</div>
			<label>
				Intro
				<textarea class="field-sizing-content min-h-24" name="intro">{data.copy.intro}</textarea>
			</label>
			<label>Heading over the other projects <input name="others" value={data.copy.others} required></label>
		</div>
		<div class="grid content-start gap-5">
			<p class="text-[13px] text-dim">What search engines and link previews see.</p>
			<label>Page title <input name="title" value={data.copy.title} required></label>
			<label>
				Description
				<textarea class="field-sizing-content min-h-24" name="description" required>{data.copy.description}</textarea>
			</label>
		</div>
	</div>
</form>
