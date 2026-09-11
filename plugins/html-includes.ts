// Server-side includes for plain HTML, at build time.
//
// Bun hands .html entrypoints to onLoad like any other file, so a page can pull
// in a shared fragment before the HTML loader ever sees it:
//
//     <!--#include header.html source="https://github.com/x/y" sourceLabel="Source" -->
//
// Fragments live in src/_partials/. The leading underscore keeps them out of the
// page glob in build.ts, so a fragment never becomes a page of its own. Inside a
// fragment, `{{name}}` reads back an attribute from the include and
// `{{name|fallback}}` supplies a default for the pages that don't pass one.
//
// The syntax is Apache's, because that is already the convention for this and
// because a browser opening the unbuilt file just sees a comment.
import type { BunPlugin } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PARTIALS = "src/_partials";

/** `<!--#include file.html a="1" b="2" -->` on a line of its own. */
const INCLUDE = /^([ \t]*)<!--#include\s+([\w.-]+)\s*([^>]*?)-->[ \t]*$/gm;
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g;
const SLOT = /\{\{([\w-]+)(?:\|([^}]*))?\}\}/g;

/** Guards against a fragment that includes itself, directly or in a ring. */
const MAX_DEPTH = 4;

export function expandIncludes(html: string, page = "page", depth = 0): string {
  return html.replace(INCLUDE, (_line, indent: string, file: string, attributes: string) => {
    if (depth >= MAX_DEPTH) {
      throw new Error(`${page}: #include nested more than ${MAX_DEPTH} deep (circular?)`);
    }
    const path = join(PARTIALS, file);
    let fragment: string;
    try {
      fragment = readFileSync(path, "utf8").trimEnd();
    } catch {
      throw new Error(`${page}: #include ${file} — no such fragment at ${path}`);
    }

    const values: Record<string, string> = {};
    for (const [, name, value] of attributes.matchAll(ATTRIBUTE)) values[name!] = value!;

    const filled = fragment.replace(SLOT, (_slot, name: string, fallback?: string) => {
      const value = values[name] ?? fallback;
      if (value === undefined) throw new Error(`${page}: ${file} wants {{${name}}}, which has no default`);
      return value;
    });

    // keep the fragment at the indentation the page put the include at
    return expandIncludes(filled, `${page} > ${file}`, depth + 1)
      .split("\n").join(`\n${indent}`)
      .replace(/^/, indent);
  });
}

export const htmlIncludes: BunPlugin = {
  name: "html-includes",
  setup(build) {
    build.onLoad({ filter: /\.html$/ }, async ({ path }) => ({
      contents: expandIncludes(await Bun.file(path).text(), path),
      loader: "html",
    }));
  },
};

export default htmlIncludes;
