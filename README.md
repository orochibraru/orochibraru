# [orochibraru.com](https://orochibraru.com/)

```sh
bun install
bun run dev      # build, serve, rebuild on change
bun run build    # -> dist/
```

Pages are plain HTML in `src/`. The shared header, footer and `<head>` live in
`src/_partials/` and are pulled in at build time by `<!--#include header.html -->`
(see `plugins/html-includes.ts`).

Commit hooks run under [prek](https://github.com/j178/prek), which has to be
installed once per clone:

```sh
prek install              # wire up .git/hooks
prek run --all-files      # run them over the repo
```
