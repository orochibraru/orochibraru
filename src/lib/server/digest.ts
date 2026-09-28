// The overview's daily digest: a few plain sentences picked out of the Umami and
// Search Console numbers by fixed rules. No model, so the same numbers always read
// the same way.
import type { SearchRow, SearchStats } from "./search-console";
import type { Metric, UmamiReport, UmamiStats } from "./umami";

export type DigestInput = {
	/** The overview stats, plus reports for the last day and the last 30 days. */
	umami?: { stats: UmamiStats; day: UmamiReport; month: UmamiReport };
	search?: SearchStats;
};

// The knobs: how far from a usual day counts as news, and what makes a query worth naming.
const SWING = 0.2;
const MIN_VIEWS = 2;
const MIN_REFERRED = 2;
const LOW_CTR = 0.01;
const LOW_CTR_IMPRESSIONS = 100;
const NEAR_PAGE_ONE_IMPRESSIONS = 20;

const plural = (n: number, noun: string, many = `${noun}s`) => `${n} ${n === 1 ? noun : many}`;
const percent = (ratio: number) =>
	new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(
		Math.abs(ratio),
	);
/** "35% above", "12% below" or "about", in the caller's words; `before` is never 0. */
const change = (now: number, before: number, [up, down, same]: [string, string, string]) =>
	Math.abs(now / before - 1) < SWING
		? same
		: `${percent(now / before - 1)} ${now > before ? up : down}`;
const quoted = (text: string) => `“${text}”`;
const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, "") || "/";

/** One paragraph per source that has something to say. */
export function digest({ umami, search }: DigestInput): string[] {
	return [umami && visitors(umami), search && searches(search)].filter(
		(paragraph): paragraph is string => !!paragraph,
	);
}

function visitors({ stats, day, month }: NonNullable<DigestInput["umami"]>): string {
	const said: string[] = [];
	const last = stats.ranges[0];
	// the 30-day daily series ends on today, still filling: the days before it are the baseline
	const before = (stats.ranges[2]?.series ?? []).slice(0, -1).map((point) => point.views);
	const week = before.slice(-7);
	const usual = week.length ? Math.round(week.reduce((sum, n) => sum + n, 0) / week.length) : 0;

	if (stats.active) {
		said.push(`${plural(stats.active, "person", "people")} on the site right now.`);
	}
	if (!last?.pageviews) {
		said.push("No visits in the last 24 hours.");
	} else {
		const lead = `${plural(last.pageviews, "view")} from ${plural(last.visitors, "visitor")} in the last 24 hours`;
		said.push(
			usual
				? `${lead}, ${change(last.pageviews, usual, ["above", "below", "about"])} a usual day (${usual}).`
				: `${lead}.`,
		);
		if (before.length >= 7 && last.pageviews > Math.max(...before)) {
			said.push("The busiest day in a month.");
		}
	}
	const top = day.pages[0];
	if (top && top.y >= MIN_VIEWS) {
		said.push(`Most read: ${top.x} (${plural(top.y, "view")}).`);
	}
	// a referrer whose 30 days are mostly the last 24 hours is news; a steady one isn't
	const fresh = day.referrers.find(({ x, y }) => {
		const monthly = month.referrers.find((row) => row.x === x)?.y ?? 0;
		return x && y >= MIN_REFERRED && monthly <= y * 1.5;
	});
	if (fresh) {
		said.push(`New traffic from ${fresh.x}: ${plural(fresh.y, "visitor")} in the last 24 hours.`);
	}
	said.push(...lastMonth(month, fresh?.x));
	return said.join(" ");
}

const regions = new Intl.DisplayNames(["en"], { type: "region" });
const share = (part: number, rows: Metric[]) => part / Math.max(1, total(rows));
const total = (rows: Metric[]) => rows.reduce((sum, row) => sum + row.y, 0);

/** Who the site's audience is over 30 days: steadier than any one day. */
function lastMonth(month: UmamiReport, fresh?: string): string[] {
	const said: string[] = [];
	// "" is direct traffic: not a referrer
	const referred = month.referrers.filter((row) => row.x);
	const biggest = referred[0];
	if (biggest && biggest.x !== fresh && biggest.y >= MIN_REFERRED) {
		said.push(
			`Biggest referrer over 30 days: ${biggest.x}, ${plural(biggest.y, "visitor")} (${percent(share(biggest.y, referred))} of referred traffic).`,
		);
	}
	// Umami files visitors it can't place under an empty or made-up code
	const country = month.countries.find((row) => /^[A-Z]{2}$/i.test(row.x));
	if (country && country.y >= MIN_REFERRED) {
		said.push(
			`Top country: ${regions.of(country.x.toUpperCase()) ?? country.x} (${percent(share(country.y, month.countries))} of visitors).`,
		);
	}
	const handheld = total(month.devices.filter((row) => row.x === "mobile" || row.x === "tablet"));
	if (total(month.devices)) {
		said.push(`${percent(share(handheld, month.devices))} read on a phone or tablet.`);
	}
	return said;
}

function searches(stats: SearchStats): string {
	const said: string[] = [];
	// the last two or three days are still empty: count weeks back from the last day with data
	const end = stats.series.findLastIndex((point) => point.impressions > 0);
	if (end < 0) {
		return "No search impressions yet.";
	}
	const sum = (from: number, to: number) =>
		stats.series.slice(Math.max(from, 0), to).reduce(
			(total, point) => ({
				clicks: total.clicks + point.clicks,
				impressions: total.impressions + point.impressions,
			}),
			{ clicks: 0, impressions: 0 },
		);
	const week = sum(end - 6, end + 1);
	const prior = sum(end - 13, end - 6);
	const through = new Date(stats.series[end]?.t ?? 0).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	let lead = `Search, 7 days to ${through}: ${plural(week.clicks, "click")} from ${plural(week.impressions, "impression")}`;
	if (prior.impressions) {
		lead += `, ${change(week.impressions, prior.impressions, ["up on", "down on", "about the same as"])} the week before`;
	}
	said.push(`${lead}.`);

	const top = stats.queries[0];
	if (top?.clicks) {
		said.push(
			`Top query: ${quoted(top.key)} (${plural(top.clicks, "click")}, position ${top.position.toFixed(1)}).`,
		);
	}
	const ignored = stats.queries.find(
		(row) => row.impressions >= LOW_CTR_IMPRESSIONS && row.ctr < LOW_CTR && row.position <= 10,
	);
	if (ignored) {
		said.push(
			`${quoted(ignored.key)} shows on page one (${plural(ignored.impressions, "impression")}) but a ${percent(ignored.ctr)} click rate: its title or description may not match what people look for.`,
		);
	}
	const close = nearPageOne(stats.queries);
	if (close) {
		said.push(
			`${quoted(close.key)} sits just off page one, at position ${close.position.toFixed(1)} with ${plural(close.impressions, "impression")}.`,
		);
	}
	const page = stats.pages[0];
	if (page?.clicks) {
		said.push(`Top page from search: ${path(page.key)} (${plural(page.clicks, "click")}).`);
	}
	return said.join(" ");
}

/** The most seen query on page two: the cheapest one to move up. */
function nearPageOne(rows: SearchRow[]) {
	return rows
		.filter(
			(row) =>
				row.position > 10 && row.position <= 20 && row.impressions >= NEAR_PAGE_ONE_IMPRESSIONS,
		)
		.sort((a, b) => b.impressions - a.impressions)[0];
}
