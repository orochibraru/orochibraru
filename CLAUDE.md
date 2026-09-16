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
