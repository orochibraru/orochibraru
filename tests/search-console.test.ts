import { afterAll, describe, expect, test } from "bun:test";
import { searchConsole } from "../src/lib/server/db/schema";
import { env } from "../src/lib/server/env";
import {
	forgetSearchConsole,
	getSearchConsole,
	saveSearchConsole,
	searchStats,
	testSearchConsole,
} from "../src/lib/server/search-console";
import { freshSite } from "./helpers";

env.authSecret = "test-secret-test-secret-test-secret";
const site = freshSite();

// a service account key, as Google hands it out
const pair = await crypto.subtle.generateKey(
	{
		name: "RSASSA-PKCS1-v1_5",
		modulusLength: 2048,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: "SHA-256",
	},
	true,
	["sign", "verify"],
);
const pem = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
const serviceAccount = JSON.stringify({
	type: "service_account",
	client_email: "stats@project.iam.gserviceaccount.com",
	private_key: `-----BEGIN PRIVATE KEY-----\n${pem.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----\n`,
});
const config = { site: "sc-domain:orochibraru.test", serviceAccount };

const realFetch = globalThis.fetch;
const bodies: Record<string, unknown>[] = [];
let down = false;

// a Google that checks the JWT's signature and knows one property
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
	const url = String(input);
	if (down) {
		return new Response("", { status: 502 });
	}
	if (url === "https://oauth2.googleapis.com/token") {
		const assertion = new URLSearchParams(String(init?.body)).get("assertion") ?? "";
		const [header, claims, signature] = assertion.split(".");
		const valid = await crypto.subtle.verify(
			"RSASSA-PKCS1-v1_5",
			pair.publicKey,
			Buffer.from(signature ?? "", "base64url"),
			Buffer.from(`${header}.${claims}`),
		);
		const { iss, scope } = JSON.parse(Buffer.from(claims ?? "", "base64url").toString());
		if (
			!valid ||
			iss !== "stats@project.iam.gserviceaccount.com" ||
			!scope.includes("webmasters")
		) {
			return Response.json({ error: "invalid_grant" }, { status: 400 });
		}
		return Response.json({ access_token: "token" });
	}
	if (!url.includes(encodeURIComponent(config.site))) {
		return Response.json(
			{ error: { message: "User does not have sufficient permission for site" } },
			{ status: 403 },
		);
	}
	if (new Headers(init?.headers).get("authorization") !== "Bearer token") {
		return new Response("", { status: 401 });
	}
	const body = JSON.parse(String(init?.body));
	bodies.push(body);
	const row = (keys?: string[]) => ({
		keys,
		clicks: 3,
		impressions: 40,
		ctr: 0.075,
		position: 8.2,
	});
	const rows: Record<string, unknown[]> = {
		"": [row()],
		date: [row(["1970-01-11"])],
		query: [row(["orochibraru"])],
		page: [row(["https://orochibraru.test/blog/hello"])],
	};
	return Response.json({ rows: rows[body.dimensions.join()] });
}) as typeof fetch;
afterAll(() => {
	globalThis.fetch = realFetch;
	site.cleanup();
});

describe("the Search Console connection", () => {
	test("is null until one is saved", async () => {
		expect(await getSearchConsole()).toBeNull();
	});

	test("won't save what isn't a service account key", async () => {
		await expect(saveSearchConsole({ ...config, serviceAccount: "nope" })).rejects.toThrow(
			"isn't JSON",
		);
		await expect(saveSearchConsole({ ...config, serviceAccount: "{}" })).rejects.toThrow(
			"no client_email",
		);
		expect(await getSearchConsole()).toBeNull();
	});

	test("saves what Google turns down, and says why", async () => {
		const other = { ...config, site: "sc-domain:other.test" };
		expect(await saveSearchConsole(other)).toContain("sufficient permission");
		expect(await getSearchConsole()).toEqual(other);

		const stranger = JSON.stringify({ ...JSON.parse(serviceAccount), client_email: "who@else" });
		expect(await saveSearchConsole({ ...config, serviceAccount: stranger })).toBe(
			"Google refused the key (400): invalid_grant",
		);
	});

	test("saves with the key sealed, and a blank key keeps it", async () => {
		expect(await saveSearchConsole({ ...config, site: ` ${config.site} ` })).toBeNull();
		expect(await getSearchConsole()).toEqual(config);
		expect(site.db.select().from(searchConsole).get()?.serviceAccount).not.toContain("PRIVATE KEY");

		await saveSearchConsole({ ...config, serviceAccount: "" });
		expect(await getSearchConsole()).toEqual(config);
	});

	test("is gone once forgotten", async () => {
		forgetSearchConsole();
		expect(await getSearchConsole()).toBeNull();
	});
});

describe("searchStats", () => {
	// 1970-01-12T13:46:40Z
	const now = 1_000_000_000;

	test("reads totals, 28 filled days, top queries and pages", async () => {
		bodies.length = 0;
		const stats = await searchStats(config, 28, now);
		expect(stats.totals).toMatchObject({ clicks: 3, impressions: 40, ctr: 0.075, position: 8.2 });
		expect(stats.series).toHaveLength(28);
		expect(stats.series.at(0)?.t).toBe(Date.parse("1969-12-16"));
		expect(stats.series.filter((point) => point.clicks)).toEqual([
			{ t: Date.parse("1970-01-11"), clicks: 3, impressions: 40 },
		]);
		expect(stats.queries[0]).toMatchObject({ key: "orochibraru", clicks: 3 });
		expect(stats.pages[0]?.key).toBe("https://orochibraru.test/blog/hello");
		expect(bodies[0]).toMatchObject({ startDate: "1969-12-16", endDate: "1970-01-12" });
		// the last day with data is Jan 11, the range's 27th: the 27 days before it
		expect(bodies.at(-1)).toMatchObject({
			startDate: "1969-11-19",
			endDate: "1969-12-15",
			dimensions: [],
		});
		expect(stats.previous).toMatchObject({ clicks: 3, impressions: 40 });
	});

	test("serves the cache for an hour, then the last good result while Google is down", async () => {
		bodies.length = 0;
		await searchStats(config, 28, now + 30 * 60 * 1000);
		expect(bodies).toEqual([]);

		down = true;
		const stale = await searchStats(config, 28, now + 2 * 60 * 60 * 1000);
		expect(stale.totals.clicks).toBe(3);
	});

	test("a fresh test skips the cache: an outage shows instead of the last good result", async () => {
		expect(await testSearchConsole(config)).toBeNull();
		expect(await testSearchConsole(config, true)).toContain("Google refused the key (502)");
		down = false;
		expect(await testSearchConsole(config, true)).toBeNull();
	});
});
