<script lang="ts">
	import { resolve } from "$app/paths";
	import { ago, statusClass } from "$lib/admin";
	import Delta from "$lib/components/admin/Delta.svelte";
	import VisitorsChart from "$lib/components/admin/VisitorsChart.svelte";

	let { data } = $props();
	const failed = $derived(data.runs.filter((run) => run.status === "failed").length);
	// 20189 -> "20.2K", so every tile fits; the exact count is in the tooltip
	// the range the chart shows: 30 days until a tile is picked
	let selected = $state(2);
	const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
	const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 });
</script>

<svelte:head>
	<title>Overview | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Overview</h1>
	<p class="text-sm text-dim">
		{data.projects.filter((project) => project.published).length} of {data.projects.length} projects live{#if failed}, <span class="text-hot"
				>{failed} failed sync{failed === 1 ? "" : "s"}</span
			>{/if}
	</p>
	<form class="ml-auto" method="POST" action="{resolve('/admin/posts')}?/create">
		<button class="abtn abtn-primary" type="submit">New post</button>
	</form>
</div>

<div class="grid gap-4 lg:grid-cols-2">
	{#if data.digest}
		<section class="apanel lg:col-span-2">
			<header>Today</header>
			<div class="grid gap-2 p-3 text-sm leading-relaxed">
				{#await data.digest}
					<p class="text-dim">Reading the numbers&hellip;</p>
				{:then paragraphs}
					{#each paragraphs as paragraph, index (index)}
						<p>{paragraph}</p>
					{:else}
						<p class="text-dim">Nothing to report.</p>
					{/each}
				{/await}
			</div>
		</section>
	{/if}

	<section class="apanel lg:col-span-2">
		{#if data.analytics}
			{#await data.analytics}
				<header>Visitors</header>
				<p class="px-3 py-6 text-center text-sm text-dim">Asking Umami&hellip;</p>
			{:then stats}
				<header>
					Visitors
					{#if stats.active}<span class="text-xs font-normal text-cool">&bull; {stats.active} online</span>{/if}
					<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={resolve("/admin/analytics")}>Details</a>
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
							{#if range.previous}
								<Delta now={range.visitors} before={range.previous.visitors} against="the {range.label} before" />
							{/if}
						</button>
					{/each}
				</div>
				{@const range = stats.ranges[selected]}
				{#if range}
					<VisitorsChart series={range.series} unit={range.unit} />
				{/if}
			{:catch}
				<header>Visitors</header>
				<p class="px-3 py-6 text-center text-sm text-hot">
					Couldn&rsquo;t reach Umami. <a class="text-cool" href={resolve("/admin/settings")}>Check the settings</a>.
				</p>
			{/await}
		{:else}
			<header>Visitors</header>
			<p class="px-3 py-6 text-center text-sm text-dim">
				<a class="text-cool" href={resolve("/admin/settings")}>Connect a self-hosted Umami</a> to see visitor stats here.
			</p>
		{/if}
	</section>

	<section class="apanel lg:col-span-2">
		<header>
			Search
			<span class="text-xs font-normal text-dim">last 28 days</span>
			<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={resolve("/admin/analytics")}>Details</a>
		</header>
		{#if data.search}
			{#await data.search}
				<p class="px-3 py-6 text-center text-sm text-dim">Asking Search Console&hellip;</p>
			{:then stats}
				{@const { totals, previous } = stats}
				{@const tiles: [string, string, number, number, boolean?][] = [
					["Clicks", compact.format(totals.clicks), totals.clicks, previous.clicks],
					["Impressions", compact.format(totals.impressions), totals.impressions, previous.impressions],
					["CTR", percent.format(totals.ctr), totals.ctr, previous.ctr],
					// position 1 is the top: lower is better
					["Avg position", totals.position.toFixed(1), totals.position, previous.position, true],
				]}
				<div class="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
					{#each tiles as [label, value, now, before, lower] (label)}
						<div class="rounded-lg bg-fg/3 px-3 py-2.5 leading-tight">
							<div class="text-[11px] font-medium tracking-wide text-dim uppercase">{label}</div>
							<div class="mt-1.5 text-xl font-bold">{value}</div>
							<Delta {now} {before} {lower} against="the 28 days before" />
						</div>
					{/each}
				</div>
			{:catch}
				<p class="px-3 py-6 text-center text-sm text-hot">
					Couldn&rsquo;t reach Search Console. <a class="text-cool" href={resolve("/admin/settings")}>Check the settings</a>.
				</p>
			{/await}
		{:else}
			<p class="px-3 py-6 text-center text-sm text-dim">
				<a class="text-cool" href={resolve("/admin/settings")}>Connect Google Search Console</a> to see search stats here.
			</p>
		{/if}
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
