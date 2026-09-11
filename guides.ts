// The vendored guides, turned into something this site can publish.
//
// Upstream writes them to be read in a repo: links point at `env.md`, images at
// `images/hero.png`, and anchors assume GitHub's heading slugs. Nothing is
// rewritten at sync time — src/docs stays diffable against upstream — so all of
// that happens here, once, at build time.
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import { PROJECTS, docsDir, docsUrl, type Project } from "./projects";

export type Section = { id: string; heading: string; text: string; level: number };

export type Guide = {
  project: Project;
  slug: string;
  url: string;
  title: string;
  /** First paragraph, as plain text: the meta description and the index blurb. */
  intro: string;
  /** Rendered body, with the leading <h1> removed — the layout prints the title. */
  html: string;
  /** The source with links rewritten, published at <url>.md. */
  markdown: string;
  sections: Section[];
};

/**
 * GitHub's heading slug: lowercase, drop anything that isn't a letter, digit,
 * space, hyphen or underscore, then spaces to hyphens. Worth matching exactly —
 * guides link to each other's anchors (`services.md#custom-domains--ssl`, whose
 * double hyphen is the removed `&`), and those have to keep landing.
 */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    // the renderer escapes first, and "&" has to be a removed character rather
    // than the letters "amp": GitHub slugs "Custom domains & SSL" with the
    // double hyphen its absence leaves, and guides link to exactly that
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/ /g, "-");

/** Strip enough Markdown to leave readable prose for descriptions and search. */
const plain = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * One link target, as this site should serve it:
 *   env.md, env.md#redis   another guide, here
 *   #redis                 same page, left alone
 *   images/hero.png        the vendored WebP
 *   ../compose.yaml        a file only the repo has: send people to the repo
 *   https://…              left alone
 */
function rewrite(
  target: string,
  project: Project,
  slugs: Set<string>,
  image: (name: string) => string,
): string {
  if (/^(https?:|mailto:|#|\/)/.test(target)) return target;

  const [path = "", hash] = target.split("#", 2);
  const anchor = hash ? `#${hash}` : "";

  const picture = path.match(/^images\/(.+)\.(?:png|jpe?g|webp)$/i);
  if (picture) return image(picture[1]!);

  const guide = path.match(/^([\w-]+)\.md$/);
  if (guide && slugs.has(guide[1]!)) return `${docsUrl(project, guide[1]!)}${anchor}`;

  // anything else is a repo file this site doesn't publish
  const outsideDocs = path.startsWith("../");
  const cleaned = path.replace(/^\.\//, "").replace(/^\.\.\//, "");
  return `${project.repo}/blob/${project.branch}/${outsideDocs ? "" : "docs/"}${cleaned}${anchor}`;
}

/**
 * Width and height straight out of the WebP header, so images rendered from
 * Markdown can carry the attributes that stop the page shifting as they load.
 * Covers the three chunk layouts cwebp emits; anything else gets no attributes
 * rather than wrong ones.
 */
function dimensions(file: string): { width: number; height: number } | null {
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(file);
  } catch {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fourCC = String.fromCharCode(...bytes.subarray(12, 16));

  if (fourCC === "VP8 ") {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  if (fourCC === "VP8L") {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourCC === "VP8X") {
    const read24 = (at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  return null;
}

/** Split the body by heading: one search result should land on a section. */
function sections(body: string, title: string): Section[] {
  const found: Section[] = [{ id: "", heading: title, text: "", level: 1 }];
  let fenced = false;

  for (const line of body.split("\n")) {
    if (line.startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const heading = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (heading) {
      found.push({
        id: slugify(heading[2]!), heading: plain(heading[2]!), text: "", level: heading[1]!.length,
      });
      continue;
    }
    if (/^\s*\|/.test(line)) continue; // table rows read as noise out of context

    // drop the markers a line carries into prose: blockquote arrows, bullets
    const text = plain(line.replace(/^\s*>\s?/, "").replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
    if (text) found[found.length - 1]!.text += `${text} `;
  }

  return found
    .map((section) => ({ ...section, text: section.text.trim().slice(0, 400) }))
    .filter((section) => section.heading && (section.text || section.id));
}

export async function loadGuides(): Promise<Guide[]> {
  const guides: Guide[] = [];

  for (const project of PROJECTS) {
    const directory = docsDir(project);
    const files = [...new Glob("*.md").scanSync(directory)];
    const slugs = new Set(files.map((file) => file.replace(/\.md$/, "")));

    // order[] first, then anything upstream added that nobody has placed yet
    const ordered = [
      ...project.order.filter((slug) => slugs.has(slug)),
      ...[...slugs].filter((slug) => !project.order.includes(slug)).sort(),
    ];

    for (const slug of ordered) {
      const raw = await Bun.file(`${directory}/${slug}.md`).text();

      const heading = raw.match(/^#\s+(.+?)\s*$/m);
      const title = heading ? plain(heading[1]!) : slug;
      const body = heading ? raw.replace(heading[0], "").trimStart() : raw;

      // The page is written to src/<key>/docs/<slug>.html, so the bundler sees
      // (and hashes) the image from there; the .md twin keeps the served path.
      const inPage = (name: string) => `../../docs/${project.key}/images/${name}.webp`;
      const inTwin = (name: string) => `${docsUrl(project)}/images/${name}.webp`;

      const ids = new Map<string, number>();
      const html = Bun.markdown
        .html(body)
        .replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_tag, level: string, inner: string) => {
          const base = slugify(inner);
          const seen = ids.get(base) ?? 0;
          ids.set(base, seen + 1);
          const id = seen ? `${base}-${seen}` : base;
          return `<h${level} id="${id}">${inner}</h${level}>`;
        })
        .replace(/<a href="([^"]*)"/g, (_tag, href: string) =>
          `<a href="${rewrite(href, project, slugs, inPage)}"`)
        .replace(/<img src="([^"]*)"([^>]*?)\/?>/g, (_tag, src: string, rest: string) => {
          const source = rewrite(src, project, slugs, inPage);
          const name = src.match(/^images\/(.+)\.[a-z]+$/i)?.[1];
          const size = name ? dimensions(`${directory}/images/${name}.webp`) : null;
          const sized = size ? ` width="${size.width}" height="${size.height}"` : "";
          return `<img src="${source}"${rest}${sized} loading="lazy" decoding="async">`;
        })
        // the env references are mostly tables, and some are wider than a phone
        .replace(/<table>/g, '<div class="md-table"><table>')
        .replace(/<\/table>/g, "</table></div>");

      const firstParagraph = body.split(/\n\s*\n/).find((block) => !/^[#`|\-!]/.test(block.trim())) ?? "";
      const intro = plain(firstParagraph);

      guides.push({
        project,
        slug,
        url: docsUrl(project, slug),
        title,
        intro,
        html,
        markdown: raw.replace(/\]\(([^)]+)\)/g, (_link, target: string) =>
          `](${rewrite(target, project, slugs, inTwin)})`),
        sections: sections(body, title),
      });
    }
  }

  return guides;
}
