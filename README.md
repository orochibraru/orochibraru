# [orochibraru.com](https://orochibraru.com/)

```sh
bun install
bun run dev      # build, serve, rebuild on change
bun run build    # -> dist/
bun run audit    # Lighthouse over every page (needs Chrome)
```

Pages are plain HTML in `src/`. The shared header, footer and `<head>` live in
`src/_partials/` and are pulled in at build time by `<!--#include header.html -->`
(see `plugins/html-includes.ts`).

The Penombre screenshots are vendored as WebP in `src/screenshots/`.
`bun run screenshots` refetches them from the Penombre docs and re-encodes them
(needs `cwebp`); a [daily workflow](.github/workflows/screenshots.yml) does the
same and commits anything that moved.

Commit hooks run under [prek](https://github.com/j178/prek), which has to be
installed once per clone:

```sh
prek install              # wire up .git/hooks
prek run --all-files      # run them over the repo
```
