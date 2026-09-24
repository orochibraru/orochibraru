<script lang="ts">
	import { resolve } from "$app/paths";
	import { ago, statusClass } from "$lib/admin";

	let { data } = $props();
	const failed = $derived(data.runs.filter((run) => run.status === "failed").length);
</script>

<svelte:head>
	<title>Overview | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Overview</h1>
	<p class="text-sm text-dim">
		{data.projects.filter((project) => project.published).length} of {data.projects.length} projects live,
		{data.uploads} loose image{data.uploads === 1 ? "" : "s"}{#if failed}, <span class="text-hot"
				>{failed} failed sync{failed === 1 ? "" : "s"}</span
			>{/if}
	</p>
	<form class="ml-auto" method="POST" action="{resolve('/admin/posts')}?/create">
		<button class="abtn abtn-primary" type="submit">New post</button>
	</form>
</div>

<div class="grid gap-4 lg:grid-cols-2">
	<section class="apanel">
		<header>
			Recent posts
			<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={resolve("/admin/posts")}>All posts</a>
		</header>
		<table class="atable">
			<tbody>
				{#each data.posts as item (item.id)}
					<tr>
						<td class="w-full">
							<a class="row-link" href={resolve("/admin/(app)/posts/[id]", { id: String(item.id) })}>{item.title}</a>
						</td>
						<td><span class={statusClass(item.status)}>{item.status}</span></td>
						<td class="font-mono text-xs whitespace-nowrap text-dim">{item.date}</td>
					</tr>
				{:else}
					<tr><td class="py-6 text-center text-dim">No posts yet. Start one with New post.</td></tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="apanel">
		<header>
			Projects
			<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={resolve("/admin/projects")}>Reorder</a>
		</header>
		<table class="atable">
			<tbody>
				{#each data.projects as item (item.repo)}
					<tr>
						<td class="w-full">
							<a class="row-link" href={resolve("/admin/(app)/projects/[repo]", { repo: item.repo })}>{item.name}</a>
						</td>
						<td><span class={statusClass(item.published ? "published" : "draft")}>{item.published ? "live" : "draft"}</span></td>
						<td class="font-mono text-xs text-dim">{item.docsSyncedSha?.slice(0, 7) ?? "no docs"}</td>
					</tr>
				{:else}
					<tr>
						<td class="py-6 text-center text-dim">
							No projects yet. <a class="text-cool" href={resolve("/admin/projects")}>Add one from GitHub</a>.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section class="apanel lg:col-span-2">
		<header>
			Docs sync
			<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={resolve("/admin/github")}>GitHub</a>
		</header>
		<table class="atable">
			<tbody>
				{#each data.runs as run (run.id)}
					<tr>
						<td class="w-28"><span class={statusClass(run.status)}>{run.status}</span></td>
						<td class="font-medium whitespace-nowrap">{run.repo}</td>
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
					<tr><td class="py-6 text-center text-dim">No syncs yet. They run on every push once the GitHub App is installed.</td></tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
