// Search stats for this site from Google Search Console, for the admin overview
// and analytics. A service account added as a user on the property reads them:
// its JSON key is set in the admin settings and kept in one row, sealed.
import { open, seal } from "./crypto";
import { getDb } from "./db";
import { searchConsole } from "./db/schema";

export type SearchConsoleConfig = { site: string; serviceAccount: string };

type Totals = { clicks: number; impressions: number; ctr: number; position: number };
/** Google leaves keys out of rows from a query without dimensions. */
type Row = Totals & { keys?: string[] };
export type SearchRow = Totals & { key: string };

export type SearchStats = {
	/** The property's performance report in Search Console. */
	url: string;
	days: number;
	totals: Totals;
	/** One point per day of the range, empty ones included, oldest first; t is UTC ms. */
	series: { t: number; clicks: number; impressions: number }[];
	queries: SearchRow[];
	pages: SearchRow[];
	countries: SearchRow[];
	devices: SearchRow[];
};

const DAY = 24 * 60 * 60 * 1000;
// Google refreshes the numbers a few times a day at most
const TTL = 60 * 60 * 1000;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** By range, in days. */
const cache = new Map<number, { stats: SearchStats; until: number }>();

export class SearchConsoleError extends Error {}

/** The saved connection, key unsealed; null until one is saved. */
export async function getSearchConsole(): Promise<SearchConsoleConfig | null> {
	const row = getDb().select().from(searchConsole).get();
	if (!row) {
		return null;
	}
	return { site: row.site, serviceAccount: await open(row.serviceAccount) };
}

/**
 * Saves a well-formed connection even when Google turns it down (the property
 * access or the API may be set up later), then tests it: resolves to what's
 * wrong with it, or null. A blank key keeps the saved one.
 */
export async function saveSearchConsole(input: SearchConsoleConfig): Promise<string | null> {
	const config = {
		site: input.site.trim(),
		serviceAccount: input.serviceAccount.trim() || (await getSearchConsole())?.serviceAccount || "",
	};
	if (!config.site || !config.serviceAccount) {
		throw new SearchConsoleError("Enter the property and the service account's JSON key.");
	}
	parseKey(config.serviceAccount);
	const values = { id: 1, ...config, serviceAccount: await seal(config.serviceAccount) };
	getDb()
		.insert(searchConsole)
		.values(values)
		.onConflictDoUpdate({ target: searchConsole.id, set: values })
		.run();
	return testSearchConsole(config, true);
}

/**
 * What's wrong with the connection, or null when it works. Fresh drops the cache,
 * so a fix made on Google's side shows now rather than in an hour.
 */
export async function testSearchConsole(
	config: SearchConsoleConfig,
	fresh = false,
): Promise<string | null> {
	if (fresh) {
		cache.clear();
	}
	try {
		await searchStats(config);
		return null;
	} catch (cause) {
		console.error("Search Console connection test failed:", cause);
		return cause instanceof SearchConsoleError
			? cause.message
			: `Couldn't reach Search Console: ${cause instanceof Error ? `${cause.name}: ${cause.message}` : cause}`;
	}
}

export function forgetSearchConsole() {
	getDb().delete(searchConsole).run();
	cache.clear();
}

/** The last `days` days. Cached an hour, and the last good result outlives an outage. */
export async function searchStats(
	config: SearchConsoleConfig,
	days = 28,
	now = Date.now(),
): Promise<SearchStats> {
	const cached = cache.get(days);
	if (cached && cached.until > now) {
		return cached.stats;
	}
	try {
		const stats = await fetchStats(config, days, now);
		cache.set(days, { stats, until: now + TTL });
		return stats;
	} catch (error) {
		if (cached) {
			return cached.stats;
		}
		throw error;
	}
}

function parseKey(json: string): { client_email: string; private_key: string } {
	let key: unknown;
	try {
		key = JSON.parse(json);
	} catch {
		throw new SearchConsoleError("The key isn't JSON: paste the whole file Google downloaded.");
	}
	const { client_email, private_key } = (key ?? {}) as Record<string, unknown>;
	if (typeof client_email !== "string" || typeof private_key !== "string") {
		throw new SearchConsoleError(
			"The key has no client_email or private_key: is it a service account key?",
		);
	}
	return { client_email, private_key };
}

const base64url = (data: string | ArrayBuffer) =>
	(typeof data === "string" ? Buffer.from(data) : Buffer.from(data)).toString("base64url");

/** A signed JWT traded for an access token: Google's service account flow. */
async function accessToken(serviceAccount: string, now: number): Promise<string> {
	const { client_email, private_key } = parseKey(serviceAccount);
	const der = Buffer.from(private_key.replace(/-----[^-]+-----|\s/g, ""), "base64");
	const signer = await crypto.subtle
		.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
		.catch(() => {
			throw new SearchConsoleError("The key's private_key can't be read: paste the file unedited.");
		});
	const iat = Math.floor(now / 1000);
	const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
		JSON.stringify({
			iss: client_email,
			scope: SCOPE,
			aud: "https://oauth2.googleapis.com/token",
			iat,
			exp: iat + 3600,
		}),
	)}`;
	const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signer, Buffer.from(unsigned));
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: `${unsigned}.${base64url(signature)}`,
		}),
		signal: AbortSignal.timeout(5000),
	});
	if (!response.ok) {
		// invalid_grant: a deleted or disabled key, or this server's clock off by minutes
		const body = (await response.json().catch(() => null)) as {
			error?: string;
			error_description?: string;
		} | null;
		throw new SearchConsoleError(
			`Google refused the key (${response.status}): ${body?.error_description ?? body?.error ?? response.statusText}`,
		);
	}
	return ((await response.json()) as { access_token: string }).access_token;
}

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

async function fetchStats(
	config: SearchConsoleConfig,
	span: number,
	now: number,
): Promise<SearchStats> {
	const token = await accessToken(config.serviceAccount, now);
	// ponytail: UTC days, where Search Console counts Pacific days; off by a few hours at the edges
	const start = Date.parse(isoDay(now - (span - 1) * DAY));
	const range = { startDate: isoDay(start), endDate: isoDay(now), dataState: "all" };
	const query = async (dimensions: string[], rowLimit = 25): Promise<Row[]> => {
		const response = await fetch(
			`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.site)}/searchAnalytics/query`,
			{
				method: "POST",
				headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
				body: JSON.stringify({ ...range, dimensions, rowLimit }),
				// Search Console takes seconds per query, more on long ranges
				signal: AbortSignal.timeout(20_000),
			},
		);
		if (!response.ok) {
			// "User does not have sufficient permission for site ...", "API has not been used in
			// project ...": Google's own words say what to fix
			const body = (await response.json().catch(() => null)) as {
				error?: { message?: string };
			} | null;
			throw new SearchConsoleError(
				`Search Console said (${response.status}): ${body?.error?.message ?? response.statusText}`,
			);
		}
		return ((await response.json()) as { rows?: Row[] }).rows ?? [];
	};
	const [totals, days, queries, pages, countries, devices] = await Promise.all([
		query([]),
		query(["date"], span),
		query(["query"]),
		query(["page"]),
		query(["country"], 10),
		query(["device"]),
	]);
	const byDay = new Map(days.map((row) => [row.keys?.[0], row]));
	const series: SearchStats["series"] = [];
	for (let t = start; t <= now; t += DAY) {
		const row = byDay.get(isoDay(t));
		series.push({ t, clicks: row?.clicks ?? 0, impressions: row?.impressions ?? 0 });
	}
	const keyed = (rows: Row[]) =>
		rows.map(({ keys, ...rest }) => ({ key: keys?.[0] ?? "", ...rest }));
	return {
		url: `https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(config.site)}`,
		days: span,
		totals: keyed(totals)[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
		series,
		queries: keyed(queries),
		pages: keyed(pages),
		countries: keyed(countries),
		devices: keyed(devices),
	};
}
