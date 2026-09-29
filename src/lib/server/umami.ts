// Visitor stats for this site from a self-hosted Umami v3, for the admin overview.
// The connection is set in the admin and kept in one row, the API key sealed.
import { open, seal } from "./crypto";
import { getDb } from "./db";
import { umami } from "./db/schema";

export type UmamiConfig = { url: string; apiKey: string; websiteId: string };

export type UmamiStats = {
	/** The website's dashboard on the Umami instance. */
	url: string;
	/** Visitors on the site right now (the last 5 minutes, per Umami). */
	active: number;
	ranges: {
		label: string;
		unit: Unit;
		visitors: number;
		pageviews: number;
		/** The same over the span before the range; null for all time, which has none. */
		previous: { visitors: number; pageviews: number } | null;
		/** One point per unit across the range, empty ones included, oldest first. */
		series: Point[];
	}[];
};

type Unit = "hour" | "day" | "month";
/** t is the start of the bucket, in UTC ms. */
export type Point = { t: number; views: number; visits: number };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Rolling windows ending now; null is all time. */
const RANGES: { label: string; ms: number | null; unit: Unit }[] = [
	{ label: "24 hours", ms: DAY, unit: "hour" },
	{ label: "7 days", ms: 7 * DAY, unit: "day" },
	{ label: "30 days", ms: 30 * DAY, unit: "day" },
	{ label: "365 days", ms: 365 * DAY, unit: "month" },
	{ label: "All time", ms: null, unit: "month" },
];

function floor(t: number, unit: Unit) {
	const d = new Date(t);
	if (unit === "hour") {
		return t - (t % HOUR);
	}
	return unit === "day"
		? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
		: Date.UTC(d.getUTCFullYear(), d.getUTCMonth());
}

function next(t: number, unit: Unit) {
	const d = new Date(t);
	return unit === "month"
		? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1)
		: t + (unit === "hour" ? HOUR : DAY);
}

type Buckets = { x: string; y: number }[];

/**
 * Umami leaves out empty buckets: put them back, from the range's start (or, for
 * all time, the first bucket with data) to now. Buckets are UTC.
 */
export function fillSeries(
	views: Buckets,
	visits: Buckets,
	start: number | null,
	now: number,
	unit: Unit,
): Point[] {
	const byTime = (buckets: Buckets) =>
		new Map(buckets.map(({ x, y }) => [floor(Date.parse(x), unit), y]));
	const viewsAt = byTime(views);
	const visitsAt = byTime(visits);
	const first = start ?? Math.min(...viewsAt.keys(), now);
	const series: Point[] = [];
	for (let t = floor(first, unit); t <= now; t = next(t, unit)) {
		series.push({ t, views: viewsAt.get(t) ?? 0, visits: visitsAt.get(t) ?? 0 });
	}
	return series;
}
const TTL = 60 * 1000;

let cache: { stats: UmamiStats; until: number } | undefined;

/** The saved connection, key unsealed; null until one is saved. */
export async function getUmami(): Promise<UmamiConfig | null> {
	const row = getDb().select().from(umami).get();
	if (!row) {
		return null;
	}
	return { url: row.url, websiteId: row.websiteId, apiKey: await open(row.apiKey) };
}

export class UmamiError extends Error {}

/**
 * Saves a well-formed connection even when Umami can't be reached, then tests it:
 * resolves to what's wrong with it, or null. A blank API key keeps the saved one.
 */
export async function saveUmami(input: UmamiConfig): Promise<string | null> {
	const config = {
		url: input.url.trim().replace(/\/+$/, ""),
		websiteId: input.websiteId.trim(),
		apiKey: input.apiKey.trim() || (await getUmami())?.apiKey || "",
	};
	if (!URL.canParse(config.url) || !config.websiteId || !config.apiKey) {
		throw new UmamiError("Enter the Umami URL, the website ID and an API key.");
	}
	const values = { id: 1, ...config, apiKey: await seal(config.apiKey) };
	getDb().insert(umami).values(values).onConflictDoUpdate({ target: umami.id, set: values }).run();
	return testUmami(config, true);
}

/** What's wrong with the connection, or null when it works. Fresh drops the cache. */
export async function testUmami(config: UmamiConfig, fresh = false): Promise<string | null> {
	if (fresh) {
		cache = undefined;
		reports.clear();
	}
	try {
		await umamiStats(config);
		return null;
	} catch (cause) {
		console.error("Umami connection test failed:", cause);
		return `Couldn't reach Umami with this URL, website ID and API key: ${cause instanceof Error ? cause.message : cause}`;
	}
}

export function forgetUmami() {
	getDb().delete(umami).run();
	cache = undefined;
	reports.clear();
}

/** Cached a minute, and the last good result outlives an outage. */
export async function umamiStats(config: UmamiConfig, now = Date.now()): Promise<UmamiStats> {
	if (cache && cache.until > now) {
		return cache.stats;
	}
	try {
		const stats = await fetchStats(config, now);
		cache = { stats, until: now + TTL };
		return stats;
	} catch (error) {
		if (cache) {
			return cache.stats;
		}
		throw error;
	}
}

/** GET one of the website's API endpoints. */
async function request<T>(config: UmamiConfig, path: string): Promise<T> {
	const base = `${config.url}/api/websites/${encodeURIComponent(config.websiteId)}`;
	const response = await fetch(base + path, {
		headers: { authorization: `Bearer ${config.apiKey}` },
		signal: AbortSignal.timeout(5000),
	});
	if (!response.ok) {
		throw new Error(`Umami ${path} failed with status ${response.status}`);
	}
	return response.json() as Promise<T>;
}

export type Metric = { x: string; y: number };

type Totals = {
	visitors: number;
	visits: number;
	pageviews: number;
	/** Visits that saw one page. */
	bounces: number;
	/** Seconds, summed over visits. */
	totaltime: number;
};

export type UmamiReport = Totals & {
	days: number;
	unit: Unit;
	/** The same totals over the `days` before the range. */
	previous: Totals;
	series: Point[];
	pages: Metric[];
	referrers: Metric[];
	countries: Metric[];
	browsers: Metric[];
	os: Metric[];
	devices: Metric[];
};

const reports = new Map<number, { report: UmamiReport; until: number }>();

/** The last `days` days in detail, for the analytics page: cached like umamiStats. */
export async function umamiReport(
	config: UmamiConfig,
	days: number,
	now = Date.now(),
): Promise<UmamiReport> {
	const cached = reports.get(days);
	if (cached && cached.until > now) {
		return cached.report;
	}
	try {
		const report = await fetchReport(config, days, now);
		reports.set(days, { report, until: now + TTL });
		return report;
	} catch (error) {
		if (cached) {
			return cached.report;
		}
		throw error;
	}
}

async function fetchReport(config: UmamiConfig, days: number, now: number): Promise<UmamiReport> {
	const start = now - days * DAY;
	const window = `startAt=${start}&endAt=${now}`;
	const unit: Unit = days > 90 ? "month" : "day";
	const metric = (type: string, limit = 10) =>
		request<Metric[]>(config, `/metrics?${window}&type=${type}&limit=${limit}`);
	const [stats, previous, buckets, pages, referrers, countries, browsers, os, devices] =
		await Promise.all([
			request<Totals>(config, `/stats?${window}`),
			request<Totals>(config, `/stats?startAt=${start - days * DAY}&endAt=${start}`),
			request<{ pageviews: Buckets; sessions: Buckets }>(
				config,
				`/pageviews?${window}&unit=${unit}&timezone=UTC`,
			),
			metric("path", 25),
			metric("referrer", 25),
			metric("country"),
			metric("browser"),
			metric("os"),
			metric("device"),
		]);
	return {
		days,
		unit,
		visitors: stats.visitors,
		visits: stats.visits,
		pageviews: stats.pageviews,
		bounces: stats.bounces,
		totaltime: stats.totaltime,
		previous: {
			visitors: previous.visitors,
			visits: previous.visits,
			pageviews: previous.pageviews,
			bounces: previous.bounces,
			totaltime: previous.totaltime,
		},
		series: fillSeries(buckets.pageviews, buckets.sessions, start, now, unit),
		pages,
		referrers,
		countries,
		browsers,
		os,
		devices,
	};
}

async function fetchStats(config: UmamiConfig, now: number): Promise<UmamiStats> {
	const get = <T>(path: string) => request<T>(config, path);
	const [active, ...ranges] = await Promise.all([
		get<{ visitors: number }>("/active"),
		...RANGES.map(async ({ label, ms, unit }) => {
			const start = ms === null ? null : now - ms;
			const window = `startAt=${start ?? 0}&endAt=${now}`;
			// ponytail: buckets are UTC days and months, off by the admin's offset; pass their timezone if that matters
			type Counts = { visitors: number; pageviews: number };
			const [{ visitors, pageviews }, before, buckets] = await Promise.all([
				get<Counts>(`/stats?${window}`),
				start === null || ms === null
					? null
					: get<Counts>(`/stats?startAt=${start - ms}&endAt=${start}`),
				get<{ pageviews: Buckets; sessions: Buckets }>(
					`/pageviews?${window}&unit=${unit}&timezone=UTC`,
				),
			]);
			const series = fillSeries(buckets.pageviews, buckets.sessions, start, now, unit);
			const previous = before && { visitors: before.visitors, pageviews: before.pageviews };
			return { label, unit, visitors, pageviews, previous, series };
		}),
	]);
	return {
		url: `${config.url}/websites/${encodeURIComponent(config.websiteId)}`,
		active: active.visitors,
		ranges,
	};
}
