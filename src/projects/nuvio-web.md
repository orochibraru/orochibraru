---
name: Nuvio Web
tag: Media · AGPL-3.0-or-later
title:
  "Nuvio Web: a free unofficial Nuvio web client with casting and subtitles"
description:
  "Nuvio Web is a free, open-source unofficial web client for Nuvio: your
  profiles, addons, library and watch progress in the browser, with HLS
  playback, subtitles, skip intro and cast to TV."
buttons:
  - {
      label: Read the docs,
      href: /nuvio-web/docs,
      icon: book-open,
      primary: true,
    }
  - {
      label: Try the hosted instance,
      href: "https://nuvio.orochibraru.com",
      icon: globe,
    }
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/nuvio-web",
      icon: github,
    }
  - {
      label: Docker Hub,
      href: "https://hub.docker.com/r/orochibraru/nuvio-web",
      icon: docker,
    }
schema:
  applicationCategory: DeveloperApplication
  operatingSystem: Linux, macOS, Docker
  license: https://www.gnu.org/licenses/agpl-3.0.html
position: 3
category: Media
blurb:
  "An unofficial web client for Nuvio. Your profiles, addons, library and watch
  progress in a browser, with a player that streams, casts, or hands off."
chips: ["Web player", "HLS", "Cast", "AGPL-3.0-or-later"]
---

An unofficial web implementation of the [Nuvio](https://nuvio.tv/) API, because
there isn’t one yet. Sign in with your Nuvio account and get your profiles,
addons, library and watch progress in a browser tab.

## Disclaimer, up front

Nuvio Web hosts no media. Every catalog, all metadata, streams and subtitles
come from **addons you install and are responsible for** (the Stremio addon
protocol). The app is a shell around whatever those addons return; it does not
endorse, index or verify any of them. Use only addons you have the right to use
where you live. Not affiliated with or endorsed by Nuvio.

## Browse

### Home

A rotating hero spotlight, continue watching, your library, and a row per
catalog your addons expose.

### Discover

The full catalog browser: any catalog from any installed addon, filtered by
genre, paginated.

### Search

Fans out across every addon that serves a search catalog, and remembers recent
queries.

### Detail pages

Synopsis, cast, IMDb rating, trailer, season and episode carousel, and a
JustWatch “where to watch” row for your region.

### Command palette

`⌘K` from anywhere to jump to a screen or start a search.

## Watch

### Source picker

Quality, codec, size and release details parsed out of each addon’s stream
label, with an auto-pick that honours your preferred resolution.

### HLS & direct playback

`hls.js` for `.m3u8`, the element’s own `src` for everything else, with
audio-track switching on either.

### Subtitles

SRT converted to WebVTT in the browser, so a subtitle file never touches the
server. Size, colour, background plate, preferred language.

### Skip intro / outro

Via TheIntroDB. The keyless public tier works out of the box; add your own key
to raise the limits.

### Cast to a TV

No third-party SDK: the standard Remote Playback API for Chromecast, falling
back to WebKit’s AirPlay hooks in Safari.

### Auto-play next

Rolls into the next episode with an end-of-episode panel.

### Hand off to another app

An Intent chooser on Android, VLC’s x-callback on iOS, the raw `magnet:` link
for a P2P source, or copy to clipboard on desktop.

### Playback diagnostics

The codec is probed before a stream reaches the player. One that decodes no
video (unsupported HEVC/AV1) or no audio (Dolby Digital, DTS, Atmos) raises a
dismissible banner instead of a black screen.

## Library & sync

### Library

Your library, continue watching, and history, kept per profile.

### Collections

Your own folders of titles, separate from the library.

### Offline-first sync

An IndexedDB mirror with an optimistic write queue and a background delta pull,
so a bookmark or a progress save lands instantly and reconciles later. Open tabs
stay in step over `BroadcastChannel`.

### Watch stats

A full, editable history under Account.

## Make it yours

### Profiles

With avatars, as on mobile.

### Themes

Light, dark or system, a dim or AMOLED dark style, and seven accent colours.

### Settings

Appearance, playback, sync, addons and integrations, stored on your Nuvio
account so they follow you between devices.

### Accessible by default

Every route is checked against WCAG 2 A/AA in CI (axe), including skip links and
focus management.

## Run it

### Docker run

```bash
docker run -p 3000:3000 -e ORIGIN=http://localhost:3000 \
  orochibraru/nuvio-web:latest
```

### Docker Compose

```yaml
services:
  nuvio:
    image: orochibraru/nuvio-web:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      # the URL you actually browse to
      ORIGIN: http://localhost:3000
    healthcheck:
      test: ["CMD", "/app/dist/healthcheck"]
      interval: 30s
      timeout: 30s
      retries: 3
      start_period: 5s
```

Then open `http://localhost:3000`, sign in with your Nuvio account, pick a
profile, and add an addon from Settings if the account has none yet.

**No database and no volume.** Every piece of state, the account, profiles,
addons, library and settings, lives on your Nuvio account, so the container is
disposable. `/app/dist/healthcheck` is a self-contained binary suitable for
`HEALTHCHECK` and for orchestrator probes. Images are published for
`linux/amd64` and `linux/arm64`.

An optional admin page lists who has signed in and can lock sign-in to an
allowlist. Set `NUVIO_ADMIN_EMAILS` to turn it on, and mount a volume at
`/app/data` if you want its sign-in metrics and lock state to survive a restart
— without a writable volume it just runs without them.

Behind a reverse proxy, set `PROTOCOL_HEADER=x-forwarded-proto` and
`HOST_HEADER=x-forwarded-host` so it knows the URL the browser actually used.
Serving over HTTPS on the default port needs neither. Putting it on the public
internet is on you: HTTPS and whatever access control you would give any other
self-hosted app.
