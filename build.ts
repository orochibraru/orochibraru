// `bun build` (CLI) can't load plugins, so the static build goes through Bun.build.
//
// Blog posts are Markdown in src/posts/*.md. They're rendered to HTML pages in
// src/blog/ (generated, gitignored) *before* the bundle runs, so they get the same
// hashed stylesheet and minification as every hand-written page.
import tailwind from "bun-plugin-tailwind";
import { rm, cp, mkdir } from "node:fs/promises";
import { Glob } from "bun";

const SITE = "https://orochibraru.com";

type Post = {
  slug: string;
  title: string;
  date: string; // ISO, from frontmatter
  description: string;
  body: string; // rendered HTML
};

const esc = (s: string) => Bun.escapeHTML(s);

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
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** The shared page shell. Mirrors the hand-written pages in src/. */
function shell(o: {
  path: string; title: string; description: string;
  head?: string; main: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${SITE}${o.path}">
<meta name="theme-color" content="#f4f5f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#060709" media="(prefers-color-scheme: dark)">
<meta property="og:site_name" content="orochibraru">
<meta property="og:url" content="${SITE}${o.path}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="orochibraru" href="/feed.xml">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23060709'/><text y='24' x='6' font-size='22' fill='%23b4ff2e' font-family='monospace'>&#3647;</text></svg>">
<link rel="stylesheet" href="../style.css">
<script>try{var s=localStorage.getItem("theme");document.documentElement.dataset.theme=s||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}catch(e){}</script>
${o.head ?? ""}
</head>
<body>
<header class="mx-auto max-w-page px-6">
  <nav class="flex flex-wrap items-center justify-between gap-4 py-7">
    <a class="text-[15px] font-bold tracking-[-.02em]" href="/">orochi<span class="text-acid">braru</span></a>
    <div class="flex items-center gap-4 text-[13px] whitespace-nowrap text-dim sm:gap-5">
      <a class="hover:text-acid" href="/#projects">Projects</a>
      <a class="hover:text-acid" href="/blog">Blog</a>
      <a class="hover:text-acid" href="/about">About</a>
      <a class="hover:text-acid" href="https://github.com/orochibraru?tab=repositories" rel="noopener">GitHub</a>
      <button id="theme-toggle" type="button" aria-label="Toggle light and dark mode"
        class="grid size-8 place-items-center border border-edge transition hover:border-acid hover:text-acid">
        <svg viewBox="0 0 24 24" class="size-4 transition-transform duration-300" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </nav>
</header>
${o.main}
<footer class="mx-auto flex max-w-page flex-wrap justify-between gap-4 border-t border-line px-6 pt-8 pb-15 text-[12.5px] text-dim">
  <span>&copy; orochibraru. Built for homelabs, priced at zero.</span>
  <div class="flex flex-wrap gap-[18px]">
    <a class="hover:text-acid" href="/">Home</a>
    <a class="hover:text-acid" href="/feed.xml">RSS</a>
    <a class="hover:text-acid" href="https://github.com/orochibraru?tab=repositories" rel="noopener">GitHub</a>
    <a class="hover:text-acid" href="/sitemap.xml">Sitemap</a>
  </div>
</footer>
<script>document.getElementById("theme-toggle").onclick=function(){var d=document.documentElement,t=d.dataset.theme==="dark"?"light":"dark";d.dataset.theme=t;try{localStorage.setItem("theme",t)}catch(e){}};</script>
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
  <div class="md pb-[90px]">${p.body}</div>
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
    <h1 class="mt-[26px] text-[clamp(2.6rem,9vw,6.2rem)]/[.92] font-extrabold tracking-[-.045em]">
      Things that<br>
      <span class="bg-linear-to-r from-acid via-cyan to-plasma bg-clip-text text-transparent">annoyed me.</span>
    </h1>
    <p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">Written in Markdown, in the repo, built with the rest of
    the site. No CMS, no database, nothing to log in to.</p>
  </div>
  <section class="mb-[90px]">
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

function sitemap(posts: Post[]) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ["/", "1.0"], ["/blog", "0.9"], ["/about", "0.7"],
    ["/penombre", "0.8"], ["/homerun", "0.8"], ["/baba", "0.8"],
    ["/nuvio-web", "0.8"], ["/svelte-smol", "0.8"], ["/dokploy-to-pangolin", "0.8"],
  ].map(([path, pri]) => [path!, today, pri!] as const);

  const rows = [
    ...urls,
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

await rm("src/blog", { recursive: true, force: true });
await mkdir("src/blog", { recursive: true });
await Bun.write("src/blog/index.html", indexPage(posts));
for (const p of posts) await Bun.write(`src/blog/${p.slug}.html`, postPage(p));

await rm("dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [...new Glob("src/**/*.html").scanSync(".")],
  root: "src",
  outdir: "dist",
  minify: true,
  plugins: [tailwind],
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
for (const html of new Glob("dist/**/*.html").scanSync(".")) {
  const src = await Bun.file(html).text();
  const cleaned = src.replace(/<script[^>]*src="[^"]*\/?([^"/]+)"[^>]*><\/script>/g, (tag, file) =>
    empty.has(file) ? "" : tag,
  );
  if (cleaned !== src) await Bun.write(html, cleaned);
}

await cp("src/robots.txt", "dist/robots.txt");
await Bun.write("dist/sitemap.xml", sitemap(posts));
await Bun.write("dist/feed.xml", feed(posts));

console.log(`built ${result.outputs.length} files and ${posts.length} post(s) -> dist/`);
