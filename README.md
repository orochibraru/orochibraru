# [orochibraru.com](https://orochibraru.com/)

```sh
bun install
bun run dev      # build, serve, rebuild on change
bun run build    # -> dist/
bun run audit    # Lighthouse over every page (needs Chrome)
bun run docs     # pull the project guides (needs cwebp)
```

Pages are plain HTML in `src/`. The shared header, footer and `<head>` live in
`src/_partials/` and are pulled in at build time by `<!--#include header.html -->`
(see `plugins/html-includes.ts`).

Each project's guides live in its own repo (`docs/*.md`, the source of truth)
and are published here at `/<project>/docs/<slug>`. `bun run docs` vendors them
into `src/docs/` along with their screenshots as WebP (needs `cwebp`); a
[daily workflow](.github/workflows/docs.yml) does the same and commits anything
that moved. `projects.ts` is where a project and its sidebar order are declared.

Commit hooks run under [prek](https://github.com/j178/prek), which has to be
installed once per clone:

```sh
prek install              # wire up .git/hooks
prek run --all-files      # run them over the repo
```
