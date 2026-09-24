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

/** Tests the connection before saving it. A blank API key keeps the saved one. */
export async function saveUmami(input: UmamiConfig) {
	const config = {
		url: input.url.trim().replace(/\/+$/, ""),
		websiteId: input.websiteId.trim(),
		apiKey: input.apiKey.trim() || (await getUmami())?.apiKey || "",
	};
	if (!URL.canParse(config.url) || !config.websiteId || !config.apiKey) {
		throw new UmamiError("Enter the Umami URL, the website ID and an API key.");
	}
	try {
		await fetchStats(config, Date.now());
	} catch (cause) {
		console.error("Umami connection test failed:", cause);
		throw new UmamiError("Couldn't reach Umami with this URL, website ID and API key.");
	}
	const values = { id: 1, ...config, apiKey: await seal(config.apiKey) };
	getDb().insert(umami).values(values).onConflictDoUpdate({ target: umami.id, set: values }).run();
	cache = undefined;
}

export function forgetUmami() {
	getDb().delete(umami).run();
	cache = undefined;
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

async function fetchStats(config: UmamiConfig, now: number): Promise<UmamiStats> {
	const base = `${config.url}/api/websites/${encodeURIComponent(config.websiteId)}`;
	const get = async <T>(path: string): Promise<T> => {
		const response = await fetch(base + path, {
			headers: { authorization: `Bearer ${config.apiKey}` },
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) {
			throw new Error(`Umami ${path} failed with status ${response.status}`);
		}
		return response.json() as Promise<T>;
	};
	const [active, ...ranges] = await Promise.all([
		get<{ visitors: number }>("/active"),
		...RANGES.map(async ({ label, ms, unit }) => {
			const start = ms === null ? null : now - ms;
			const window = `startAt=${start ?? 0}&endAt=${now}`;
			// ponytail: buckets are UTC days and months, off by the admin's offset; pass their timezone if that matters
			const [{ visitors, pageviews }, buckets] = await Promise.all([
				get<{ visitors: number; pageviews: number }>(`/stats?${window}`),
				get<{ pageviews: Buckets; sessions: Buckets }>(
					`/pageviews?${window}&unit=${unit}&timezone=UTC`,
				),
			]);
			const series = fillSeries(buckets.pageviews, buckets.sessions, start, now, unit);
			return { label, unit, visitors, pageviews, series };
		}),
	]);
	return {
		url: `${config.url}/websites/${encodeURIComponent(config.websiteId)}`,
		active: active.visitors,
		ranges,
	};
}
