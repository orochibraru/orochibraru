# [orochibraru.com](https://orochibraru.com/)

One SvelteKit app, compiled to a single binary with
[svelte-smol](https://github.com/orochibraru/svelte-smol). Posts, project pages
and project docs live in SQLite under `DATA_DIR`; an admin area behind SSO edits
them, an MCP server lets Claude write posts, and a GitHub App keeps each
project's docs in sync on push.

## Run it

```sh
docker build -t orochibraru-site .
docker run -p 3000:3000 -v site-data:/data \
  -e ORIGIN=https://orochibraru.com \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -e OIDC_ISSUER=https://id.example.com \
  -e OIDC_CLIENT_ID=… -e OIDC_CLIENT_SECRET=… \
  -e ADMIN_EMAILS=me@example.com \
  orochibraru-site
```

| Variable             | Required | What it does                                                           |
| -------------------- | -------- | ---------------------------------------------------------------------- |
| `ORIGIN`             | yes      | The public URL. Links, OAuth and the MCP resource are built from it.   |
| `AUTH_SECRET`        | yes      | Signs sessions and seals stored secrets. **Never change it**, below.   |
| `DATA_DIR`           | no       | `site.db` and `images/`. `/data` in the image.                         |
| `OIDC_ISSUER`        | no       | Your IdP. Unset, the site runs with no admin area and no MCP server.   |
| `OIDC_CLIENT_ID`     | with SSO | The client registered at the IdP.                                      |
| `OIDC_CLIENT_SECRET` | with SSO |                                                                        |
| `ADMIN_EMAILS`       | with SSO | Comma-separated. Checked on every request, so removing one is instant. |

Register `ORIGIN/api/auth/callback/sso` as the redirect URI at the IdP.

**`AUTH_SECRET` is forever.** Sessions, the OAuth signing keys Claude's tokens
are checked against, and the GitHub App's private key are all sealed with it.
Change it and the admin area and MCP fail until the `jwks` table is cleared and
the GitHub App is created again.

**First boot.** A new volume starts from the content the image was built with
(`bun run import` runs during `docker build`). After that the volume is the
source of truth: rebuilding the image never overwrites it. Back up `/data`.

## After deploying

1. Sign in at `/admin`.
2. **GitHub**: create the app (one click; GitHub asks you to confirm), install
   it on the project repos. Every push that touches `docs/`, `README.md` or
   `CONTRIBUTING.md` resyncs that project; a check every six hours catches
   missed webhooks.
3. **Claude**: add `ORIGIN/mcp` as a custom connector in claude.ai or the
   desktop app, or `claude mcp add --transport http orochibraru ORIGIN/mcp`.
   Claude signs in through the same SSO. Connected apps are listed, and
   revocable, under **Connections**.

## Develop

```sh
bun install
bun run import                 # today's content into ./data, once
bun run dev
bun test                       # unit tests, each on a throwaway database
bun run audit                  # Lighthouse over every page in the sitemap
```

Without the OIDC variables the admin area is off; point them at any OIDC
provider (Pocket ID works well locally) to use it.
