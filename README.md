# [orochibraru.com](https://orochibraru.com/)

Plain HTML in `src/`, built by Bun into `dist/`, served by nginx. No framework.

## Setup

```sh
bun install
```

That also runs `prek install`, which wires up the commit hooks. If [prek][prek]
isn't on your PATH the install still succeeds — it just says so and moves on;
install prek and re-run `bun install` to get the hooks.

## Commands

Every one of these is a `bun run`, and every one expects to be run from the
repo root. `dev` and `audit` build first, so there is no order to remember.

| Command | What it does | Needs |
| --- | --- | --- |
| `bun run dev` | Build, serve `dist/` on [localhost:3000][dev], rebuild on change | |
| `bun run build` | Static build into `dist/` | |
| `bun run docs` | Vendor each project's guides and screenshots into `src/docs/` | `cwebp` |
| `bun run audit` | Lighthouse over every page, non-zero if a score drops | Chrome |
| `bun run lint` | Tailwind classes written the canonical way | |
| `bun run lint:fix` | The same, rewriting what it can | |
| `bun run typecheck` | `tsc --noEmit` over `scripts/` | |

`audit` takes paths to narrow it down — `bun run audit /penombre` — and fails
the run if performance drops under 0.9 or anything else under 1.0.

`docs` needs cwebp: `brew install webp`, or `apt-get install webp`. Set
`GITHUB_TOKEN` if you hit the anonymous rate limit on the repo listing.

## Output

Every script reports through the same logger, tagged with which one is talking
(`build`, `docs`, `dev`, `audit`, `guides`) — worth knowing, because `dev` and
`audit` both shell out to the build, so you see two tags in one stream.

A phase prints when it starts and again when it finishes, with how long it took,
so a slow or hung step names itself. Two environment variables move the volume:

| | |
| --- | --- |
| *(default)* | A line per phase, and a summary |
| `VERBOSE=1` | Every file as it's touched, and every URL fetched |
| `QUIET=1` | Warnings, errors and the summary only |

```sh
VERBOSE=1 bun run build   # which pages, which guides, which twins
QUIET=1 bun run build     # one line, for CI
```

Warnings (`!`) and failures (`✗`) print at every volume and go to stderr, so
`bun run build >/dev/null` leaves you with just the things that need looking at.
Colour turns itself off when the output isn't a terminal, and `NO_COLOR=1` turns
it off anyway.

`dev` runs its rebuilds `QUIET`, so the watch loop stays one line per save —
`VERBOSE=1 bun run dev` if you want the full build each time.

## When to run what

- **Working on a page** — `bun run dev` and leave it running.
- **Before committing** — nothing by hand: the hooks run htmlhint and the
  Tailwind linter for you. `prek run --all-files` does the whole repo. A hook
  that rewrites a file fails the commit on purpose, so re-stage and commit
  again once you've looked at what it changed.
- **After changing a guide in a project's own repo** — `bun run docs` to pull
  it in, then commit what moved. A [daily workflow](.github/workflows/docs.yml)
  does this on its own; run it from the Actions tab if you don't want to wait.
- **Before a deploy, or after touching markup or CSS** — `bun run audit`.
- **Adding a project, or reordering its sidebar** — `scripts/projects.ts`.
- **Adding a blog post** — a Markdown file in `src/posts/`, with frontmatter.

## Layout

```
scripts/         everything runnable; all paths are relative to the repo root
  build.ts       the static build (Bun.build, because the CLI can't load plugins)
  dev.ts         build + serve + watch
  docs.ts        vendors the project guides
  guides.ts      turns vendored Markdown into pages, at build time
  lighthouse.ts  the audit
  projects.ts    which projects publish docs here, and in what order
  log.ts         the logger they all report through
  plugins/       bundler plugins: html-includes.ts resolves the #includes
src/             the site: one HTML file per page
  _partials/     head, header, footer — pulled in at build time
  posts/         blog posts as Markdown, the source for src/blog/
  docs/          vendored guides, the source for /<project>/docs/
```

Pages are plain HTML. The shared header, footer and `<head>` live in
`src/_partials/` and are pulled in at build time by `<!--#include header.html -->`
(see `scripts/plugins/html-includes.ts`).

Each project's guides live in its own repo (`docs/*.md`, the source of truth)
and are published here at `/<project>/docs/<slug>`.

Mind the two `docs` paths, which are not the same thing. `src/docs/<project>/`
is the vendored Markdown: committed, and what `bun run docs` writes.
`src/<project>/docs/` is the HTML built from it: gitignored, along with
`src/blog/` and `dist/`. `dev` ignores writes to the generated ones, so a
rebuild doesn't trigger another one. Nothing generated is worth editing by hand.

[prek]: https://github.com/j178/prek
[dev]: http://localhost:3000/
