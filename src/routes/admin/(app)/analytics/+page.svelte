<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import Delta from "$lib/components/admin/Delta.svelte";
	import VisitorsChart from "$lib/components/admin/VisitorsChart.svelte";

	let { data } = $props();

	type Item = { label: string; value: number; title?: string; cells?: string[] };
	/** This range's number, the one for the range before it, and whether lower is better. */
	type Change = [now: number, before: number, lower?: boolean];

	const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
	const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 });
	const regions = new Intl.DisplayNames(["en"], { type: "region" });
	// Umami sends ISO 3166 alpha-2 (FR), Search Console alpha-3 (fra)
	const country = (code: string) => {
		try {
			return code.length === 2 ? (regions.of(code.toUpperCase()) ?? code) : code.toUpperCase();
		} catch {
			return code;
		}
	};
	const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, "") || "/";
	const duration = (seconds: number) =>
		seconds >= 60
			? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
			: `${Math.round(seconds)}s`;
	const ratio = (part: number, whole: number) => (whole ? part / whole : 0);
	const href = (days: number) => {
		const url = new URL(page.url);
		url.searchParams.set("days", String(days));
		return `${url.pathname}${url.search}`;
	};
</script>

<svelte:head>
	<title>Analytics | orochibraru admin</title>
</svelte:head>

{#snippet tiles(items: [string, string, string?, Change?][])}
	<div class="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each items as [label, value, hint, change] (label)}
			<div class="rounded-lg bg-fg/3 px-3 py-2.5 leading-tight" title={hint}>
				<div class="text-[11px] font-medium tracking-wide text-dim uppercase">{label}</div>
				<div class="mt-1.5 text-xl font-bold">{value}</div>
				{#if change}
					<Delta now={change[0]} before={change[1]} lower={change[2]} against="the {data.days} days before" />
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet list(title: string, head: string[], items: Item[])}
	{@const top = Math.max(1, ...items.map((item) => item.value))}
	<table class="atable">
		<thead>
			<tr>
				<th class="w-full">{title}</th>
				{#each head as column (column)}<th class="text-right">{column}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#each items as item (item.label)}
				<tr>
					<!-- the bar behind the label is the row's share of the top one -->
					<td class="relative max-w-0 truncate" title={item.title ?? item.label}>
						<span class="absolute inset-y-1 left-0 rounded-r-sm bg-accent/10" style:width="{(item.value / top) * 100}%"></span>
						<span class="relative">{item.label}</span>
					</td>
					<td class="text-right tabular-nums">{item.value}</td>
					{#each item.cells ?? [] as cell, index (index)}<td class="text-right text-dim tabular-nums">{cell}</td>{/each}
				</tr>
			{:else}
				<tr><td class="py-6 text-center text-dim" colspan={head.length + 1}>Nothing yet.</td></tr>
			{/each}
		</tbody>
	</table>
{/snippet}

{#snippet notConnected(service: string)}
	<p class="px-3 py-6 text-center text-sm text-dim">
		{service} isn&rsquo;t connected. <a class="text-cool" href={resolve("/admin/settings")}>Set it up in Settings</a>.
	</p>
{/snippet}

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Analytics</h1>
	<nav class="ml-auto flex rounded-lg border border-line p-0.5" aria-label="Range">
		{#each data.ranges as days (days)}
			<a
				class={[
					"rounded-md px-2.5 py-1 text-xs transition-colors",
					days === data.days ? "bg-fg/8 font-medium text-fg" : "text-dim hover:text-fg",
				]}
				href={href(days)}
				aria-current={days === data.days ? "page" : undefined}>{days} days</a
			>
		{/each}
	</nav>
</div>

<div class="grid gap-4">
	<section class="apanel">
		<header>
			Visitors
			{#if data.umamiUrl}
				<a class="ml-auto text-xs font-normal text-dim hover:text-fg" href={data.umamiUrl} target="_blank" rel="noopener">Umami</a>
			{/if}
		</header>
		{#if data.umami}
			{#await data.umami}
				<p class="px-3 py-6 text-center text-sm text-dim">Asking Umami&hellip;</p>
			{:then report}
				{@const before = report.previous}
				{@render tiles([
					["Visitors", compact.format(report.visitors), `${report.visitors} visitors`, [report.visitors, before.visitors]],
					["Visits", compact.format(report.visits), `${report.visits} visits`, [report.visits, before.visits]],
					["Views", compact.format(report.pageviews), `${report.pageviews} views`, [report.pageviews, before.pageviews]],
					[
						"Bounce rate",
						report.visits ? percent.format(report.bounces / report.visits) : "–",
						"Visits that saw one page",
						[ratio(report.bounces, report.visits), ratio(before.bounces, before.visits), true],
					],
					[
						"Visit duration",
						report.visits ? duration(report.totaltime / report.visits) : "–",
						"Average time per visit",
						[ratio(report.totaltime, report.visits), ratio(before.totaltime, before.visits)],
					],
				])}
				<VisitorsChart series={report.series} unit={report.unit} />
				<div class="grid border-t border-line lg:grid-cols-2">
					{@render list("Pages", ["Views"], report.pages.map((m) => ({ label: m.x, value: m.y })))}
					{@render list("Referrers", ["Visitors"], report.referrers.map((m) => ({ label: m.x || "Direct", value: m.y })))}
				</div>
				<div class="grid border-t border-line md:grid-cols-2 xl:grid-cols-4">
					{@render list("Countries", ["Visitors"], report.countries.map((m) => ({ label: country(m.x), value: m.y })))}
					{@render list("Browsers", ["Visitors"], report.browsers.map((m) => ({ label: m.x, value: m.y })))}
					{@render list("OS", ["Visitors"], report.os.map((m) => ({ label: m.x, value: m.y })))}
					{@render list("Devices", ["Visitors"], report.devices.map((m) => ({ label: m.x, value: m.y })))}
				</div>
			{:catch}
				<p class="px-3 py-6 text-center text-sm text-hot">
					Couldn&rsquo;t reach Umami. Saving it again in <a class="text-cool" href={resolve("/admin/settings")}>Settings</a> says why.
				</p>
			{/await}
		{:else}
			{@render notConnected("Umami")}
		{/if}
	</section>

	<section class="apanel">
		<header>
			Search
			<span class="text-xs font-normal text-dim">the last two or three days are still filling in</span>
		</header>
		{#if data.search}
			{#await data.search}
				<p class="px-3 py-6 text-center text-sm text-dim">Asking Search Console&hellip;</p>
			{:then stats}
				{@const before = stats.previous}
				{@render tiles([
					["Clicks", compact.format(stats.totals.clicks), `${stats.totals.clicks} clicks`, [stats.totals.clicks, before.clicks]],
					[
						"Impressions",
						compact.format(stats.totals.impressions),
						`${stats.totals.impressions} impressions`,
						[stats.totals.impressions, before.impressions],
					],
					["CTR", percent.format(stats.totals.ctr), undefined, [stats.totals.ctr, before.ctr]],
					// position 1 is the top: lower is better
					["Avg position", stats.totals.position.toFixed(1), undefined, [stats.totals.position, before.position, true]],
				])}
				<VisitorsChart
					series={stats.series}
					unit="day"
					rows={[
						{ key: "clicks", title: "Clicks", noun: "click" },
						{ key: "impressions", title: "Impressions", noun: "impression" },
					]}
				/>
				{@const rows = (items: typeof stats.queries, label = (key: string) => key) =>
					items.map((row) => ({
						label: label(row.key),
						title: row.key,
						value: row.clicks,
						cells: [String(row.impressions), percent.format(row.ctr), row.position.toFixed(1)],
					}))}
				{@const head = ["Clicks", "Impr.", "CTR", "Pos."]}
				<div class="grid border-t border-line xl:grid-cols-2">
					{@render list("Queries", head, rows(stats.queries))}
					{@render list("Pages", head, rows(stats.pages, path))}
				</div>
				<div class="grid border-t border-line xl:grid-cols-2">
					{@render list("Countries", head, rows(stats.countries, country))}
					{@render list("Devices", head, rows(stats.devices, (key) => key.toLowerCase()))}
				</div>
				<p class="border-t border-line px-3 py-2 text-xs">
					<a class="text-dim hover:text-fg" href={stats.url} target="_blank" rel="noopener">Open in Search Console</a>
				</p>
			{:catch}
				<p class="px-3 py-6 text-center text-sm text-hot">
					Couldn&rsquo;t reach Search Console. Saving it again in <a class="text-cool" href={resolve("/admin/settings")}>Settings</a> says why.
				</p>
			{/await}
		{:else}
			{@render notConnected("Search Console")}
		{/if}
	</section>
</div>
