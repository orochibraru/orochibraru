# CMS Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn orochibraru.com from a static nginx site into one SvelteKit
server app with SQLite, an SSO-fenced admin with a Markdown WYSIWYG editor, an
MCP server, and GitHub App docs sync.

**Architecture:** One Bun process built by `@orochibraru/svelte-smol`. Public
pages render on request from SQLite through one content module with an in-memory
render cache. `/admin`, `/mcp`, `/api/auth/**` and `/api/github/webhook` live in
the same app.

**Tech Stack:** SvelteKit 2 / Svelte 5, Bun, `bun:sqlite` + Drizzle 0.45,
better-auth 1.7.5 (`genericOAuth`, `jwt`, `@better-auth/mcp`,
`@better-auth/cimd`), `@modelcontextprotocol/sdk` 1.30
(`WebStandardStreamableHTTPServerTransport`), `@milkdown/crepe` 7.22, Shiki, zod
4, `cwebp`.

**Spec:** `docs/superpowers/specs/2026-09-19-cms-refactor-design.md`

## Global Constraints

- `bunx biome check .` prints nothing; no `biome-ignore`, no rule changes.
- `style/useBlockStatements`: braces on every `if`/`else`/`for`/`while` body.
- SvelteKit `error()` / `redirect()` are always `throw error(…)` /
  `throw redirect(…)`.
- Markdown files pass Prettier (`proseWrap: always`, 80 cols) and markdownlint
  (no inline HTML).
- No git writes of any kind. Every "commit" step in the usual template is
  replaced by "leave uncommitted".
- Env: `ORIGIN`, `AUTH_SECRET`, `DATA_DIR` (default `/data`), `OIDC_ISSUER`,
  `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `ADMIN_EMAILS`.
- Without `OIDC_ISSUER`: public site works; `/admin/**`, `/mcp`,
  `/api/github/**`, OAuth endpoints 404.
- Images: `cwebp -q 80 -resize 1200 0`, stored `DATA_DIR/images/<sha256>.webp`,
  served `/images/<sha256>.webp`,
  `Cache-Control: public, max-age=31536000, immutable`.
- New posts via MCP are always drafts; no delete over MCP.
- Starters (docs + skill) are out of scope until the admin UI has been reviewed.

## File map

| Path                                       | Responsibility                                      |
| ------------------------------------------ | --------------------------------------------------- |
| `svelte.config.js`                         | svelte-smol adapter                                 |
| `src/lib/server/env.ts`                    | Typed env, `ssoEnabled`, `adminEmails`              |
| `src/lib/server/db/schema.ts`              | Drizzle tables (content, GitHub, auth)              |
| `src/lib/server/db/index.ts`               | Open SQLite (WAL), run migrations, export `db`      |
| `drizzle/`                                 | Generated migrations                                |
| `src/lib/server/http.ts`                   | Canonical redirects and response headers (ex-nginx) |
| `src/hooks.server.ts`                      | `http.ts`, better-auth handler, admin guard         |
| `src/lib/server/auth.ts`                   | better-auth instance                                |
| `src/lib/server/images.ts`                 | Encode, hash, store, look up images                 |
| `src/lib/server/crypto.ts`                 | AES-GCM seal/open keyed from `AUTH_SECRET`          |
| `src/lib/server/content.ts`                | Public reads + render cache                         |
| `src/lib/server/project-pages.ts`          | Project renderer (existing, now fed from rows)      |
| `src/lib/server/guides.ts`                 | Guide renderer (existing, now fed from rows)        |
| `src/lib/server/posts.ts`                  | Post renderer (existing, now fed from rows)         |
| `src/lib/server/mcp.ts`                    | MCP server and tools                                |
| `src/lib/server/github/app.ts`             | Manifest, JWT, installation tokens, API calls       |
| `src/lib/server/github/sync.ts`            | Sync one repo in one transaction; queue; reconcile  |
| `src/lib/server/github/webhook.ts`         | Signature check, replay drop, dispatch              |
| `scripts/import.ts`                        | One-off import of `src/` content into the database  |
| `src/routes/admin/**`                      | Admin UI                                            |
| `src/lib/components/admin/Editor.svelte`   | Milkdown Crepe wrapper                              |
| `src/routes/mcp/+server.ts`                | MCP endpoint                                        |
| `src/routes/api/github/webhook/+server.ts` | Webhook endpoint                                    |
| `src/routes/images/[file]/+server.ts`      | Image serving                                       |
| `tests/**`                                 | `bun test` suites, each on a temp `DATA_DIR`        |

## Phase 1: Server foundation

### Task 1: Adapter, env and ex-nginx HTTP behaviour

**Files:** Modify `svelte.config.js`, `src/routes/+layout.ts`; Create
`src/lib/server/env.ts`, `src/lib/server/http.ts`, `src/hooks.server.ts`,
`tests/http.test.ts`. Delete `nginx.conf` at the end of Task 5.

**Interfaces:**

- Produces `env` (`origin`, `authSecret`, `dataDir`, `adminEmails`, and `oidc`
  with `issuer`, `clientId`, `clientSecret` when SSO is configured) and
  `isAdminEmail(email)`.
- Produces `canonical(url: URL): string | null` (the redirect target, or null)
  and `withHeaders(response: Response, pathname: string): Response`.

- [ ] Test `canonical`: `/index` → `/`, `/index.html` → `/`, `/baba.html` →
      `/baba`, `/blog/` → `/blog`, `/penombre/docs/index` → `/penombre/docs`,
      `/` → null, query string preserved.
- [ ] Test `withHeaders`: always `nosniff`, `SAMEORIGIN`,
      `strict-origin-when-cross-origin`; `.md` gets
      `text/markdown; charset=utf-8`; `/_app/immutable/x.js` and
      `/images/x.webp` get the immutable cache header.
- [ ] Implement; `hooks.server.ts` `handle` runs `canonical` (301, relative
      `Location`) then `resolve` then `withHeaders`.
- [ ] Switch the adapter to `@orochibraru/svelte-smol` (`adapter()`); drop the
      global `prerender = true`, keep it on `/about`, `/privacy`, `/404`.
- [ ] `bun test`, `bunx biome check .`, `bun run check:app` pass.

### Task 2: Database

**Files:** Create `src/lib/server/db/schema.ts`, `src/lib/server/db/index.ts`,
`drizzle.config.ts`, `drizzle/*`, `tests/db.test.ts`.

**Interfaces:** Produces `db` (Drizzle over `bun:sqlite`), `openDatabase(dir)`
for tests, and the tables `project`, `post`, `guide`, `image`, `githubApp`,
`installedRepo`, `syncRun`, `webhookDelivery`, plus better-auth's `user`,
`session`, `account`, `verification`, `jwks`, `oauthClient`, `oauthAccessToken`,
`oauthRefreshToken`, `oauthConsent`, `oauthClientAssertion` (generated with
`bunx @better-auth/cli generate` and kept in `schema.ts`).

- [ ] Test: `openDatabase(tmp)` creates `site.db`, WAL on, all tables present,
      reopening is idempotent.
- [ ] Implement; migrations generated by `drizzle-kit generate`, applied by
      `migrate()` from `drizzle-orm/bun-sqlite/migrator` at open. Migrations
      folder is embedded by importing each SQL file with `?raw`
      (`import.meta.glob`) so the compiled binary carries them.

### Task 3: Image store

**Files:** Create `src/lib/server/images.ts`,
`src/routes/images/[file]/+server.ts`, `tests/images.test.ts`.

**Interfaces:** Produces
`storeImage(bytes: Uint8Array, meta: ImageMeta): Promise<Image>` with
`ImageMeta = { alt?, source: "upload" | "sync", project?, name?, sourceSha? }`
and `Image = { id, sha256, width, height, url }`;
`imageByName(project, name): Image | undefined`; `dimensions()` moves here from
`guides.ts`.

- [ ] Test: PNG in → WebP out under `images/`, same bytes twice → one file and
      one row per (project, name), dimensions read back.
- [ ] Implement with `Bun.spawn(["cwebp", …])` on temp files.
- [ ] Route serves the file with the immutable header, 404 on unknown or non-hex
      names.

### Task 4: Auth

**Files:** Create `src/lib/server/auth.ts`,
`src/routes/api/auth/[...all]/+server.ts`,
`src/routes/admin/login/+page.svelte`, `src/routes/admin/consent/+page.svelte`,
`src/routes/admin/+layout.server.ts`, `src/lib/auth-client.ts`,
`tests/auth.test.ts`.

**Interfaces:** Produces `auth` (or `null` without SSO) and
`requireAdmin(event): Promise<{ email: string }>` which throws
`redirect(303, "/admin/login")` or `error(404)`.

better-auth config:

```ts
betterAuth({
  baseURL: env.origin,
  secret: env.authSecret,
  trustedOrigins: [env.origin],
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: false },
  disabledPaths: ["/token"],
  databaseHooks: {
    user: {
      create: {
        before: async (user) =>
          isAdminEmail(user.email) ? { data: user } : false,
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "sso",
          discoveryUrl,
          clientId,
          clientSecret,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
      ],
    }),
    jwt(),
    mcp({
      loginPage: "/admin/login",
      consentPage: "/admin/consent",
      resource: `${env.origin}/mcp`,
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
  ],
});
```

- [ ] Test `requireAdmin`: no SSO → 404; no session → redirect; session for a
      non-allowlisted email → 404; allowlisted → returns email.
- [ ] Login page: one "Sign in with SSO" button calling
      `authClient.signIn.oauth2({ providerId: "sso", callbackURL })`.
- [ ] Consent page: client name, scopes, Allow / Deny calling
      `authClient.oauth2.consent({ accept })`.

### Task 5: Docker image

**Files:** Modify `Dockerfile`; Delete `nginx.conf`; Modify `.dockerignore` if
present.

- [ ] Build stage: `bun install --frozen-lockfile`, `bun run build`.
- [ ] Runtime stage: `debian:bookworm-slim` + `webp`, copy `build/`,
      `VOLUME /data`, `ENV DATA_DIR=/data`, `HEALTHCHECK` with
      `build/healthcheck`, `CMD ["./server"]`.
- [ ] `docker build .` succeeds; container answers `/_health`.

## Phase 2: Content in the database

### Task 6: Content module and render cache

**Files:** Create `src/lib/server/content.ts`, `tests/content.test.ts`; Modify
`project-pages.ts`, `guides.ts`, `posts.ts` to take rows instead of files.

**Interfaces:** Produces `listProjects({ published? })`, `getProjectPage(repo)`,
`listPosts({ status? })`, `getPost(slug)`, `listGuides(repo?)`,
`getCategories(repo)`, `invalidate()`, `cached(key, fn)`.

- [ ] Test: renders a project row with tiles and a screenshot; drafts and
      unpublished projects are hidden; `invalidate()` drops cached HTML.

### Task 7: Import

**Files:** Create `scripts/import.ts`, `tests/import.test.ts`; Modify
`package.json` (`"import": "bun run scripts/import.ts"`).

- [ ] Reads `src/projects/*.md`, `src/posts/*.md`, `src/docs/**`, home cards
      from `src/routes/+page.svelte` (category, blurb, chips, order, via regex
      on the `card` anchors) and writes rows; images through `storeImage`.
- [ ] Refuses when `project` or `post` already has rows.
- [ ] Test: import into a temp dir yields 8 projects, all posts, all guides.

### Task 8: Public routes on the database

**Files:** Modify `src/routes/+page.svelte` (+ new `+page.server.ts`),
`[repo=repository]` → `[repo]`, `[project=project]/docs/**` → under
`[repo]/docs/**`, `blog/**`, `feed.xml`, `sitemap.xml`, `search.json`,
`llms.txt`, `llms-full.txt`, `[page=page].md`, `[project=project]/llms*.txt`,
`src/lib/server/documents.ts`; Delete `src/params/*`.

- [ ] Every public route reads through `content.ts`.
- [ ] `.md` twins of posts, projects, guides serve stored Markdown with absolute
      links.
- [ ] Acceptance: compare against today's build as in the spec's Migration
      section.

### Task 9: Admin shell, posts and editor

**Files:** Create `src/routes/admin/+layout.svelte`, `+page.svelte`,
`posts/+page.server.ts`, `posts/+page.svelte`, `posts/[id]/+page.server.ts`,
`posts/[id]/+page.svelte`, `src/lib/components/admin/Editor.svelte`,
`src/routes/admin/images/upload/+server.ts`,
`src/routes/admin/preview/+server.ts`.

- [ ] Editor: Crepe with `ImageBlock.onUpload` posting to `/admin/images/upload`
      and returning the `/images/<sha>.webp` URL; slash-menu entries "Feature
      tile" and "Screenshot"; `markdown` bindable.
- [ ] Post form action validates with zod, writes, `invalidate()`.
- [ ] Preview renders through the public renderer.

### Task 10: Admin projects and images

**Files:** Create `src/routes/admin/projects/**`, `src/routes/admin/images/**`.

- [ ] Projects list with reorder (`position`), "Add project" from
      `installedRepo`, tabs Page / Card / SEO / Buttons / Docs.
- [ ] Images library: list, alt text edit, usages.

## Phase 3: MCP

### Task 11: MCP endpoint, tools and connections

**Files:** Create `src/lib/server/mcp.ts`, `src/routes/mcp/+server.ts`,
`src/routes/admin/connections/**`, `tests/mcp.test.ts`; Modify
`.claude/agents/refresh-project-pages.md`.

- [ ] `/mcp` = `requireMcpAuth(auth, handler, { resource })`; handler re-checks
      the email from the token's `sub` against the allowlist, builds a fresh
      `McpServer` with a stateless `WebStandardStreamableHTTPServerTransport`
      (`sessionIdGenerator: undefined`, `enableJsonResponse: true`).
- [ ] Tools as in the spec; `create_post` forces `draft`.
- [ ] Tests call the tool functions directly on a temp database.
- [ ] Agent uses `get_project` / `update_project`.

## Phase 4: GitHub App

### Task 12: App creation

**Files:** Create `src/lib/server/crypto.ts`, `src/lib/server/github/app.ts`,
`src/routes/admin/github/**`, `tests/github-app.test.ts`.

- [ ] `seal`/`open` AES-GCM round-trip test.
- [ ] Manifest form, `state` stored in `verification`, callback exchange,
      install link; `state` mismatch rejected (test).

### Task 13: Webhook and sync

**Files:** Create `src/lib/server/github/webhook.ts`,
`src/lib/server/github/sync.ts`, `src/routes/api/github/webhook/+server.ts`,
`tests/webhook.test.ts`, `tests/sync.test.ts`.

- [ ] Webhook tests: bad signature 401, replay ignored, non-default branch and
      unrelated paths ignored, valid push queues a sync.
- [ ] Sync tests against a fake `fetch`: only changed blobs fetched, deletions
      applied, invalid `config.json` rolls back and records the error,
      concurrent calls collapse.
- [ ] Reconcile timer every 6 h, started from `hooks.server.ts` `init`.

### Task 14: Remove the old pipeline

- [ ] Delete `.github/workflows/docs.yml`, `scripts/docs.ts`, `src/docs/`,
      `src/projects/`, `src/posts/`; update `biome.json` / markdownlint ignores
      and `CLAUDE.md`.
- [ ] Final gates: biome, markdownlint, `check:app`, `bun test`,
      `bun run build`.
