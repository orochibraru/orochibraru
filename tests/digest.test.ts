import { describe, expect, test } from "bun:test";
import { type DigestInput, digest } from "../src/lib/server/digest";
import type { SearchRow, SearchStats } from "../src/lib/server/search-console";
import type { UmamiReport, UmamiStats } from "../src/lib/server/umami";

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse("2026-09-01");

/** 30 days of `views`, today last: the shape umamiStats gives the 30-day range. */
function umami(last24h: number, daily: number[], extra: Partial<UmamiStats> = {}) {
	const range = (views: number[]) => ({
		label: "",
		unit: "day" as const,
		visitors: views.at(-1) ?? 0,
		pageviews: views.at(-1) ?? 0,
		series: views.map((n, i) => ({ t: START + i * DAY, views: n, visits: n })),
	});
	const stats: UmamiStats = {
		url: "",
		active: 0,
		ranges: [{ ...range([last24h]), visitors: Math.ceil(last24h / 2) }, range([]), range(daily)],
		...extra,
	};
	const report = (fields: Partial<UmamiReport> = {}): UmamiReport => ({
		days: 1,
		unit: "day",
		visitors: 0,
		visits: 0,
		pageviews: 0,
		bounces: 0,
		totaltime: 0,
		series: [],
		pages: [],
		referrers: [],
		countries: [],
		browsers: [],
		os: [],
		devices: [],
		...fields,
	});
	return { stats, day: report(), month: report(), report };
}

const row = (key: string, fields: Partial<SearchRow>): SearchRow => ({
	key,
	clicks: 0,
	impressions: 0,
	ctr: 0,
	position: 5,
	...fields,
});

/** 28 days, the last three empty the way Search Console leaves them. */
function search(
	impressions: (i: number) => number,
	fields: Partial<SearchStats> = {},
): SearchStats {
	return {
		url: "",
		days: 28,
		totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
		series: Array.from({ length: 28 }, (_, i) => ({
			t: START + i * DAY,
			clicks: i < 25 ? 1 : 0,
			impressions: i < 25 ? impressions(i) : 0,
		})),
		queries: [],
		pages: [],
		countries: [],
		devices: [],
		...fields,
	};
}

const text = (input: DigestInput) => digest(input).join("\n");

describe("the visitors paragraph", () => {
	test("compares the last 24 hours with a usual day", () => {
		const flat = Array(30).fill(10);
		expect(text({ umami: umami(15, flat) })).toContain(
			"15 views from 8 visitors in the last 24 hours, 50% above a usual day (10).",
		);
		expect(text({ umami: umami(11, flat) })).toContain("about a usual day (10)");
		expect(text({ umami: umami(5, flat) })).toContain("50% below a usual day (10)");
	});

	test("calls out the busiest day in a month, and an empty one", () => {
		expect(text({ umami: umami(40, Array(30).fill(10)) })).toContain("The busiest day in a month.");
		expect(text({ umami: umami(10, Array(30).fill(10)) })).not.toContain("busiest");
		expect(text({ umami: umami(0, Array(30).fill(10)) })).toContain(
			"No visits in the last 24 hours.",
		);
	});

	test("names who's on now, the most read page and a new referrer, not a steady one", () => {
		const input = umami(10, Array(30).fill(10), { active: 1 });
		input.day = input.report({
			pages: [{ x: "/blog/hello", y: 6 }],
			referrers: [
				{ x: "news.ycombinator.com", y: 5 },
				{ x: "google.com", y: 4 },
			],
		});
		input.month = input.report({
			referrers: [
				{ x: "google.com", y: 90 },
				{ x: "news.ycombinator.com", y: 5 },
			],
		});
		const said = text({ umami: input });
		expect(said).toContain("1 person on the site right now.");
		expect(said).toContain("Most read: /blog/hello (6 views).");
		expect(said).toContain(
			"New traffic from news.ycombinator.com: 5 visitors in the last 24 hours.",
		);
		expect(said).not.toContain("New traffic from google.com");
	});
});

describe("the month in the visitors paragraph", () => {
	test("names the biggest referrer, the top country and the phone share", () => {
		const input = umami(10, Array(30).fill(10));
		input.month = input.report({
			referrers: [
				{ x: "", y: 500 },
				{ x: "google.com", y: 60 },
				{ x: "github.com", y: 40 },
			],
			countries: [
				{ x: "", y: 30 },
				{ x: "FR", y: 45 },
				{ x: "US", y: 25 },
			],
			devices: [
				{ x: "desktop", y: 70 },
				{ x: "mobile", y: 20 },
				{ x: "tablet", y: 10 },
			],
		});
		const said = text({ umami: input });
		expect(said).toContain(
			"Biggest referrer over 30 days: google.com, 60 visitors (60% of referred traffic).",
		);
		expect(said).toContain("Top country: France (45% of visitors).");
		expect(said).toContain("30% read on a phone or tablet.");
	});

	test("doesn't repeat a referrer already called new", () => {
		const input = umami(10, Array(30).fill(10));
		input.day = input.report({ referrers: [{ x: "news.ycombinator.com", y: 9 }] });
		input.month = input.report({ referrers: [{ x: "news.ycombinator.com", y: 9 }] });
		expect(text({ umami: input })).not.toContain("Biggest referrer");
	});
});

describe("the search paragraph", () => {
	test("compares the last 7 days with data to the week before, skipping the empty tail", () => {
		// days 11-17 see 10 a day, days 18-24 see 15: the last with data is Sep 25
		const said = text({ search: search((i) => (i >= 18 ? 15 : 10)) });
		expect(said).toContain(
			"Search, 7 days to Sep 25: 7 clicks from 105 impressions, 50% up on the week before.",
		);
	});

	test("points at a query nobody clicks and one just off page one", () => {
		const said = text({
			search: search(() => 10, {
				queries: [
					row("orochibraru", { clicks: 12, impressions: 50, position: 1.2 }),
					row("sveltekit sqlite", { impressions: 400, ctr: 0.0025, position: 6 }),
					row("bun binary", { impressions: 30, position: 14.4 }),
					row("rare", { impressions: 5, position: 12 }),
				],
				pages: [row("https://orochibraru.com/blog/hello", { clicks: 9 })],
			}),
		});
		expect(said).toContain("Top query: “orochibraru” (12 clicks, position 1.2).");
		expect(said).toContain(
			"“sveltekit sqlite” shows on page one (400 impressions) but a 0.3% click rate",
		);
		expect(said).toContain(
			"“bun binary” sits just off page one, at position 14.4 with 30 impressions.",
		);
		expect(said).not.toContain("rare");
		expect(said).toContain("Top page from search: /blog/hello (9 clicks).");
	});

	test("says so when there's nothing yet", () => {
		expect(digest({ search: search(() => 0) })).toEqual(["No search impressions yet."]);
		expect(digest({})).toEqual([]);
	});
});
