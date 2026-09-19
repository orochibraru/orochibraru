---
name: dokploy-to-pangolin
tag: Networking · Bun + Hono
title:
  "dokploy-to-pangolin: auto-provision Pangolin routes from Dokploy deploys,
  free"
description:
  "A free, open-source webhook bridge that registers new Dokploy applications
  with Pangolin automatically: creates the resource and target so every deploy
  is routed without hand-editing anything."
buttons:
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/dokploy-to-pangolin",
      icon: github,
      primary: true,
    }
  - {
      label: Docker Hub,
      href: "https://hub.docker.com/r/orochibraru/dokploy-to-pangolin",
      icon: docker,
    }
schema:
  applicationCategory: DeveloperApplication
  operatingSystem: Linux, macOS, Docker
---

A webhook service that registers new Dokploy applications with Pangolin
automatically, creating the resource and the target so a fresh deploy is routed
the moment it exists. Stop hand-writing a route for every app.

## What happens

```text
┌──────────┐         ┌─────────────────┐         ┌──────────┐
│ Dokploy  │────────▶│  This service   │────────▶│ Pangolin │
│          │ webhook │                 │   API   │          │
└──────────┘         └─────────────────┘         └──────────┘
```

It receives the build notification from Dokploy, checks whether the domain
already exists in Pangolin, creates the resource if it doesn’t, configures a
resource target pointing at your main site, and routing starts working. That’s
the entire job.

## Features

### Automatic resources

New domain deployed, new Pangolin resource created. No console visit.

### Duplicate-safe

Intelligent domain matching, so redeploys don’t pile up duplicate resources.

### Authenticated webhooks

Shared secret token on the incoming hook, validated before anything is created.

### Fast and small

Bun + Hono, full TypeScript, graceful SIGINT/SIGTERM shutdown, 90%+ test
coverage.

### Duplicate cleanup

`bun run reconcile` reports resources sharing a host name and, with `--apply`,
deletes the newer copies and tidies their names. The same report and cleanup are
exposed over the API as `GET`/`DELETE /duplicates`.

## Run it

```bash
docker run -p 3000:3000 \
  -e WEBHOOK_SECRET=your-secret \
  -e PANGOLIN_API_KEY=your-key \
  orochibraru/dokploy-to-pangolin
```

It has to be reachable by Dokploy to receive webhooks. Deploying it _through_
Dokploy and Pangolin works fine; running it separately just means making sure
the configured URL resolves. Full environment reference is in the
[README](https://github.com/orochibraru/dokploy-to-pangolin).
