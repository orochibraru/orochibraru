<script lang="ts">
	/** A stat's change from the period before, as a tinted pill; nothing when both are 0. */
	let {
		now,
		before,
		lower = false,
		against,
	}: {
		now: number;
		before: number;
		/** Lower is better: bounce rate, search position. */
		lower?: boolean;
		/** The period before, for the tooltip: "the 7 days before". */
		against: string;
	} = $props();

	const signed = new Intl.NumberFormat("en", {
		style: "percent",
		maximumFractionDigits: 0,
		signDisplay: "exceptZero",
	});
	const delta = $derived(before ? now / before - 1 : 0);
</script>

{#if now || before}
	<span
		class={[
			"mt-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
			!delta ? "bg-fg/6 text-dim" : delta > 0 !== lower ? "bg-up/12 text-up" : "bg-hot/10 text-hot",
		]}
		title={before ? `vs ${against}` : `nothing in ${against}`}
		>{before ? `${delta > 0 ? "▲ " : delta < 0 ? "▼ " : ""}${signed.format(delta)}` : "new"}</span
	>
{/if}
