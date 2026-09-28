<script lang="ts">
	type Row = { key: string; title: string; noun: string };

	// Views and visits (clicks and impressions) are an order of magnitude apart: two
	// charts on one time axis, never two scales on one chart. Hovering a column reads out both.
	let {
		series,
		unit,
		rows = [
			{ key: "views", title: "Views", noun: "view" },
			{ key: "visits", title: "Visits", noun: "visit" },
		],
	}: {
		series: ({ t: number } & Record<string, number>)[];
		unit: "hour" | "day" | "month";
		rows?: Row[];
	} = $props();

	let hovered = $state<number | null>(null);
	const point = $derived(hovered === null ? null : series[hovered]);

	// hours are instants, shown local; days and months are UTC buckets, shown as such
	const format = $derived(
		new Intl.DateTimeFormat(
			"en",
			unit === "hour"
				? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
				: unit === "day"
					? { month: "short", day: "numeric", timeZone: "UTC" }
					: { month: "short", year: "numeric", timeZone: "UTC" },
		),
	);
	const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
	const max = (key: string) => Math.max(1, ...series.map((p) => p[key] ?? 0));
</script>

<div class="px-3 pb-3" role="presentation" onpointerleave={() => (hovered = null)}>
	<p class="h-5 text-xs text-dim tabular-nums">
		{#if point}
			<span class="text-fg">{format.format(point.t)}</span>{#each rows as row (row.key)}
				&middot; {count(point[row.key] ?? 0, row.noun)}
			{/each}
		{:else if series.length}
			{format.format(series.at(0)?.t)} &ndash; {format.format(series.at(-1)?.t)}
		{/if}
	</p>
	{#each rows as row (row.key)}
		{@const top = max(row.key)}
		{@const value = (p: (typeof series)[number]) => p[row.key] ?? 0}
		<div class="mt-2 flex justify-between text-[11px] text-dim">
			<span>{row.title} per {unit}</span>
			<span class="tabular-nums">max {top}</span>
		</div>
		<div
			class="flex h-20 items-end gap-0.5 border-b border-line"
			role="img"
			aria-label="{row.title} per {unit}, at most {top}"
		>
			{#each series as p, index (p.t)}
				<!-- the hit target is the whole column, not just the bar -->
				<div class="flex h-full flex-1 items-end justify-center" role="presentation" onpointerenter={() => (hovered = index)}>
					<div
						class={[
							"w-full max-w-8 rounded-t-sm bg-accent transition-opacity",
							hovered !== null && hovered !== index && "opacity-35",
						]}
						style:height={value(p) ? `max(2px, ${(value(p) / top) * 100}%)` : "0"}
					></div>
				</div>
			{/each}
		</div>
	{/each}
</div>
