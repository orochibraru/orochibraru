<script lang="ts">
	import { ArrowLeft } from "@lucide/svelte";
	import { resolve } from "$app/paths";

	let { data } = $props();
	const report = $derived(data.report);

	const count = new Intl.NumberFormat("en");
	/** "+12%" against the week before, or nothing when there was none. */
	function change(now: number, before: number) {
		if (!before) {
			return "";
		}
		const ratio = Math.round((now / before - 1) * 100);
		return ratio === 0
			? "same as the week before"
			: `${ratio > 0 ? "+" : "−"}${Math.abs(ratio)}% on the week before`;
	}
</script>

<svelte:head>
	<title>{data.label} | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1">
	<a class="inline-flex items-center gap-1.5 text-sm text-dim hover:text-fg" href={resolve("/admin/reports")}
		><ArrowLeft class="size-4" aria-hidden="true" /> Reports</a
	>
	<h1 class="text-base font-semibold">{data.label}</h1>
	<p class="w-full text-sm text-dim">{data.summary}</p>
</div>

{#if report.problems.length}
	<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">
		Couldn't read {report.problems.join(" or ")} for this week.
	</p>
{/if}

<div class="grid gap-4 lg:grid-cols-2">
	{#if report.visitors}
		<section class="apanel">
			<header>Visitors</header>
			<div class="grid grid-cols-2 gap-4 p-4">
				<div>
					<p class="text-2xl font-semibold">{count.format(report.visitors.visitors)}</p>
					<p class="text-xs text-dim">visitors, {change(report.visitors.visitors, report.visitors.before.visitors) || "no week before"}</p>
				</div>
				<div>
					<p class="text-2xl font-semibold">{count.format(report.visitors.pageviews)}</p>
					<p class="text-xs text-dim">pageviews, {change(report.visitors.pageviews, report.visitors.before.pageviews) || "no week before"}</p>
				</div>
			</div>
			{#each [["Top pages", report.visitors.pages], ["Top referrers", report.visitors.referrers]] as const as [title, rows] (title)}
				{#if rows.length}
					<table class="atable">
						<thead><tr><th class="w-full">{title}</th><th class="text-right">Views</th></tr></thead>
						<tbody>
							{#each rows as row (row.x)}
								<tr>
									<td class="max-w-0 truncate">{row.x}</td>
									<td class="text-right font-mono text-xs">{count.format(row.y)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/each}
		</section>
	{/if}

	{#if report.search}
		<section class="apanel">
			<header>Search</header>
			<div class="grid grid-cols-3 gap-4 p-4">
				<div>
					<p class="text-2xl font-semibold">{count.format(report.search.clicks)}</p>
					<p class="text-xs text-dim">clicks{change(report.search.clicks, report.search.before.clicks) ? `, ${change(report.search.clicks, report.search.before.clicks)}` : ""}</p>
				</div>
				<div>
					<p class="text-2xl font-semibold">{count.format(report.search.impressions)}</p>
					<p class="text-xs text-dim">impressions</p>
				</div>
				<div>
					<p class="text-2xl font-semibold">{report.search.position.toFixed(1)}</p>
					<p class="text-xs text-dim">average position</p>
				</div>
			</div>
			{#if report.search.queries.length}
				<table class="atable">
					<thead><tr><th class="w-full">Top queries</th><th class="text-right">Clicks</th><th class="wide text-right">Shown</th></tr></thead>
					<tbody>
						{#each report.search.queries as query (query.key)}
							<tr>
								<td class="max-w-0 truncate">{query.key}</td>
								<td class="text-right font-mono text-xs">{count.format(query.clicks)}</td>
								<td class="wide text-right font-mono text-xs text-dim">{count.format(query.impressions)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	{/if}

	<section class="apanel">
		<header>Posts</header>
		<div class="p-4 text-sm">
			{#each report.posts as item (item.slug)}
				<a class="block py-1 text-cool hover:underline" href={resolve("/blog/[slug]", { slug: item.slug })} target="_blank">{item.title}</a>
			{:else}
				<p class="text-dim">Nothing published this week.</p>
			{/each}
		</div>
	</section>

	<section class="apanel">
		<header>Docs sync</header>
		<div class="grid gap-2 p-4 text-sm">
			<p>
				<span class={["status normal-case", report.syncs.ok && "status-on"]}>{report.syncs.ok} ok</span>
				<span class={["status ml-3 normal-case", report.syncs.failed && "status-bad"]}>{report.syncs.failed} failed</span>
			</p>
			{#if report.syncs.failing.length}
				<p class="text-hot">Still failing: {report.syncs.failing.join(", ")}.</p>
				<a class="text-cool hover:underline" href={resolve("/admin/github")}>Open GitHub sync</a>
			{:else}
				<p class="text-dim">Every project ended the week in sync.</p>
			{/if}
		</div>
	</section>
</div>
