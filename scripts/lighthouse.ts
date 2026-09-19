// `bun run audit`: build the site, run it the way production does, and run
// Lighthouse over every page in its sitemap. Pass paths to audit only those:
//
//     bun run audit            every page
//     bun run audit /penombre  just that one
//
// Exits non-zero if a category drops below its floor, so it can gate a deploy.
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dim, log, ms } from "./log";

const out = log("audit");

const PORT = 4173;
const APP_PORT = 4174;
const FLOOR: Record<string, number> = {
	performance: 0.9,
	accessibility: 1,
	"best-practices": 1,
	seo: 1,
};

const rebuild = Bun.spawnSync(["bun", "run", "build"], {
	stdout: "inherit",
	stderr: "inherit",
});
if (rebuild.exitCode !== 0) {
	out.fail(`build failed (exit ${rebuild.exitCode}): nothing to audit`);
	process.exit(1);
}

// The server reads its pages from a database: audit a throwaway copy of the local one.
const source = process.env.DATA_DIR ?? "data";
if (!existsSync(`${source}/site.db`)) {
	out.fail(`no ${source}/site.db: nothing to audit. Point DATA_DIR at a database with content`);
	process.exit(1);
}
const data = mkdtempSync(`${tmpdir()}/audit-`);
cpSync(source, data, { recursive: true });
const app = Bun.spawn(["./build/server"], {
	env: {
		...process.env,
		PORT: String(APP_PORT),
		ORIGIN: `http://localhost:${PORT}`,
		DATA_DIR: data,
		OIDC_ISSUER: "",
	},
	stdout: "ignore",
	stderr: "inherit",
});
for (let tries = 0; ; tries++) {
	if ((await fetch(`http://localhost:${APP_PORT}/_health`).catch(() => null))?.ok) {
		break;
	}
	if (tries > 50) {
		throw new Error("the built server didn't come up");
	}
	await Bun.sleep(100);
}

// Production sits behind a proxy that compresses; without that here, Lighthouse
// would report compression problems that only exist in this script.
out.step(`serving the built app on http://localhost:${PORT}`);
const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);
		const upstream = await fetch(`http://localhost:${APP_PORT}${url.pathname}${url.search}`, {
			headers: request.headers,
			redirect: "manual",
			// pass precompressed bodies through as they are: decoding them here while
			// keeping their content-encoding header would hand clients garbage
			decompress: false,
		});
		const type = upstream.headers.get("content-type") ?? "";
		if (
			upstream.headers.has("content-encoding") ||
			!/^(text|application\/(json|xml|rss))/.test(type)
		) {
			return upstream;
		}
		const headers = new Headers(upstream.headers);
		headers.set("content-encoding", "gzip");
		headers.delete("content-length");
		return new Response(Bun.gzipSync(await upstream.bytes()), { status: upstream.status, headers });
	},
});

/** Every page the sitemap lists: the routes production serves. */
const sitemap = await (await fetch(`http://localhost:${PORT}/sitemap.xml`)).text();
const built = [...sitemap.matchAll(/<loc>https:\/\/orochibraru\.com([^<]*)<\/loc>/g)]
	.map((match) => match[1] || "/")
	.sort();

const asked = Bun.argv.slice(2);
const routes = asked.length ? asked : built;
for (const route of routes) {
	if (!built.includes(route)) {
		throw new Error(`no page at ${route}. In the sitemap: ${built.join(", ")}`);
	}
}
if (asked.length) {
	out.info(`auditing ${asked.length} of ${built.length} page(s), as asked`);
}

type Audit = { title: string; score: number | null; scoreDisplayMode: string };
type Report = {
	categories: Record<string, { score: number | null }>;
	audits: Record<string, Audit>;
};

async function audit(route: string): Promise<Report> {
	const run = Bun.spawn(
		[
			"bun",
			"x",
			"lighthouse",
			`http://localhost:${PORT}${route}`,
			"--quiet",
			"--output=json",
			"--output-path=stdout",
			"--chrome-flags=--headless=new --no-sandbox --disable-gpu",
		],
		{ stdout: "pipe", stderr: "pipe" },
	);

	const [stdout] = await Promise.all([new Response(run.stdout).text(), run.exited]);
	const json = stdout.slice(stdout.indexOf("{")); // lighthouse prints a banner first
	if (!json) {
		throw new Error(
			`${route}: lighthouse produced nothing\n${await new Response(run.stderr).text()}`,
		);
	}

	const report = JSON.parse(json) as Report & { runtimeError?: { message: string } };
	if (report.runtimeError) {
		throw new Error(`${route}: ${report.runtimeError.message}`);
	}
	return report;
}

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const pad = (s: string, n: number) => s.padEnd(n);

let failed = false;
const failures: string[] = [];
const insights: string[] = []; // Lighthouse 13's advisory diagnostics, not pass/fail

out.info(`each page is a full Chrome run: about 5s apiece, ${routes.length} to go`);
console.log(`\nauditing ${routes.length} page(s)\n`);
console.log(
	`${pad("page", 26)} ${["perf", "a11y", "best", "seo"].map((c) => c.padStart(4)).join(" ")}`,
);

let done = 0;
for (const route of routes) {
	const at = performance.now();
	const report = await audit(route);
	done += 1;

	const scores = CATEGORIES.map((id) => {
		const score = report.categories[id]?.score ?? null;
		if (score === null) {
			return "  --";
		}
		if (score < (FLOOR[id] ?? 1)) {
			failed = true;
		}
		return `${Math.round(score * 100)}`.padStart(4);
	});
	console.log(
		`${pad(route, 26)} ${scores.join(" ")}  ${dim(`${done}/${routes.length}  ${ms(performance.now() - at)}`)}`,
	);

	for (const [id, a] of Object.entries(report.audits)) {
		if (a.score === null || a.score >= 1) {
			continue;
		}
		if (["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode)) {
			continue;
		}
		(id.endsWith("-insight") ? insights : failures).push(`${pad(route, 26)} ${id}: ${a.title}`);
	}
}

const list = (title: string, lines: string[]) => {
	if (!lines.length) {
		return;
	}
	console.log(`\n${title}\n`);
	for (const line of [...new Set(lines)].sort()) {
		console.log(`  ${line}`);
	}
};

list("failed audits", failures);
list("insights (advisory)", insights);

server.stop(true);
app.kill();
rmSync(data, { recursive: true, force: true });

if (failed) {
	out.fail(`${routes.length} page(s) audited — below the floor, see the failed audits above`);
} else {
	out.done(`${routes.length} page(s) audited, all above the floor`);
}

process.exit(failed ? 1 : 0);
