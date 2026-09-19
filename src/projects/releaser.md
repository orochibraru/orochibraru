---
name: releaser
tag: Tooling · GitHub Action
title:
  "releaser: a semantic-release alternative in one Go binary, free and open
  source"
description:
  "releaser is a free, open-source semantic-release alternative: conventional
  commits in, version, CHANGELOG, tag and GitHub release out. No plugins, no
  config file, no node_modules, one static Go binary."
buttons:
  - {
      label: Read the docs,
      href: /releaser/docs,
      icon: book-open,
      primary: true,
    }
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/releaser",
      icon: github,
    }
  - {
      label: Releases,
      href: "https://github.com/orochibraru/releaser/releases",
      icon: download,
    }
schema:
  applicationCategory: DeveloperApplication
  operatingSystem: Linux, macOS
  softwareHelp: https://orochibraru.com/releaser/docs
  keywords:
    semantic-release alternative, release automation, conventional commits,
    changelog generator, GitHub Actions, semver
position: 6
category: Tooling
blurb:
  "semantic-release without the plugins, the config or node_modules.
  Conventional commits in; version, changelog, tag and GitHub release out. One
  static Go binary."
chips: ["Go", "GitHub Actions", "Semver", "Docker"]
---

semantic-release without the plugins, the config or `node_modules`. **One static
Go binary**, zero dependencies. Push to `main` and it reads your conventional
commits, picks the next version, writes the changelog, tags and publishes the
GitHub release.

## Use it

### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v7
      - uses: orochibraru/releaser@v1
```

That’s the whole setup. The next push with a `feat` or `fix` commit gets a
`CHANGELOG.md` entry, the `version` in `package.json` bumped if there is one, a
`chore(release): X.Y.Z [skip ci]` commit, a `vX.Y.Z` tag and a GitHub release
with the same notes. The first release is always `1.0.0`.

## What it does

### Versions from commits

`feat` bumps minor, `fix`, `perf` and `revert` bump patch, `!` or a
`BREAKING CHANGE:` footer bumps major. Everything else releases nothing. The
strongest bump wins.

### Rules, not plugins

`rules: breaking=patch,feat=patch` overrides a bump or adds a type. Overrides
merge over the defaults instead of replacing them.

### Release notes

Breaking changes, features, fixes, performance, reverts, docs and refactors, in
that order and only when they have entries. Every entry links to its commit, and
the heading to the compare view.

### Artifact mode

`artifacts: dist/app.zip=app-${version}.zip` attaches build outputs to the
release. Globs work, and a pattern that matches nothing fails the run before
anything is pushed.

### Docker mode

`docker: true` builds `./Dockerfile` and pushes `:X.Y.Z` and `:latest` to GHCR,
multi-arch if you ask. The push happens before the tag, so a failed build leaves
the repo untouched.

### Dry run by default

Outside CI it only prints the next version and its notes. `-dry-run=false`
releases for real.

## Coming from semantic-release

Delete `.releaserc.json`, the plugins in `package.json` and the
`npx semantic-release` step. The commit analyzer, notes generator, changelog and
`package.json` bump are built in; `exec`’s `prepareCmd` becomes `prepare`, the
git plugin’s extra assets become `commit`, the GitHub plugin’s assets become
`artifacts`. The [migration guide](/releaser/docs/migrating) maps every plugin.

What it doesn’t do: one release branch, no prerelease or maintenance channels,
and no npm publish. Run that in `prepare`, or in a later step gated on the
`released` output.
