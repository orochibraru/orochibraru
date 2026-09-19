# Repo rules

## Biome output must be empty

`bunx biome check .` must report nothing: no errors, no warnings, no infos. If
it reports anything — including in code you did not touch — fix the cause before
calling the work done. Don't silence a diagnostic with a `biome-ignore` comment
or by switching a rule off; if a rule really is wrong for this repo, ask first.

Two rules here are stricter than the recommended preset:

- `style/useBlockStatements`: every `if`/`else`/`for`/`while` body gets braces,
  even a one-line `return`.
- `tools/throw-kit-errors.grit`: SvelteKit's `error()` and `redirect()` are
  written `throw error(404)`, never as a bare call statement.

## Content lives in the database

Posts, project pages and project docs are rows in SQLite (`DATA_DIR/site.db`),
not files. Edit them in `/admin`, over the MCP server, or through
`src/lib/server/editor.ts`, which every write goes through. `src/projects/`,
`src/posts/` and `src/docs/` only seed a fresh database (`bun run import`, run
by the Docker build) until production has been seeded.

- Routes never query Drizzle directly: public reads go through
  `src/lib/server/content.ts`, writes through `editor.ts` (a pre-commit hook
  checks).
- Internal links go through `resolve()` (another hook checks).
- `AUTH_SECRET` must never change in a deployed instance: see README.
- `bun test` runs every suite on a throwaway database; add one for new server
  logic.
