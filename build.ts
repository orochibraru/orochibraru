// `bun build` (CLI) can't load plugins, so the static build goes through Bun.build.
//
// Blog posts are Markdown in src/posts/*.md. They're rendered to HTML pages in
// src/blog/ (generated, gitignored) *before* the bundle runs, so they get the same
// hashed stylesheet and minification as every hand-written page.
import tailwind from "bun-plugin-tailwind";
import htmlIncludes from "./plugins/html-includes";
import { rm, cp, mkdir, stat } from "node:fs/promises";
import { Glob } from "bun";
import { PROJECTS, docsUrl, type Project } from "./projects";
import { loadGuides, type Guide } from "./guides";

const SITE = "https://orochibraru.com";

type Post = {
  slug: string;
  title: string;
  date: string; // ISO, from frontmatter
  description: string;
  body: string; // rendered HTML
  md: string;   // the Markdown source, reused verbatim for /blog/<slug>.md
};

const esc = (s: string) => Bun.escapeHTML(s);

/** Truncate on a word, not mid-syllable, and say so when something was cut. */
const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(" ", max)).replace(/[,;:.]$/, "")}…`;

const readable = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

/** Minimal frontmatter: a leading `---` block of `key: value` scalars. */
function frontmatter(raw: string): [Record<string, string>, string] {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return [{}, raw];
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return [meta, raw.slice(m[0].length)];
}

async function loadPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  for (const file of new Glob("src/posts/*.md").scanSync(".")) {
    const slug = file.split("/").pop()!.replace(/\.md$/, "");
    const [meta, md] = frontmatter(await Bun.file(file).text());
    for (const key of ["title", "date", "description"]) {
      if (!meta[key]) throw new Error(`${file}: missing "${key}" in frontmatter`);
    }
    posts.push({
      slug,
      title: meta.title!,
      date: meta.date!,
      description: meta.description!,
      body: Bun.markdown.html(md),
      md: md.trim(),
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** The shared page shell. Mirrors the hand-written pages in src/. */
function shell(o: {
  path: string; title: string; description: string;
  css?: string; js?: string; width?: string; source?: { url: string; label: string };
  head?: string; main: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<!--#include head.html css="${o.css ?? "../style.css"}" -->
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${SITE}${o.path}">
<meta property="og:url" content="${SITE}${o.path}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
${o.head ?? ""}
</head>
<body>
<!--#include header.html width="${o.width ?? "max-w-page"}" ${o.source ? `source="${o.source.url}" sourceLabel="${o.source.label}"` : ""} -->
${o.main}
<!--#include footer.html width="${o.width ?? "max-w-page"}" js="${o.js ?? "../search.js"}" -->
</body>
</html>
`;
}

function postPage(p: Post) {
  return shell({
    path: `/blog/${p.slug}`,
    title: `${p.title} | orochibraru`,
    description: p.description,
    head: `<meta property="og:type" content="article">
<meta property="article:published_time" content="${p.date}">
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org", "@type": "BlogPosting",
  headline: p.title, description: p.description, datePublished: p.date,
  url: `${SITE}/blog/${p.slug}`,
  author: { "@type": "Person", name: "orochibraru", url: `${SITE}/about` },
})}
</script>`,
    main: `<main class="mx-auto max-w-page px-6">
<article>
  <div class="pt-10 pb-8">
    <a class="text-xs uppercase tracking-widest text-dim hover:text-acid" href="/blog">&larr; All posts</a>
    <h1 class="mt-4.5 max-w-[24ch] text-[clamp(2.2rem,6vw,3.8rem)]/[1.05] font-extrabold tracking-[-.04em]">${esc(p.title)}</h1>
    <p class="mt-5 text-xs uppercase tracking-widest text-dim">
      <time datetime="${p.date}">${readable(p.date)}</time>
    </p>
  </div>
  <div class="md pb-22.5">${p.body}</div>
</article>
</main>`,
  });
}

function indexPage(posts: Post[]) {
  const rows = posts.map((p) => `      <a class="card" href="/blog/${p.slug}">
        <span class="text-[11px] uppercase tracking-[.18em] text-plasma"><time datetime="${p.date}">${readable(p.date)}</time></span>
        <h2 class="mt-2.5 mb-2 text-[1.35rem] font-bold tracking-[-.02em] transition-colors">${esc(p.title)}</h2>
        <p class="text-[.92rem] text-dim">${esc(p.description)}</p>
      </a>`).join("\n");

  // an odd post count would leave the grid's line-coloured background showing
  const filler = posts.length % 2 ? '\n      <div class="hidden bg-surface sm:block"></div>' : "";

  return shell({
    path: "/blog",
    title: "Blog: rants about software that grew a pricing page",
    description:
      "Notes and complaints about self-hosting, homelab software, and every tool that was good until it had a funding round.",
    main: `<main class="mx-auto max-w-page px-6">
  <div class="pt-15 pb-14">
    <span class="tag">${posts.length} post${posts.length === 1 ? "" : "s"} &middot; <a class="hover:text-acid" href="/feed.xml">RSS</a></span>
    <h1 class="mt-6.5 text-[clamp(2.6rem,9vw,6.2rem)]/[.92] font-extrabold tracking-[-.045em]">
      Things that<br>
      <span class="bg-linear-to-r from-acid via-cyan to-plasma bg-clip-text text-transparent">annoyed me.</span>
    </h1>
    <p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">Written in Markdown, in the repo, built with the rest of
    the site. No CMS, no database, nothing to log in to.</p>
  </div>
  <section class="mb-22.5">
    <div class="grid gap-px border border-line bg-line sm:grid-cols-2">
${rows}${filler}
    </div>
  </section>
</main>`,
  });
}

function feed(posts: Post[]) {
  const items = posts.map((p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}/blog/${p.slug}</link>
    <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
    <pubDate>${new Date(p.date + "T00:00:00Z").toUTCString()}</pubDate>
    <description>${esc(p.description)}</description>
  </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>orochibraru</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Free self-hosted software, and complaints about the software that isn't.</description>
  <language>en</language>
${items}
</channel>
</rss>
`;
}

/**
 * Guides get a wider frame than the marketing pages: a compose file or a curl
 * one-liner is worth reading without a horizontal scrollbar, and on an ultrawide
 * the alternative is a narrow column adrift in the middle of the screen. Prose
 * keeps its own measure, so only code, tables and the nav use the extra room.
 */
const DOCS_WIDTH = "max-w-[110rem]";

// ------------------------------------------------------ the project guides
//
// Each project's docs/*.md is vendored under src/docs/ by `bun run docs` and
// published here at /<project>/docs/<slug>, which is the path its own docs site
// used, one segment deeper. The pages are generated into src/<project>/docs/ so
// the bundler treats them like every other page.

/** The sidebar: every guide in this project, in reading order. */
function guideNav(guides: Guide[], current?: string) {
  const links = guides.map((g) => {
    const here = g.slug === current;
    return `<a class="${here ? "text-acid" : "hover:text-acid"}"${here ? ' aria-current="page"' : ""} href="${g.url}">${esc(g.title)}</a>`;
  }).join("\n      ");

  return `<nav class="flex gap-4.5 overflow-x-auto pb-3 text-[.92rem] whitespace-nowrap text-dim lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0 lg:whitespace-normal">
      ${links}
    </nav>`;
}

/**
 * A page's own headings, down the right-hand side. It only appears at 2xl,
 * where the alternative is that much empty margin, and it is what makes the
 * wider layout read as three columns rather than stretched prose.
 */
function guideContents(guide: Guide) {
  const entries = guide.sections.filter((section) => section.id && section.level <= 3);
  if (entries.length < 2) return '<div class="hidden 2xl:block"></div>';

  const links = entries.map((section) => `<li${section.level === 3 ? ' class="pl-3.5"' : ""}>
        <a class="hover:text-acid" href="#${section.id}">${esc(section.heading)}</a>
      </li>`).join("\n      ");

  return `<nav class="hidden text-[.85rem]/[1.5] text-dim 2xl:sticky 2xl:top-9 2xl:block 2xl:self-start">
    <p class="mb-3.5 text-[11px] tracking-[.18em] text-plasma uppercase">On this page</p>
    <ul class="flex flex-col gap-2.5 border-l border-line pl-4">
      ${links}
    </ul>
  </nav>`;
}

const guideAside = (project: Project, guides: Guide[], current?: string) =>
  `<aside class="min-w-0 lg:sticky lg:top-9 lg:self-start">
    <a class="text-xs tracking-widest text-dim uppercase hover:text-acid" href="/${project.key}">&larr; ${esc(project.name)}</a>
    <p class="mt-3 mb-4 text-[11px] tracking-[.18em] text-plasma uppercase">Documentation</p>
    ${guideNav(guides, current)}
  </aside>`;

function guidePage(guide: Guide, siblings: Guide[]) {
  const at = siblings.indexOf(guide);
  const previous = siblings[at - 1];
  const next = siblings[at + 1];

  const step = (g: Guide | undefined, label: string) => g
    ? `<a class="card" href="${g.url}"><span class="text-[11px] tracking-[.18em] text-dim uppercase">${label}</span>
        <h2 class="mt-2.5 text-[1.15rem] font-bold tracking-[-.02em] transition-colors">${esc(g.title)}</h2></a>`
    : '<div class="hidden bg-surface sm:block"></div>';

  return shell({
    path: guide.url,
    css: "../../style.css",
    js: "../../search.js",
    width: DOCS_WIDTH,
    title: `${guide.title} | ${guide.project.name} docs`,
    description: clip(guide.intro, 180) || `${guide.project.name} documentation.`,
    source: { url: guide.project.repo, label: "Source" },
    head: `<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org", "@type": "TechArticle",
  headline: guide.title, description: clip(guide.intro, 180),
  url: `${SITE}${guide.url}`,
  isPartOf: { "@type": "TechArticle", name: `${guide.project.name} documentation`, url: `${SITE}${docsUrl(guide.project)}` },
  author: { "@type": "Person", name: "orochibraru", url: `${SITE}/about` },
})}
</script>`,
    main: `<main class="mx-auto ${DOCS_WIDTH} px-6">
  <div class="grid gap-x-12 gap-y-9 pt-10 pb-22.5 lg:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_14rem]">
    ${guideAside(guide.project, siblings, guide.slug)}
    <article class="docs min-w-0">
      <h1 class="mb-7 text-[clamp(2rem,5vw,3rem)]/[1.05] font-extrabold tracking-[-.04em]">${esc(guide.title)}</h1>
      <div class="md">${guide.html}</div>
      <div class="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2">
        ${step(previous, "&larr; Previous")}
        ${step(next, "Next &rarr;")}
      </div>
      <p class="mt-7 text-[12.5px] text-dim">This guide lives in the project repo:
      <a class="border-b border-edge hover:border-cyan" href="${guide.project.repo}/blob/${guide.project.branch}/docs/${guide.slug}.md" rel="noopener">edit it there</a>,
      and this page follows within a day.</p>
    </article>
    ${guideContents(guide)}
  </div>
</main>`,
  });
}

function guideIndexPage(project: Project, guides: Guide[]) {
  const rows = guides.map((g) => `      <a class="card" href="${g.url}">
        <h2 class="mb-2 text-[1.2rem] font-bold tracking-[-.02em] transition-colors">${esc(g.title)}</h2>
        <p class="text-[.92rem] text-dim">${esc(clip(g.intro, 150))}</p>
      </a>`).join("\n");

  const filler = guides.length % 2 ? '\n      <div class="hidden bg-surface sm:block"></div>' : "";

  return shell({
    path: docsUrl(project),
    css: "../../style.css",
    js: "../../search.js",
    width: DOCS_WIDTH,
    title: `${project.name} documentation`,
    description: `Every guide for ${project.name}: ${project.blurb}`,
    source: { url: project.repo, label: "Source" },
    main: `<main class="mx-auto ${DOCS_WIDTH} px-6">
  <div class="pt-10 pb-14">
    <a class="text-xs tracking-widest text-dim uppercase hover:text-acid" href="/${project.key}">&larr; ${esc(project.name)}</a>
    <h1 class="mt-4.5 text-[clamp(2.2rem,6vw,3.6rem)]/[1.02] font-extrabold tracking-[-.04em]">${esc(project.name)} docs</h1>
    <p class="mt-6 max-w-[72ch] text-[1.05rem] text-dim">${esc(project.blurb)}</p>
    <p class="mt-4 max-w-[72ch] text-dim">${guides.length} guides, kept in step with
    <a class="border-b border-edge text-cyan hover:border-cyan" href="${project.repo}/tree/${project.branch}/docs" rel="noopener">the Markdown in the repo</a>,
    which stays the source of truth.</p>
  </div>
  <section class="mb-22.5">
    <div class="grid gap-px border border-line bg-line sm:grid-cols-2">
${rows}${filler}
    </div>
  </section>
</main>`,
  });
}

// --------------------------------------------- pages, Markdown, llms.txt
//
// Every page is also published as Markdown at <url>.md, indexed by /llms.txt
// and concatenated into /llms-full.txt. A crawler that would rather read prose
// than a Tailwind class soup gets the prose. Nothing here is hand-maintained,
// so the Markdown cannot drift away from the HTML it was made from.

/** The hand-written pages, in the order a reader should meet them. */
const PAGES = [
  { path: "/", file: "src/index.html", group: "Start here", pri: "1.0" },
  { path: "/penombre", file: "src/penombre.html", group: "Projects", pri: "0.8" },
  { path: "/homerun", file: "src/homerun.html", group: "Projects", pri: "0.8" },
  { path: "/baba", file: "src/baba.html", group: "Projects", pri: "0.8" },
  { path: "/nuvio-web", file: "src/nuvio-web.html", group: "Projects", pri: "0.8" },
  { path: "/svelte-smol", file: "src/svelte-smol.html", group: "Projects", pri: "0.8" },
  { path: "/dokploy-to-pangolin", file: "src/dokploy-to-pangolin.html", group: "Projects", pri: "0.8" },
  { path: "/blog", file: "src/blog/index.html", group: "Start here", pri: "0.9" },
  { path: "/about", file: "src/about.html", group: "Start here", pri: "0.7" },
];

/** `/` -> `/index.md`, `/blog` -> `/blog.md`, `/penombre` -> `/penombre.md`. */
const mdPath = (path: string) => (path === "/" ? "/index.md" : `${path}.md`);

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  mdash: "—", ndash: "–", hellip: "…", middot: "·",
  larr: "←", rarr: "→", times: "×", copy: "©", deg: "°",
};

const unentity = (s: string) =>
  s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);

/** The inline content of a tag, markup already converted, flattened to one line. */
const flat = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** `./avatar.jpg` is relative to src/, which is the site root. */
const absolute = (url: string) => (url.startsWith("./") ? url.slice(1) : url);

/**
 * The <main> of one of our own pages, as Markdown. Not a general-purpose
 * converter: it only knows the handful of tags these pages actually use.
 */
function markdown(html: string): string {
  const pre: string[] = [];
  let s = (html.match(/<main[^>]*>([\s\S]*)<\/main>/i)?.[1] ?? html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<button\b[\s\S]*?<\/button>/gi, "")
    // <pre> is stashed whole: its whitespace has to survive the tidying below.
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, body: string) => {
      pre.push(unentity(body.replace(/<[^>]+>/g, "")).replace(/^\n+|\s+$/g, ""));
      return `\n\n@@PRE${pre.length - 1}@@\n\n`;
    });

  s = s
    // a <picture> keeps only its fallback <img>: the <source>s are the same shot
    .replace(/<source\b[^>]*>/gi, "")
    .replace(/<img\b[^>]*>/gi, (tag: string) => {
      const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
      const alt = tag.match(/\balt="([^"]*)"/i)?.[1] ?? "";
      return src ? `\n\n![${unentity(alt)}](${absolute(src)})\n\n` : "";
    })
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      // a card is an <a> wrapped around a whole block: keep its structure and
      // put the destination underneath, rather than mashing it into one link.
      if (/<(h[1-6]|p|div|ul|ol)\b/i.test(inner)) return `${inner}\n\n[More &rarr;](${absolute(href)})\n\n`;
      const text = flat(inner);
      return text ? `[${text}](${absolute(href)})` : "";
    })
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, t: string) => "`" + flat(t) + "`")
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t: string) => {
      const text = flat(t);
      return text ? `**${text}**` : "";
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t: string) => {
      const text = flat(t);
      return text ? `*${text}*` : "";
    })
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, t: string) =>
      `\n\n${"#".repeat(Number(level))} ${flat(t)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t: string) => `\n- ${flat(t)}`)
    .replace(/<\/(p|div|section|article|ul|ol|figure|figcaption|blockquote|header|footer|main)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  return unentity(s)
    .split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    // only now, so none of the tidying above could reach inside a code block
    .replace(/@@PRE(\d+)@@/g, (_m, i: string) => "```\n" + pre[Number(i)] + "\n```") + "\n";
}

const titleOf = (html: string) =>
  unentity(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
const descriptionOf = (html: string) =>
  unentity(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? "").trim();

type Doc = { path: string; group: string; title: string; description: string; body: string };

/** A page's Markdown twin: what it is, where it came from, then the page itself. */
const twin = (d: Doc) =>
  `> ${d.description}\n> Source: ${SITE}${d.path} · Site index: ${SITE}/llms.txt\n\n${d.body}`;

function llmsIndex(docs: Doc[]) {
  const group = (name: string) => docs.filter((d) => d.group === name)
    .map((d) => `- [${d.title}](${SITE}${mdPath(d.path)}): ${d.description}`).join("\n");

  return `# orochibraru

> Free, open-source, self-hosted software for homelabs, written by one person and given away:
> a cloud drive (Penombre), a single-host PaaS (Homerun), a server monitor (Baba), a media web
> client (Nuvio Web), a SvelteKit adapter (svelte-smol) and a webhook bridge (dokploy-to-pangolin).
> No subscriptions, no seats, no paywalled features, no telemetry.

Every page here is also published as Markdown: append \`.md\` to any URL, for example
${SITE}/penombre.md. The whole site as one file is at ${SITE}/llms-full.txt. Crawling, indexing,
quoting and training are all explicitly allowed; see ${SITE}/robots.txt.

## Projects

${group("Projects")}

## Start here

${group("Start here")}

## Blog

${group("Blog")}
${PROJECTS.map((project) => `
## ${project.name} documentation

${group(`${project.name} docs`)}
`).join("")}
## Optional

- [RSS feed](${SITE}/feed.xml): new posts, as they are written.
- [Sitemap](${SITE}/sitemap.xml): every canonical URL on the site.
- [GitHub](https://github.com/orochibraru?tab=repositories): the source for all of it.
`;
}

const llmsFull = (docs: Doc[]) =>
  "# orochibraru.com — the whole site, as Markdown\n\n" +
  `Generated ${new Date().toISOString().slice(0, 10)}. Index: ${SITE}/llms.txt\n\n` +
  docs.map((d) => `---\n\n${twin(d)}`).join("\n\n") + "\n";

function sitemap(posts: Post[], guides: Guide[]) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = [
    ...PAGES.map((p) => [p.path, today, p.pri] as const),
    ...PROJECTS.map((project) => [docsUrl(project), today, "0.7"] as const),
    ...guides.map((g) => [g.url, today, "0.6"] as const),
    ...posts.map((p) => [`/blog/${p.slug}`, p.date, "0.6"] as const),
  ].map(([path, mod, pri]) =>
    `  <url><loc>${SITE}${path}</loc><lastmod>${mod}</lastmod><priority>${pri}</priority></url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}

// ---------------------------------------------------------------- build

const posts = await loadPosts();
const guides = await loadGuides();

await rm("src/blog", { recursive: true, force: true });
await mkdir("src/blog", { recursive: true });
await Bun.write("src/blog/index.html", indexPage(posts));
for (const p of posts) await Bun.write(`src/blog/${p.slug}.html`, postPage(p));

for (const project of PROJECTS) {
  const siblings = guides.filter((g) => g.project.key === project.key);
  await rm(`src/${project.key}/docs`, { recursive: true, force: true });
  await mkdir(`src/${project.key}/docs`, { recursive: true });
  await Bun.write(`src/${project.key}/docs/index.html`, guideIndexPage(project, siblings));
  for (const guide of siblings) {
    await Bun.write(`src/${project.key}/docs/${guide.slug}.html`, guidePage(guide, siblings));
  }
}

await rm("dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [...new Glob("src/**/*.html").scanSync(".")].filter((f) => !f.includes("/_")),
  root: "src",
  outdir: "dist",
  minify: true,
  plugins: [tailwind, htmlIncludes],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Bun emits one empty JS chunk per page (the inline scripts stay inline). Drop them
// so every page isn't fetching a 0-byte module.
const empty = new Set<string>();
for (const js of new Glob("dist/**/*.js").scanSync(".")) {
  if (Bun.file(js).size > 0) continue;
  empty.add(js.split("/").pop()!);
  await rm(js);
}
/** dist/penombre.html -> /penombre.md. The 404 page gets no twin. */
function mdTwinOf(distHtml: string): string | null {
  const rel = distHtml.replace(/^dist/, "").replace(/\.html$/, "");
  if (rel === "/404") return null;
  return rel === "/index" ? "/index.md" : `${rel.replace(/\/index$/, "")}.md`;
}

for (const html of new Glob("dist/**/*.html").scanSync(".")) {
  const original = await Bun.file(html).text();
  let out = original.replace(/<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, url: string) =>
    empty.has(url.split("/").pop()!) ? "" : tag,
  );
  const twinUrl = mdTwinOf(html);
  if (twinUrl) {
    out = out.replace("</head>",
      `<link rel="alternate" type="text/markdown" href="${twinUrl}">\n</head>`);
  }
  if (out !== original) await Bun.write(html, out);
}

// Markdown twins, then the two files that index them for language models.
const docs: Doc[] = [];
for (const page of PAGES) {
  const html = await Bun.file(page.file).text();
  docs.push({
    path: page.path, group: page.group,
    title: titleOf(html), description: descriptionOf(html), body: markdown(html),
  });
}
for (const project of PROJECTS) {
  const siblings = guides.filter((g) => g.project.key === project.key);
  docs.push({
    path: docsUrl(project), group: `${project.name} docs`,
    title: `${project.name} documentation`, description: project.blurb,
    body: `# ${project.name} documentation\n\n${project.blurb}\n\n`
      + `The Markdown in [the project repo](${project.repo}/tree/${project.branch}/docs) is the source of truth;\n`
      + `these pages are generated from it.\n\n`
      + siblings.map((g) => `- [${g.title}](${SITE}${mdPath(g.url)}): ${clip(g.intro, 160)}`).join("\n")
      + "\n",
  });
}
for (const guide of guides) {
  docs.push({
    path: guide.url, group: `${guide.project.name} docs`,
    title: guide.title, description: clip(guide.intro, 180), body: guide.markdown,
  });
}
for (const p of posts) {
  docs.push({
    path: `/blog/${p.slug}`, group: "Blog", title: p.title, description: p.description,
    body: `# ${p.title}\n\n*${readable(p.date)}*\n\n${p.md}\n`,
  });
}
for (const d of docs) await Bun.write(`dist${mdPath(d.path)}`, twin(d));
// One flat index for the ⌘K dialog: a guide contributes a row per heading, so
// a result lands on the section that answers the question, not the page top.
const searchIndex = [
  ...guides.flatMap((guide) => guide.sections.map((section) => ({
    u: `${guide.url}${section.id ? `#${section.id}` : ""}`,
    t: section.heading,
    g: section.id ? guide.title : `${guide.project.name} docs`,
    p: guide.project.name,
    x: section.text,
  }))),
  ...PAGES.map((page) => {
    const doc = docs.find((d) => d.path === page.path)!;
    return { u: page.path, t: doc.title.replace(/[:|].*$/, "").trim(), g: "orochibraru", p: "", x: doc.description };
  }),
  ...posts.map((post) => ({ u: `/blog/${post.slug}`, t: post.title, g: "Blog", p: "", x: post.description })),
];
await Bun.write("dist/search.json", JSON.stringify(searchIndex));

await Bun.write("dist/llms.txt", llmsIndex(docs));
await Bun.write("dist/llms-full.txt", llmsFull(docs));

await cp("src/robots.txt", "dist/robots.txt");
// The pages reference these through the bundler, which hashes them. The Markdown
// twins are written from the sources instead, so they link the unhashed path:
// ship that too, or every image in a .md twin is a 404.
await cp("src/avatar.jpg", "dist/avatar.jpg");
for (const project of PROJECTS) {
  // a project whose guides have no screenshots has no images/ directory at all:
  // git doesn't carry empty ones, so a fresh clone hasn't got it either
  const images = `src/docs/${project.key}/images`;
  if (await stat(images).then(() => true, () => false)) {
    await cp(images, `dist/${project.key}/docs/images`, { recursive: true });
  }
}
await Bun.write("dist/sitemap.xml", sitemap(posts, guides));
await Bun.write("dist/feed.xml", feed(posts));

console.log(
  `built ${result.outputs.length} files, ${posts.length} post(s), ${guides.length} guide(s) and ${docs.length} Markdown twin(s) -> dist/`,
);
