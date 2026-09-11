// `bun run audit`: build the site, serve dist/ the way nginx does, and run
// Lighthouse over every page. Pass paths to audit only those:
//
//     bun run audit            every page
//     bun run audit /penombre  just that one
//
// Exits non-zero if a category drops below its floor, so it can gate a deploy.
import { Glob } from "bun";

const PORT = 4173;
const FLOOR: Record<string, number> = {
  performance: 0.9,
  accessibility: 1,
  "best-practices": 1,
  seo: 1,
};

Bun.spawnSync(["bun", "run", "build.ts"], { stdout: "inherit", stderr: "inherit" });

/** The routes nginx would serve, worked out from what the build produced. */
const built = [...new Glob("dist/**/*.html").scanSync(".")]
  .map((f) => f.slice("dist".length).replace(/\.html$/, "").replace(/\/index$/, "") || "/")
  .filter((route) => route !== "/404")
  .sort();

const asked = Bun.argv.slice(2);
const routes = asked.length ? asked : built;
for (const route of routes) {
  if (!built.includes(route)) throw new Error(`no page at ${route}. Built: ${built.join(", ")}`);
}

// Close enough to nginx.conf to audit the same thing production serves: clean
// URLs, gzip, and a long immutable cache on the hashed assets. Without those
// last two, Lighthouse reports compression and caching problems that only ever
// existed in this script.
const CACHED = /\.(css|js|svg|png|jpg|webp|woff2)$/;

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    for (const candidate of [`dist${pathname}`, `dist${pathname}.html`, `dist${pathname}/index.html`]) {
      const file = Bun.file(candidate);
      if (!(await file.exists())) continue;

      const headers = new Headers({ "content-type": file.type });
      if (CACHED.test(candidate)) headers.set("cache-control", "public, max-age=2592000, immutable");

      if (/^(text|application\/(json|xml|rss))/.test(file.type)) {
        headers.set("content-encoding", "gzip");
        return new Response(Bun.gzipSync(await file.bytes()), { headers });
      }
      return new Response(file, { headers });
    }
    return new Response(Bun.file("dist/404.html"), { status: 404 });
  },
});

type Audit = { title: string; score: number | null; scoreDisplayMode: string };
type Report = { categories: Record<string, { score: number | null }>; audits: Record<string, Audit> };

async function audit(route: string): Promise<Report> {
  const run = Bun.spawn([
    "bun", "x", "lighthouse", `http://localhost:${PORT}${route}`,
    "--quiet", "--output=json", "--output-path=stdout",
    "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
  ], { stdout: "pipe", stderr: "pipe" });

  const [out] = await Promise.all([new Response(run.stdout).text(), run.exited]);
  const json = out.slice(out.indexOf("{")); // lighthouse prints a banner first
  if (!json) throw new Error(`${route}: lighthouse produced nothing\n${await new Response(run.stderr).text()}`);

  const report = JSON.parse(json) as Report & { runtimeError?: { message: string } };
  if (report.runtimeError) throw new Error(`${route}: ${report.runtimeError.message}`);
  return report;
}

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const pad = (s: string, n: number) => s.padEnd(n);

let failed = false;
const failures: string[] = [];
const insights: string[] = []; // Lighthouse 13's advisory diagnostics, not pass/fail

console.log(`\nauditing ${routes.length} page(s)\n`);
console.log(`${pad("page", 26)} ${["perf", "a11y", "best", "seo"].map((c) => c.padStart(4)).join(" ")}`);

for (const route of routes) {
  const report = await audit(route);

  const scores = CATEGORIES.map((id) => {
    const score = report.categories[id]?.score ?? null;
    if (score === null) return "  --";
    if (score < (FLOOR[id] ?? 1)) failed = true;
    return `${Math.round(score * 100)}`.padStart(4);
  });
  console.log(`${pad(route, 26)} ${scores.join(" ")}`);

  for (const [id, a] of Object.entries(report.audits)) {
    if (a.score === null || a.score >= 1) continue;
    if (["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode)) continue;
    (id.endsWith("-insight") ? insights : failures).push(`${pad(route, 26)} ${id}: ${a.title}`);
  }
}

const list = (title: string, lines: string[]) => {
  if (!lines.length) return;
  console.log(`\n${title}\n`);
  for (const line of [...new Set(lines)].sort()) console.log(`  ${line}`);
};

list("failed audits", failures);
list("insights (advisory)", insights);

server.stop(true);
process.exit(failed ? 1 : 0);
