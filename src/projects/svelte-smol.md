---
name: svelte-smol
tag: Tooling · npm package
title:
  "svelte-smol: compile SvelteKit into a single Bun binary, free and open source"
description:
  svelte-smol is a free SvelteKit adapter that compiles your app to one
  standalone executable with bun build --compile. No node_modules to ship, a
  built-in Docker healthcheck, MIT licensed.
buttons:
  - {
      label: Read the docs,
      href: /svelte-smol/docs,
      icon: book-open,
      primary: true,
    }
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/svelte-smol",
      icon: github,
    }
  - {
      label: npm,
      href: "https://www.npmjs.com/package/@orochibraru/svelte-smol",
      icon: package,
    }
schema:
  applicationCategory: DeveloperApplication
  operatingSystem: Linux, macOS, Docker
  license: https://opensource.org/licenses/MIT
position: 5
category: Tooling
blurb:
  "A SvelteKit adapter that compiles your app to one standalone binary with Bun.
  No node_modules to ship, built-in healthcheck for Docker."
chips: ["Bun", "SvelteKit", "Adapter", "npm"]
---

A SvelteKit adapter that compiles your whole app into a **single standalone
executable** with `bun build --compile`. No `node_modules`, no JS files to ship.
One binary plus its static assets.

## Use it

```bash
bun add -d @orochibraru/svelte-smol
```

```javascript
// svelte.config.js
import adapter from "@orochibraru/svelte-smol";

export default {
  kit: { adapter: adapter() },
};
```

The compile step runs under the Bun runtime, so build with `bun run vite build`.

## What you get

```text
build/
├── server        # the compiled executable
├── client/       # static assets, served by the executable
└── prerendered/  # prerendered pages, served by the executable
```

Ship the whole `build/` directory, or just `server` if a proxy or CDN serves the
assets. The executable finds `client/` and `prerendered/` relative to its own
path, so it runs from any working directory: `./build/server`.

## Details

### Tiny images

A container with one binary in it. Nothing else to copy, nothing else to patch.

### Docker healthcheck

A compiled healthcheck binary ships alongside the server, so `HEALTHCHECK` needs
no curl in the image.

### Native addon escape hatch

`compile: false` emits a plain bundle instead, for when `sharp` or
`better-sqlite3` refuse to be bundled.

### Asset serving toggle

`serveAssets` hands static files to your proxy or CDN when you’d rather it
didn’t do that job.

### Cross-compilation

`target` builds for Linux, macOS, Windows or Alpine’s musl from any host — Bun
fetches the matching runtime the first time you use it.
