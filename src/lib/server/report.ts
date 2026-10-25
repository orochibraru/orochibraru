// The weekly report: last week's visitors, search, posts and syncs, built every
// Monday morning by the background worker, kept in weekly_report, and pushed to the
// admin's browsers as a notification that opens it.
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "./db";
import { post, syncRun, weeklyReport } from "./db/schema";
import { notify } from "./push";
import { getSearchConsole, searchStats } from "./search-console";
import { getUmami, type Metric, umamiReport } from "./umami";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** Monday 08:00 UTC: Sunday's numbers have settled, and it's the start of a week. */
const DUE_AFTER = 8 * HOUR;

export type WeeklyReport = {
	/** The Monday the week starts on, and the one after, YYYY-MM-DD, UTC. */
	start: string;
	end: string;
	visitors?: {
		visitors: number;
		pageviews: number;
		before: { visitors: number; pageviews: number };
		pages: Metric[];
		referrers: Metric[];
	};
	search?: {
		clicks: number;
		impressions: number;
		position: number;
		before: { clicks: number; impressions: number };
		queries: { key: string; clicks: number; impressions: number }[];
	};
	posts: { title: string; slug: string }[];
	syncs: { ok: number; failed: number; failing: string[] };
	/** Sources that are connected but couldn't be read. */
	problems: string[];
};

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday 00:00 UTC, on or before `at`. */
export function mondayOf(at: number): number {
	const date = new Date(at);
	const sinceMonday = (date.getUTCDay() + 6) % 7;
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday);
}

/** The last whole week whose report is due by `now`. */
export function dueWeek(now: number): { start: number; end: number } {
	const end = mondayOf(now - DUE_AFTER);
	return { start: end - WEEK, end };
}

/** Gather one week. A source that fails is named in `problems`, never fatal. */
export async function buildReport(week: { start: number; end: number }): Promise<WeeklyReport> {
	const db = getDb();
	const report: WeeklyReport = {
		start: day(week.start),
		end: day(week.end),
		posts: db
			.select({ title: post.title, slug: post.slug })
			.from(post)
			.where(
				and(
					eq(post.status, "published"),
					gte(post.date, day(week.start)),
					lt(post.date, day(week.end)),
				),
			)
			.all(),
		syncs: { ok: 0, failed: 0, failing: [] },
		problems: [],
	};

	const runs = db
		.select()
		.from(syncRun)
		.where(
			and(gte(syncRun.startedAt, new Date(week.start)), lt(syncRun.startedAt, new Date(week.end))),
		)
		.orderBy(desc(syncRun.startedAt))
		.all();
	const latest = new Map<string, string>();
	for (const run of runs) {
		report.syncs.ok += run.status === "ok" ? 1 : 0;
		report.syncs.failed += run.status === "failed" ? 1 : 0;
		if (!latest.has(run.repo)) {
			latest.set(run.repo, run.status);
		}
	}
	// a repo that failed and then synced fine is not failing any more
	report.syncs.failing = [...latest]
		.filter(([, status]) => status === "failed")
		.map(([repo]) => repo);

	const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
	await Promise.all([
		umami &&
			umamiReport(umami, 7, week.end).then(
				(stats) => {
					report.visitors = {
						visitors: stats.visitors,
						pageviews: stats.pageviews,
						before: { visitors: stats.previous.visitors, pageviews: stats.previous.pageviews },
						pages: stats.pages.slice(0, 5),
						referrers: stats.referrers.slice(0, 5),
					};
				},
				() => report.problems.push("Umami"),
			),
		search &&
			searchStats(search, 7, week.end).then(
				(stats) => {
					report.search = {
						clicks: stats.totals.clicks,
						impressions: stats.totals.impressions,
						position: stats.totals.position,
						before: { clicks: stats.previous.clicks, impressions: stats.previous.impressions },
						queries: stats.queries
							.slice(0, 5)
							.map(({ key, clicks, impressions }) => ({ key, clicks, impressions })),
					};
				},
				() => report.problems.push("Search Console"),
			),
	]);
	return report;
}

const count = new Intl.NumberFormat("en");
const plural = (n: number, noun: string) => `${count.format(n)} ${noun}${n === 1 ? "" : "s"}`;
/** "+12%", "−5%", or nothing when there's no week before to compare with. */
function change(now: number, before: number): string {
	if (!before) {
		return "";
	}
	const ratio = Math.round((now / before - 1) * 100);
	return ratio === 0 ? " (same)" : ` (${ratio > 0 ? "+" : "−"}${Math.abs(ratio)}%)`;
}

/** The notification's one line. */
export function summary(report: WeeklyReport): string {
	const parts = [
		report.visitors &&
			`${plural(report.visitors.visitors, "visitor")}${change(report.visitors.visitors, report.visitors.before.visitors)}`,
		report.search &&
			`${plural(report.search.clicks, "search click")}${change(report.search.clicks, report.search.before.clicks)}`,
		report.posts.length && `${plural(report.posts.length, "post")} published`,
		report.syncs.failing.length && `${plural(report.syncs.failing.length, "sync")} failing`,
	].filter(Boolean);
	return parts.length ? parts.join(" · ") : "A quiet week: nothing to report.";
}

const range = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
/** "Oct 19 – Oct 25": the week's Monday to its Sunday. */
export const weekLabel = (report: Pick<WeeklyReport, "start" | "end">) =>
	`${range.format(new Date(report.start))} – ${range.format(new Date(Date.parse(report.end) - DAY))}`;

/**
 * Build the report due by `now`, store it, and push it, once: a week that already
 * has its report gets nothing more, so restarts and the hourly check never repeat it.
 * Says which report is due and whether this call is the one that sent it.
 */
export async function runWeeklyReport(now = Date.now()) {
	const db = getDb();
	const week = dueWeek(now);
	const stored = () => getReportFor(day(week.start));
	const existing = stored();
	if (existing) {
		return { report: existing, sent: false };
	}
	const data = await buildReport(week);
	const row = db
		.insert(weeklyReport)
		.values({ weekStart: data.start, data: data as unknown as Record<string, unknown> })
		.onConflictDoNothing()
		.returning()
		.get();
	if (!row) {
		// another check got there first, and it sends the notification
		return { report: stored(), sent: false };
	}
	const delivered = await sendReport(row.id, data);
	return { report: { ...row, data, delivered }, sent: true };
}

const getReportFor = (weekStart: string) => {
	const row = getDb()
		.select()
		.from(weeklyReport)
		.where(eq(weeklyReport.weekStart, weekStart))
		.get();
	return row && { ...row, data: row.data as WeeklyReport };
};

/** Push a stored report to every subscribed browser; returns how many took it. */
export async function sendReport(id: number, data: WeeklyReport) {
	const delivered = await notify({
		title: `Your week: ${weekLabel(data)}`,
		body: summary(data),
		url: `/admin/reports/${id}`,
		tag: "weekly-report",
	});
	getDb().update(weeklyReport).set({ delivered }).where(eq(weeklyReport.id, id)).run();
	return delivered;
}

export const listReports = () =>
	getDb()
		.select({
			id: weeklyReport.id,
			weekStart: weeklyReport.weekStart,
			data: weeklyReport.data,
			createdAt: weeklyReport.createdAt,
			delivered: weeklyReport.delivered,
		})
		.from(weeklyReport)
		.orderBy(desc(weeklyReport.weekStart))
		.limit(52)
		.all()
		.map((row) => ({ ...row, data: row.data as WeeklyReport }));

export function getReport(id: number) {
	const row = getDb().select().from(weeklyReport).where(eq(weeklyReport.id, id)).get();
	return row && { ...row, data: row.data as WeeklyReport };
}

/** Check every hour, and a minute after boot, whether a week's report is due. */
export function startReportSchedule() {
	const check = () => {
		runWeeklyReport().catch((cause) => console.error("weekly report:", cause));
	};
	setTimeout(check, 60_000).unref?.();
	setInterval(check, HOUR).unref?.();
}
