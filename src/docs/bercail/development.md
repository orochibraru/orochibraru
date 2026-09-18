# Development

Requires [Bun](https://bun.sh) and [prek](https://prek.j178.dev/) (`brew install prek`).

```bash
bun install   # also installs the git hooks
bun dev
```

| Command            | What it does                                    |
| ------------------ | ----------------------------------------------- |
| `bun run check`    | Type check                                      |
| `bun run lint`     | Lint with Biome                                 |
| `bun run lint:fix` | Lint and apply fixes                            |
| `bun run format`   | Format TypeScript, Svelte and Markdown          |
| `bun run test`     | Run the test suite                              |
| `prek run -a`      | Run every git hook against the whole repository |

The hooks format, lint, type check and test on commit, scan for secrets and typos, and require
[Conventional Commits](https://www.conventionalcommits.org/) messages.

## Stack

SvelteKit 3 (prerelease) on Bun with [remote functions](https://svelte.dev/docs/kit/remote-functions), SQLite with Drizzle ORM, Tailwind CSS and
[shadcn-svelte](https://shadcn-svelte.com/) components.
