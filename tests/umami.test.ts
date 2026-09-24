import { afterAll, describe, expect, test } from "bun:test";
import { umami } from "../src/lib/server/db/schema";
import { env } from "../src/lib/server/env";
import { fillSeries, forgetUmami, getUmami, saveUmami, umamiStats } from "../src/lib/server/umami";
import { freshSite } from "./helpers";

env.authSecret = "test-secret-test-secret-test-secret";
const site = freshSite();

const config = { url: "https://umami.test", apiKey: "key", websiteId: "site" };
const realFetch = globalThis.fetch;
const requests: string[] = [];
let down = false;

// an Umami that knows one API key
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
	const url = String(input);
	requests.push(url);
	if (down) {
		return new Response("", { status: 502 });
	}
	if (new Headers(init?.headers).get("authorization") !== "Bearer key") {
		return new Response("", { status: 401 });
	}
	if (url.includes("/pageviews?")) {
		const bucket = [{ x: "1970-01-12T13:00:00Z", y: 5 }];
		return Response.json({ pageviews: bucket, sessions: bucket });
	}
	return Response.json(url.endsWith("/active") ? { visitors: 3 } : { visitors: 10, pageviews: 42 });
}) as typeof fetch;
afterAll(() => {
	globalThis.fetch = realFetch;
	site.cleanup();
});

describe("the Umami connection", () => {
	test("is null until one is saved", async () => {
		expect(await getUmami()).toBeNull();
	});

	test("won't save what doesn't connect", async () => {
		await expect(saveUmami({ ...config, apiKey: "wrong" })).rejects.toThrow("Couldn't reach Umami");
		await expect(saveUmami({ ...config, url: "nope" })).rejects.toThrow("Enter the Umami URL");
		expect(await getUmami()).toBeNull();
	});

	test("saves with the key sealed, and a blank key keeps it", async () => {
		await saveUmami({ ...config, url: "https://umami.test/" });
		expect(await getUmami()).toEqual(config);
		expect(site.db.select().from(umami).get()?.apiKey).not.toContain("key");

		await saveUmami({ ...config, websiteId: "other", apiKey: "" });
		expect(await getUmami()).toEqual({ ...config, websiteId: "other" });
	});

	test("is gone once forgotten", async () => {
		forgetUmami();
		expect(await getUmami()).toBeNull();
	});
});

describe("umamiStats", () => {
	test("reads active visitors and every range for the one website", async () => {
		const stats = await umamiStats(config, 1_000_000_000);
		expect(stats.url).toBe("https://umami.test/websites/site");
		expect(stats.active).toBe(3);
		expect(stats.ranges.map((range) => range.label)).toEqual([
			"24 hours",
			"7 days",
			"30 days",
			"365 days",
			"All time",
		]);
		expect(stats.ranges[0]).toMatchObject({
			label: "24 hours",
			unit: "hour",
			visitors: 10,
			pageviews: 42,
		});
		// 1_000_000_000 is 1970-01-12T13:46:40Z: 25 hours from 12:00 the day before, one with data
		expect(stats.ranges[0]?.series).toHaveLength(25);
		expect(stats.ranges[0]?.series.filter((point) => point.views)).toEqual([
			{ t: Date.parse("1970-01-12T13:00:00Z"), views: 5, visits: 5 },
		]);
		expect(requests).toContain(
			"https://umami.test/api/websites/site/stats?startAt=913600000&endAt=1000000000",
		);
		expect(requests).toContain(
			"https://umami.test/api/websites/site/stats?startAt=0&endAt=1000000000",
		);
	});

	test("serves the cache for a minute, then the last good result while Umami is down", async () => {
		requests.length = 0;
		await umamiStats(config, 1_000_030_000);
		expect(requests).toEqual([]);

		down = true;
		const stale = await umamiStats(config, 1_000_120_000);
		expect(requests.length).toBeGreaterThan(0);
		expect(stale.active).toBe(3);
	});
});

describe("fillSeries", () => {
	const at = Date.parse;

	test("puts back the days Umami left out", () => {
		const series = fillSeries(
			[{ x: "2026-09-18T00:00:00Z", y: 7 }],
			[{ x: "2026-09-18T00:00:00Z", y: 2 }],
			at("2026-09-17T09:30:00Z"),
			at("2026-09-19T10:00:00Z"),
			"day",
		);
		expect(series).toEqual([
			{ t: at("2026-09-17T00:00:00Z"), views: 0, visits: 0 },
			{ t: at("2026-09-18T00:00:00Z"), views: 7, visits: 2 },
			{ t: at("2026-09-19T00:00:00Z"), views: 0, visits: 0 },
		]);
	});

	test("all time starts at the first month with data and steps by calendar month", () => {
		const series = fillSeries(
			[{ x: "2025-12-01T00:00:00Z", y: 1 }],
			[],
			null,
			at("2026-02-10T00:00:00Z"),
			"month",
		);
		expect(series.map((point) => new Date(point.t).toISOString().slice(0, 7))).toEqual([
			"2025-12",
			"2026-01",
			"2026-02",
		]);
	});
});
