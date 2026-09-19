---
name: Penombre
tag: Storage · MIT
title: "Penombre: a free self-hosted Nextcloud and Google Drive alternative"
description:
  "Penombre is a free, open-source self-hosted drive, and a Nextcloud, Google
  Drive, Seafile and ownCloud alternative. Previews, notes, share links, shared
  drives, Word/Excel/PowerPoint editing, a waveform music player. One Docker
  container, SQLite by default, no subscription."
image: { src: hero, alt: The Penombre drive in grid view }
buttons:
  - {
      label: Read the docs,
      href: /penombre/docs,
      icon: book-open,
      primary: true,
    }
  - { label: Screenshots, href: "#showcase", icon: images }
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/penombre",
      icon: github,
    }
  - {
      label: Docker Hub,
      href: "https://hub.docker.com/r/orochibraru/penombre",
      icon: docker,
    }
schema:
  alternateName: Penombre self-hosted drive
  applicationCategory: BrowserApplication
  applicationSubCategory: File storage and sharing
  operatingSystem: Linux, macOS, Docker
  softwareHelp: https://orochibraru.com/penombre/docs
  license: https://opensource.org/licenses/MIT
  keywords:
    Nextcloud alternative, Google Drive alternative, ownCloud alternative,
    Seafile alternative, iCloud alternative, Dropbox alternative, OneDrive
    alternative, self-hosted cloud storage, open source drive, homelab
  featureList:
    - Grid and list file browsing with generated thumbnails
    - In-place previews for images, video, audio, PDFs and source code
    - Notes on any file, pinned to a moment in a track or video and marked on
      the waveform
    - Waveform music player
    - Documents, spreadsheets and presentations stored as HTML, CSV and Markdown
    - Editing .docx, .xlsx and .pptx files in place, saved back as themselves
    - Share links with password, expiry and sign-in requirements
    - Per-user sharing with view, edit and full-access permissions
    - Shared drives owned by a group, with manager, editor and viewer roles
    - Notifications for notes and shares, with optional emailed copies
    - Automatic categories for images, video, music, documents, code, archives
      and 3D objects
    - Mounted volumes for NAS shares and existing directory trees, shared by
      everyone and kept in sync with background and on-demand rescans
    - Resumable uploads that survive a page reload
    - Soft trash with restore
    - Admin panel with instance statistics, user management, OIDC providers and
      an audit log
    - OpenAPI-documented REST API with API-key auth
    - SQLite by default, PostgreSQL optional
  sameAs: ["https://hub.docker.com/r/orochibraru/penombre"]
---

A self-hosted drive. All the convenience of cloud storage, on hardware you own,
with a bill of exactly zero.

## What it is

Penombre is a file storage and sharing platform for people who want their files
back. Drop it on a box, mount a volume, and you get a modern web drive: uploads
that survive a reload, generated thumbnails, previews that open in place, notes
on any file, share links with an expiry, shared drives for a team, automatic
categories, recoverable soft-trash and OAuth logins, without renting the disk
from anyone.

It runs on **SQLite out of the box**: one container, one volume, no database
server to run alongside it. PostgreSQL stays supported the day you outgrow that.

Your files stay files. Storage is a plain directory tree on disk, not a block
store with a database index, so `ls`, `rsync` and Syncthing all still work on
it.

## Showcase

Every screenshot below comes out of the repo, not a design tool: Playwright
drives a real instance seeded with one file of each supported kind, and the run
fails rather than publishing a screen that stopped rendering. Light or dark
follows your system, because appearance is a per-account setting and both are
the real thing.

![The Penombre drive in grid view, showing generated thumbnails](hero) **The
drive** Grid view, with thumbnails generated at upload time: video frames, PDF
first pages, and waveforms drawn from peak data so they follow your accent
colour.

![A file preview open beside its notes thread](preview) **Previews and notes**
Files open in place. Images, video, PDFs and highlighted source sit beside a
notes thread; on a track or a video a note pins to a moment, and clicking the
timestamp moves the playhead there.

![The Penombre music player with a waveform progress bar](music) **Music** Audio
plays in a persistent bottom player whose progress bar is the waveform itself,
filling with the accent colour as the track runs. Click anywhere on it to seek.

![The images category view](categories) **Categories** Files sort themselves as
they land: images, video, music, documents, code, archives and 3D objects, with
no tagging to do.

![Appearance settings, showing typeface, corner and accent options](settings-appearance)
**Appearance** Three attributes on `<html>` — typeface, corners and accent —
re-theme the whole app, including the aurora behind it.

![The Penombre admin dashboard](admin) **Administration** Instance statistics,
per-user storage, user management, and an audit log that deliberately records no
file names.

Recent, shared, trash and the rest are in the
[full showcase](/penombre/docs/showcase), all of it generated the same way.

## Features

### Modern web UI

SvelteKit 5, TailwindCSS 4 and shadcn-svelte. Responsive, fast,
keyboard-friendly.

### Previews in place

Images, video, audio, PDFs and syntax-highlighted source open in a dialog, not a
download prompt.

### Notes on any file

A thread beside the preview. On a track or a video a note pins to a timestamp,
and every timestamp is drawn on the waveform as a dot you can hover to read and
click to jump to — in the player, the preview and the full-screen viewer alike.

### A real music player

Persistent bottom player, waveform-as-progress-bar drawn from cached peak data,
keeps playing while you browse.

### Full screen, properly

An image, a video or a track opens in Penombre’s own viewer rather than the
browser’s bare built-in player: name, size, download, real transport controls
and the notes thread beside it. A track has no picture to fill a screen with, so
it gets a now-playing panel with the waveform where the artwork would have been.

### Documents, sheets and decks

Write them in the browser, stored as plain `.html`, `.csv` and `.md`. No
proprietary container, no export step, and slides get a present mode.

### Word, Excel and PowerPoint

A `.docx`, `.xlsx` or `.pptx` opens in the same three editors and saves back as
itself — same file, same place, no import and no export. Only the part you
edited is rewritten: untouched cells keep their formulas and formatting, slides
keep their layouts and theme.

### Sharing, two ways

Public links with optional password, expiry and sign-in requirement, or per-user
grants at view, edit or full access.

### Shared drives

A drive that belongs to a group instead of a person: one tree, one trash,
manager / editor / viewer roles. Files belong to the drive rather than to
whoever happened to upload them, so a project folder survives the person who
started it.

### Notifications

A bell for the things other people did — a note on your file, something shared
with you — and nothing you did yourself. Opt in per account to have them emailed
too, once an admin has configured SMTP.

### Smart categories

Images, video, music, documents, code, archives and 3D objects sort themselves
as files land.

### Uploads that survive a reload

Transfers run in a Web Worker with the queue in IndexedDB, so a multi-gigabyte
video keeps going and picks itself back up.

### Mounted volumes

Point `VOLUME_*_PATH` at a NAS share or an existing tree and it appears in the
sidebar as one library everyone browses, optionally read-only. A background pass
keeps it in sync with what’s actually on disk, and a Rescan button in its header
forces one on demand.

### Soft trash

Deletion is recoverable, because everyone deletes the wrong folder eventually.

### Yours to look at

Typeface, corner radius and accent colour are per-account settings that re-theme
the entire app, light or dark.

### Admin panel

Instance and per-user storage, invites, roles, bans, sign-up and security
policy, OIDC providers added without touching the environment, and an audit log
that records no file names.

### Real auth

Better Auth: session cookies, OAuth providers, passkeys, two-factor, and API
keys for scripts.

### REST API

OpenAPI-documented `/api/v1` endpoints with API-key auth, generated from Zod
contracts.

### Simple mode

Run it as a bare shared file browser: mount a volume, share the login, browse
together.

### One container, no database server

SQLite with Drizzle by default off the published `orochibraru/penombre` image.
Point `DATABASE_URL` at Postgres if you’d rather.

## An alternative to what, exactly {#alternatives}

Nobody wakes up wanting a self-hosted drive. They want out of something
specific. So here is where Penombre actually sits, including where it loses.

### Nextcloud alternative

Nextcloud is a groupware suite that also stores files: PHP, a database server,
an app store, calendars, chat, and a cron job you will eventually debug.
Penombre is the drive and nothing else, in one container. If you want the
calendar and the chat, keep Nextcloud.

### Seafile & ownCloud alternative

Seafile’s block storage is fast, but your files stop being files: the tree on
disk is chunks and a database. Penombre keeps a plain directory under
`STORAGE_PATH`, so a backup is `rsync` and an escape hatch is `cp -r`.

### Google Drive alternative

The same shape — grid, previews, share links, documents, sheets and slides — on
a disk you own, with nothing reading your files to improve anything. Google Docs
is more capable than Penombre’s editors; Google is also not going to hand you
the directory.

### Dropbox alternative

Dropbox is sync first. Penombre has no sync client and isn’t growing one: point
[Syncthing](/penombre/docs/storage) at the same directory the container mounts
and you get the same result, free, with a web drive on top.

### iCloud Drive alternative

iCloud stops at the edge of the Apple fence and bills monthly for the privilege.
Penombre runs on the box in your closet, opens in any browser on any OS, and
costs the price of the disk you already bought.

### OneDrive, Box & pCloud alternative

Per-seat pricing, quota upsells, and an account that can be suspended with your
files inside it. Here the quota is the filesystem and the only way to lose
access is to unplug the machine yourself.

### File Browser & Filestash alternative

Both are excellent thin browsers over a directory. Penombre does that too — it’s
called [simple mode](/penombre/docs/simple-mode) — and adds accounts, sharing,
notes, thumbnails and an admin panel when you want them.

### Synology Drive & FileRun alternative

One wants you to buy the NAS, the other wants a licence key. Penombre is MIT,
runs on whatever Linux box you have, and will happily mount the NAS share you
already own as a [volume](/penombre/docs/volumes).

Since we’re being honest about search: people get here looking for a _Nextcloud
alternative_, _Google Drive alternative_, _ownCloud alternative_, _Seafile
alternative_, _iCloud alternative_, _Dropbox alternative_, _OneDrive
alternative_, _Box alternative_, _pCloud alternative_, _MEGA alternative_,
_Proton Drive alternative_, _Synology Drive alternative_, _FileRun alternative_,
_Filestash alternative_ or a _File Browser alternative_. That is the list. It is
a self-hosted drive, and it is free.

## Run it

### Docker run

```bash
docker run -d --name penombre \
  -p 3000:3000 \
  -v penombre_data:/data \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -e ORIGIN=https://drive.example.com \
  orochibraru/penombre:latest
```

### Docker Compose

```yaml
services:
  penombre:
    image: orochibraru/penombre:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    volumes:
      - penombre_data:/data
    environment:
      AUTH_SECRET: a-long-random-string
      ORIGIN: https://drive.example.com

volumes:
  penombre_data:
```

Either way it comes up on `http://localhost:3000`. One volume holds the lot: the
SQLite database under `/data/db`, your files under `/data/storage`. Those two
variables are the only ones required on a first run — a setup screen creates the
administrator account the first time anyone opens it, so no default password
ever ships in an env file.

The [getting started guide](/penombre/docs/getting-started) walks through it
properly, and [the env reference](/penombre/docs/env) covers everything else:
OAuth providers, SMTP, Redis, Postgres, mounted volumes, simple mode.

## How it’s built

- **Frontend**: SvelteKit with Svelte 5, TailwindCSS 4, shadcn-svelte
- **Backend**: SvelteKit `+server.ts` routes with Zod-validated contracts that
  also emit the OpenAPI spec
- **Database**: SQLite with Drizzle ORM, PostgreSQL optional, chosen from the
  `DATABASE_URL` scheme
- **Storage**: plain local filesystem, so your files stay files
- **Auth**: Better Auth
- **Screenshots**: Playwright, run against a seeded instance, published straight
  to the docs

MIT licensed. Free, and staying that way. [Here’s why](/#free).
