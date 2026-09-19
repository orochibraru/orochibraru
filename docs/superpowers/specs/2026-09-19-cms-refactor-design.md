# CMS refactor: orochibraru.com as one server app

Status: approved design, not yet planned. Date: 2026-09-19.

## Why

The site is a static SvelteKit build served by nginx. Blog posts and project
pages are Markdown files in the repo, project docs are vendored by a daily
GitHub Action, and the project list is hard-coded. Every edit needs a commit and
a deploy.

After this refactor:

- posts and project pages are edited in a WYSIWYG editor in an admin UI;
- posts can be created and edited from Claude (claude.ai, the desktop app and
  Claude Code) over MCP;
- a GitHub App created from the admin UI keeps project docs in sync on push;
- adding a project is a few clicks, not a code change.

## Decisions

| Question            | Decision                                                           |
| ------------------- | ------------------------------------------------------------------ |
| Shape               | One SvelteKit app, built with `@orochibraru/svelte-smol`           |
| Database            | SQLite (`bun:sqlite`) through Drizzle                              |
| Stored content      | Markdown, in the conventions the renderer already understands      |
| Admin login         | Generic OIDC via env vars, email allowlist                         |
| Auth library        | better-auth 1.7: `genericOAuth`, `jwt`, `@better-auth/mcp`, `cimd` |
| MCP clients         | claude.ai and the desktop app (OAuth), Claude Code too             |
| Project list        | In the database, managed from the admin UI                         |
| Docs sync           | GitHub App webhook, no GitHub Action                               |
| Rendering           | On request from SQLite, in-memory cache cleared on every write     |
| Prerendered         | `/about`, `/privacy` and the 404 page only                         |
| Editor              | Milkdown Crepe                                                     |
| Admin UI components | shadcn-svelte, on the site's Tailwind tokens, admin routes only    |
| Compression         | Left to the reverse proxy (Traefik `compress`), not done in-app    |

Out of scope: revision history, scheduled publishing, roles beyond the
allowlist, multiple app instances. Starters (a docs section plus a Claude skill
per starter) are deferred until the admin UI has been reviewed.

## Configuration

| Variable             | Required | Purpose                                              |
| -------------------- | -------- | ---------------------------------------------------- |
| `ORIGIN`             | yes      | Public URL; better-auth's only trusted origin        |
| `AUTH_SECRET`        | yes      | Session signing; derives the key for stored secrets  |
| `DATA_DIR`           | no       | Default `/data`: holds `site.db` and `images/`       |
| `OIDC_ISSUER`        | no       | Provider discovery URL; unset disables admin and MCP |
| `OIDC_CLIENT_ID`     | with SSO | OIDC client                                          |
| `OIDC_CLIENT_SECRET` | with SSO | OIDC client                                          |
| `ADMIN_EMAILS`       | with SSO | Comma-separated allowlist                            |

Without `OIDC_ISSUER` the public site runs normally; `/admin/**`, `/mcp`,
`/api/github/**` and the OAuth endpoints return 404, and startup logs why.

## Data model and storage

Everything lives under `DATA_DIR`: `site.db` (WAL mode) and `images/`.
Migrations run at startup.

- **better-auth tables**: users, sessions, accounts, verifications, plus the
  OAuth client, token and consent tables its MCP plugin needs. Admin status is
  never stored: it is `ADMIN_EMAILS`, checked on every request.
- **`project`**, one row per repo:
  - `repo` (primary key, the URL segment), `name`, `tag`, `title`,
    `description`, `image` (`{ src, alt }`), `buttons` (JSON), `schema` (JSON:
    extra `SoftwareApplication` fields);
  - home card: `category`, `blurb`, `chips` (JSON), `position`;
  - `body`: the page as Markdown (lede, then `##` sections);
  - GitHub: `github_repo` (`owner/name`), `default_branch`, `docs_config` (JSON,
    the synced `docs/config.json`), `docs_synced_sha`;
  - `published`, `updated_at`.
- **`post`**: `id`, `slug` (unique), `title`, `date`, `description`, `body`
  (Markdown), `status` (`draft` | `published`), `updated_at`.
- **`guide`**: `project`, `slug`, `markdown` (verbatim upstream), `source_path`,
  `sha`. Unique on (`project`, `slug`). Link, image and anchor rewriting stays
  in the renderer, as in today's `guides.ts`.
- **`image`**: `id`, `sha256`, `width`, `height`, `alt`, `source` (`upload` |
  `sync`), `project` and `name` (for repo screenshots; unique per project),
  `source_sha` (the upstream blob, for sync diffing). Files are
  `images/<sha256>.webp`, served at `/images/<sha256>.webp` with
  `Cache-Control: public, max-age=31536000, immutable`. Identical bytes are
  stored once.
- **`github_app`**, a single row: app id, slug, client id, and the client
  secret, private key and webhook secret encrypted with AES-GCM under a key
  derived from `AUTH_SECRET`; plus `installation_id`.
- **`installed_repo`**: repos the installation grants, from `installation` and
  `installation_repositories` events. The source of "Add project".
- **`sync_run`**: `repo`, `sha`, `status` (`ok` | `failed` | `skipped`),
  `error`, `changed` (count), `started_at`, `finished_at`.
- **`webhook_delivery`**: `X-GitHub-Delivery` ids seen in the last 7 days, for
  replay protection.

Every image, uploaded or synced, is re-encoded with
`cwebp -q 80 -resize 1200 0`, as `scripts/docs.ts` does today.

### Image references in Markdown

- `![alt](name)` inside a project page is a repo screenshot: `name` and
  `name-dark` resolve in that project's images, as today.
- Uploaded images are inserted as `![alt](/images/<sha256>.webp)`: plain
  Markdown that renders anywhere.
- Guides keep upstream's paths (`images/hero.png`); the renderer maps them to
  the project's synced images, as `guides.ts` does now.

## Auth

- **Admin login**: better-auth's generic OAuth plugin with one provider,
  configured from `OIDC_ISSUER`'s discovery document. Email and password sign-in
  are disabled.
- **Allowlist**: a better-auth database hook refuses to create a user whose
  email is not in `ADMIN_EMAILS`. A `hooks.server.ts` guard on `/admin/**`
  re-checks the list per request, so removing an address revokes access
  immediately. No session redirects to `/admin/login`, a single "Sign in with
  SSO" button.
- **MCP**: `/mcp` without a valid token answers 401 with a `WWW-Authenticate`
  header pointing at the protected-resource metadata. Claude registers itself
  (dynamic client registration), sends the user to the authorize endpoint, which
  requires an admin session (the same SSO), shows a consent screen and issues a
  token. `/mcp` validates the token and re-checks the allowlist on every call.
- **Revocation**: `/admin/connections` lists OAuth clients and tokens, each
  revocable.
- **Hardening**: SvelteKit's origin check on form actions; better-auth trusts
  only `ORIGIN`; session cookies are `HttpOnly`, `Secure`, `SameSite=Lax`.

The MCP side is `@better-auth/mcp` (the OAuth 2.1 provider configured for MCP,
with `requireMcpAuth` guarding `/mcp`) plus `@better-auth/cimd` for Client ID
Metadata Documents; dynamic client registration stays enabled for clients that
do not support CIMD yet.

## Admin UI

| Route                    | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `/admin`                 | Recent posts, projects, last sync runs and their errors           |
| `/admin/posts`           | List, filter by status, new post                                  |
| `/admin/posts/[id]`      | Editor; sidebar: title, slug, date, description, draft/published  |
| `/admin/projects`        | List, drag to reorder, "Add project" from `installed_repo`        |
| `/admin/projects/[repo]` | Tabs: Page (editor), Card, SEO (incl. schema JSON), Buttons, Docs |
| `/admin/images`          | Library: upload, edit alt text, see where each image is used      |
| `/admin/github`          | Create the app, install it, list granted repos                    |
| `/admin/connections`     | MCP clients and tokens                                            |

- **Editor**: Milkdown Crepe, loading and saving Markdown directly. Its slash
  menu gets two entries that insert the project-page conventions: "Feature tile"
  (`###` plus one paragraph) and "Screenshot" (an image, then a `**Title**`
  caption line). No custom node types: both are plain Markdown.
- **Preview**: a toggle renders the draft through the public renderer, so tiles,
  screenshots and highlighted code look exactly as published.
- **Images**: paste or drop in the editor uploads, re-encodes and inserts the
  `/images/<sha256>.webp` Markdown.
- **Saving**: form actions validate with zod (the front-matter schema from
  `project-pages.ts`, extended with the card fields), write the row, clear the
  render cache.
- **Styling**: the site's Tailwind tokens; shadcn-svelte for forms, dialogs and
  tables, imported only under `/admin`.

## GitHub App and docs sync

### Creating and installing the app

1. `/admin/github` posts a manifest to GitHub:
   - `hook_attributes.url`: `ORIGIN/api/github/webhook`;
   - `redirect_url`: `ORIGIN/admin/github/callback`;
   - `public: false`;
   - permissions `contents: read`, `metadata: read`;
   - events `push`, `installation`, `installation_repositories`;
   - a one-time `state`, stored server-side and checked on return.
2. The callback exchanges the code (`POST /app-manifests/{code}/conversions`)
   and stores the app credentials, encrypted.
3. An "Install" button opens `github.com/apps/<slug>/installations/new`.
   Installation events fill `installed_repo`.

The app's one webhook receives pushes from every repo it is installed on. No
per-repo webhooks are created and the app needs no write access.

### Webhook

- Verify `X-Hub-Signature-256` (HMAC-SHA256, constant-time compare); reject
  otherwise.
- Drop a delivery id already in `webhook_delivery`.
- Answer 202 immediately; queue the work.
- Act only on pushes to the project's default branch that touch `docs/**`,
  `README.md` or `CONTRIBUTING.md`, for repos that are projects.

### Sync, per repo

A repo syncs at most one at a time; pushes arriving mid-sync collapse into one
follow-up run.

1. Sign an app JWT (RS256) with the private key; exchange it for an installation
   token.
2. Read the tree at the pushed commit (`git/trees/<sha>?recursive=1`), selecting
   what `scripts/docs.ts` selects today: `docs/*.md` except `docs/README.md`,
   the root guides, `docs/images/*`, `docs/config.json`.
3. Compare blob shas with `guide.sha` and `image.source_sha`; fetch only changed
   blobs.
4. Re-encode images; validate `config.json` with the existing `DocsConfig` zod
   schema.
5. Write guides, images and config, and delete what upstream removed, in **one
   transaction**. Any error rolls back, records `sync_run.error`, and leaves the
   previous docs live.
6. Set `docs_synced_sha`; clear the render cache.

**Missed deliveries**: a timer every 6 hours compares each project's default
branch head with `docs_synced_sha` and syncs the ones that moved. Each project
also has a manual Resync. This replaces `.github/workflows/docs.yml` as the
safety net.

## MCP server

Streamable HTTP at `/mcp`, stateless, using the MCP SDK's web-standard transport
inside a SvelteKit `+server.ts`.

| Tool             | Behaviour                                                        |
| ---------------- | ---------------------------------------------------------------- |
| `list_posts`     | Slug, title, date, status; optional status filter                |
| `get_post`       | Full post, Markdown body                                         |
| `create_post`    | Title, description, body, optional slug and date; always a draft |
| `update_post`    | Any field but status                                             |
| `publish_post`   | Sets `published`                                                 |
| `unpublish_post` | Sets `draft`                                                     |
| `upload_image`   | From a URL or base64, with alt; returns the Markdown snippet     |
| `list_projects`  | Repo, name, category, published                                  |
| `get_project`    | Every field, Markdown body                                       |
| `update_project` | Page and card fields; validated like the admin form              |

No delete over MCP: deletion is admin-only. The project tools exist so the
`refresh-project-pages` agent keeps working once pages leave the repo; that
agent is rewritten to use them.

## Public rendering

- One data module (`$lib/server/content`) is the only reader of the database for
  public routes.
- Rendered HTML (Shiki dominates the cost) is cached in memory by content key
  and cleared on any write or sync.
- Routes: `/` (cards from `project`), `/[repo]` (project pages, the current
  `[repo=repository]` route reading the database), `/[repo]/docs/**`, `/blog`,
  `/blog/[slug]`, all rendered on request. The `repository` and `project` param
  matchers are replaced by lookups that 404.
- Markdown twins: posts, project pages and guides serve the stored Markdown with
  links and images made absolute. The HTML-to-Markdown converter in
  `markdown.ts` remains only for the hand-written pages.
- `llms.txt`, `llms-full.txt`, `sitemap.xml`, `search.json` and `feed.xml` are
  generated from the database per request, through the same cache.
- Drafts and unpublished projects are invisible to every public route.

## Deployment

- Multi-stage Dockerfile: build with Bun and svelte-smol; the runtime image
  carries the binary, `cwebp` and a `/data` volume, with svelte-smol's
  healthcheck binary as `HEALTHCHECK`.
- `nginx.conf` is deleted. `hooks.server.ts` takes over what it did:
  - canonical relative 301s: `/index`, `/index.html`, `*.html`, trailing slash;
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
    `Referrer-Policy: strict-origin-when-cross-origin`;
  - `charset=utf-8` on Markdown, text, XML and feed responses, with
    `text/markdown` and `application/rss+xml` types;
  - immutable caching for `/_app/immutable/*` and `/images/*`.
- Removed after migration: `.github/workflows/docs.yml`, `scripts/docs.ts`,
  `src/docs/`, `src/projects/`, `src/posts/`, `nginx.conf`.

## Migration

A one-off `bun run import` reads `src/projects/*.md` (front matter and body),
`src/posts/*.md`, `src/docs/**` (guides, `config.json`, images) and the
home-page cards in `src/routes/+page.svelte` (category, blurb, chips, order),
and writes them into an empty database. It refuses to run against a database
that already has content.

Acceptance: every public URL of today's build returns the same head tags and
structured data, and the same heading positions and tile, screenshot and code
block counts, as it does before the refactor, the comparison used when project
pages moved to Markdown.

## Testing

`bun test`, each test on a fresh temporary SQLite database:

- renderer: tiles, screenshots, sections, `{#id}` anchors, lede;
- webhook: valid signature, bad signature, replayed delivery, non-default
  branch, unrelated paths;
- manifest callback: `state` mismatch rejected;
- sync: only changed blobs fetched; deletions applied; a failing image or
  invalid `config.json` rolls back and records the error; concurrent pushes
  collapse into one run;
- auth guard: no session, session outside the allowlist, address removed
  mid-session;
- MCP: each tool, including that `create_post` always yields a draft and that a
  token for a removed address is refused;
- import: the acceptance comparison above.

All existing gates still apply: `bunx biome check .` prints nothing,
markdownlint, `check:app`, `bun run build`.

## Build order

Four sub-projects, each with its own plan, in this order:

1. **Server foundation**: svelte-smol, Drizzle and SQLite, `hooks.server.ts`
   (nginx duties), better-auth with OIDC and the allowlist, the image store, the
   Dockerfile. Content still read from files.
2. **Content in the database**: schema, import, public routes reading the
   database, render cache, admin UI and editor for posts and projects.
3. **MCP server**: OAuth provider plugin, `/mcp` and its tools, connections
   page, `refresh-project-pages` rewritten.
4. **GitHub App sync**: manifest flow, webhook, sync, 6-hourly reconcile; then
   delete `docs.yml`, `scripts/docs.ts` and `src/docs/`.
