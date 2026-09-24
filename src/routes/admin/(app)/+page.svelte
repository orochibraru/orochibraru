<script lang="ts">
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { ago, statusClass } from "$lib/admin";
	import VisitorsChart from "$lib/components/admin/VisitorsChart.svelte";

	let { data, form } = $props();
	const failed = $derived(data.runs.filter((run) => run.status === "failed").length);
	// 20189 -> "20.2K", so every tile fits; the exact count is in the tooltip
	// the range the chart shows: 30 days until a tile is picked
	let selected = $state(2);
	const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
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
	<section class="apanel lg:col-span-2">
		{#if data.analytics}
			{#await data.analytics}
				<header>Visitors</header>
				<p class="px-3 py-6 text-center text-sm text-dim">Asking Umami&hellip;</p>
			{:then stats}
				<header>
					Visitors
					{#if stats.active}<span class="text-xs font-normal text-cool">&bull; {stats.active} online</span>{/if}
					<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={stats.url} target="_blank" rel="noopener">Umami</a>
				</header>
				<div class="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
					{#each stats.ranges as range, index (range.label)}
						<button
							type="button"
							class={[
								"rounded-lg border px-3 py-2.5 text-left leading-tight transition-colors",
								index === selected ? "border-accent bg-accent/6" : "border-transparent bg-fg/3 hover:border-edge",
							]}
							aria-pressed={index === selected}
							onclick={() => (selected = index)}
						>
							<div class="text-[11px] font-medium tracking-wide text-dim uppercase">{range.label}</div>
							<div class="mt-1.5 text-xl font-bold" title="{range.visitors} visitors">
								{compact.format(range.visitors)} <span class="text-xs font-normal text-dim">visitors</span>
							</div>
							<div class="mt-0.5 text-sm" title="{range.pageviews} views">
								{compact.format(range.pageviews)} <span class="text-xs text-dim">views</span>
							</div>
						</button>
					{/each}
				</div>
				{@const range = stats.ranges[selected]}
				{#if range}
					<VisitorsChart series={range.series} unit={range.unit} />
				{/if}
			{:catch}
				<header>Visitors</header>
				<p class="px-3 py-6 text-center text-sm text-hot">Couldn&rsquo;t reach Umami. Check the connection below.</p>
			{/await}
		{:else}
			<header>Visitors</header>
		{/if}
		<!-- open until a connection is saved; after that, tucked away under the stats -->
		<details open={!data.umami}>
			<summary class="cursor-pointer px-3 py-2 text-xs text-dim hover:text-fg">
				{data.umami ? "Connection" : "Connect a self-hosted Umami v3 to see visitor stats here"}
			</summary>
			<form class="admin-form grid gap-3 p-3 pt-1 sm:grid-cols-3" method="POST" action="?/umami" use:enhance>
				<label>
					Umami URL
					<input name="url" type="url" required placeholder="https://umami.example.com" value={data.umami?.url ?? ""}>
				</label>
				<label>
					Website ID
					<input name="websiteId" required placeholder="From the tracking script" value={data.umami?.websiteId ?? ""}>
				</label>
				<label>
					API key
					<input
						name="apiKey"
						type="password"
						autocomplete="off"
						required={!data.umami}
						placeholder={data.umami ? "Saved: leave blank to keep it" : "Your Umami API key"}
					>
				</label>
				{#if form?.umamiError}
					<p class="text-sm text-hot sm:col-span-3" role="alert">{form.umamiError}</p>
				{/if}
				<div class="flex gap-2 sm:col-span-3">
					<button class="abtn abtn-primary" type="submit">{data.umami ? "Save" : "Connect"}</button>
					{#if data.umami}
						<button class="abtn abtn-danger ml-auto" type="submit" formaction="?/forgetUmami" formnovalidate>Disconnect</button>
					{/if}
				</div>
			</form>
		</details>
	</section>

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
