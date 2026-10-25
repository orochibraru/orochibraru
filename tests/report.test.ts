import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { createECDH, randomBytes } from "node:crypto";
import { post, syncRun, weeklyReport } from "../src/lib/server/db/schema";
import { env } from "../src/lib/server/env";
import { subscribe, subscriptions, usePushFetch } from "../src/lib/server/push";
import {
	buildReport,
	dueWeek,
	mondayOf,
	runWeeklyReport,
	summary,
	weekLabel,
} from "../src/lib/server/report";
import { freshSite } from "./helpers";

env.authSecret = "test-secret-test-secret-test-secret";
const site = freshSite();
afterAll(() => site.cleanup());

// a push service that records what it was sent and answers as told
const pushed: { url: string; headers: Record<string, string>; bytes: number }[] = [];
let answer = 201;
usePushFetch(async (url, init) => {
	pushed.push({
		url,
		headers: init.headers as Record<string, string>,
		bytes: (init.body as Uint8Array).length,
	});
	return new Response(null, { status: answer });
});

/** A browser's subscription, with real keys so the message can be encrypted for it. */
function browser(endpoint: string) {
	const ecdh = createECDH("prime256v1");
	ecdh.generateKeys();
	return {
		endpoint,
		keys: { p256dh: ecdh.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url") },
	};
}

// Monday 2026-10-19 00:00 UTC to Monday 2026-10-26
const START = Date.UTC(2026, 9, 19);
const END = Date.UTC(2026, 9, 26);

beforeEach(() => {
	pushed.length = 0;
	answer = 201;
});

describe("the week", () => {
	test("is Monday to Monday, UTC, and falls due Monday 08:00", () => {
		expect(mondayOf(Date.UTC(2026, 9, 25, 23))).toBe(START);
		expect(mondayOf(START)).toBe(START);
		// Monday 07:59: last week's report isn't due yet, the one before is
		expect(dueWeek(END + 8 * 3600_000 - 60_000)).toEqual({
			start: START - 7 * 86_400_000,
			end: START,
		});
		expect(dueWeek(END + 8 * 3600_000)).toEqual({ start: START, end: END });
		expect(weekLabel({ start: "2026-10-19", end: "2026-10-26" })).toBe("Oct 19 – Oct 25");
	});
});

describe("the report", () => {
	test("counts the week's posts and syncs, and only names repos still failing", async () => {
		site.db
			.insert(post)
			.values([
				{ slug: "in", title: "In the week", date: "2026-10-21", status: "published" },
				{ slug: "draft", title: "A draft", date: "2026-10-21", status: "draft" },
				{ slug: "before", title: "Before", date: "2026-10-18", status: "published" },
			])
			.run();
		const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 9, day, hour));
		site.db
			.insert(syncRun)
			.values([
				{ repo: "a", status: "failed", startedAt: at(20) },
				{ repo: "a", status: "ok", startedAt: at(21) },
				{ repo: "b", status: "ok", startedAt: at(20) },
				{ repo: "b", status: "failed", startedAt: at(24) },
				{ repo: "c", status: "failed", startedAt: at(27) },
			])
			.run();
		const report = await buildReport({ start: START, end: END });
		expect(report.posts).toEqual([{ title: "In the week", slug: "in" }]);
		expect(report.syncs).toEqual({ ok: 2, failed: 2, failing: ["b"] });
		expect(report.visitors).toBeUndefined();
		expect(summary(report)).toBe("1 post published · 1 sync failing");
	});

	test("summary compares with the week before", () => {
		const base = {
			start: "",
			end: "",
			posts: [],
			syncs: { ok: 0, failed: 0, failing: [] },
			problems: [],
		};
		expect(
			summary({
				...base,
				visitors: {
					visitors: 1120,
					pageviews: 0,
					before: { visitors: 1000, pageviews: 0 },
					pages: [],
					referrers: [],
				},
			}),
		).toBe("1,120 visitors (+12%)");
		expect(summary(base)).toBe("A quiet week: nothing to report.");
	});
});

describe("sending", () => {
	test("goes out once per week, signed and encrypted, and forgets dead browsers", async () => {
		subscribe(browser("https://push.example/alive"), "me@example.com", "iPhone, Safari");
		subscribe(browser("https://push.example/gone"), "me@example.com", "Mac, Chrome");
		const due = END + 9 * 3600_000;

		answer = 201;
		const first = await runWeeklyReport(due);
		expect(first.sent).toBe(true);
		expect(first.report?.delivered).toBe(2);
		expect(pushed.map((one) => one.url).sort()).toEqual([
			"https://push.example/alive",
			"https://push.example/gone",
		]);
		expect(pushed[0]?.headers["Content-Encoding"]).toBe("aes128gcm");
		expect(pushed[0]?.headers.Authorization).toMatch(/^vapid t=.+, k=.+$/);
		expect(pushed[0]?.bytes).toBeGreaterThan(100);

		// the hourly check after it, and a restart: nothing more
		pushed.length = 0;
		expect((await runWeeklyReport(due + 3600_000)).sent).toBe(false);
		expect(pushed).toHaveLength(0);
		expect(site.db.select().from(weeklyReport).all()).toHaveLength(1);

		// a week later, one browser has gone away
		answer = 410;
		const next = await runWeeklyReport(due + 7 * 86_400_000);
		expect(next.sent).toBe(true);
		expect(next.report?.delivered).toBe(0);
		expect(subscriptions()).toHaveLength(0);
	});
});
