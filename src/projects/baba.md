---
name: Baba
tag: Monitoring · Single binary
title: "Baba: free homelab server monitoring with Discord and Telegram alerts"
description:
  Baba is a free, open-source homelab monitor. It watches CPU, load, memory,
  disk, temperature and GPU, sends Discord or Telegram alerts, and tells you
  when things recover. Single binary or Docker.
buttons:
  - {
      label: Source on GitHub,
      href: "https://github.com/orochibraru/baba",
      icon: github,
      primary: true,
    }
  - {
      label: Releases,
      href: "https://github.com/orochibraru/baba/releases",
      icon: download,
    }
schema:
  applicationCategory: DeveloperApplication
  operatingSystem: Linux, macOS, Docker
position: 2
category: Monitoring
blurb:
  "The lookout. Watches CPU, load, memory, disk, temps and GPU, then pings
  Discord or Telegram when something breaks, and again when it heals."
chips: ["Single binary", "Discord", "Telegram", "systemd"]
---

Named after the lookout pirate in _Astérix_, always watching the horizon for
trouble. A lightweight homelab monitor that pings you on Discord or Telegram
when something goes wrong, and again when it’s fixed.

## What it watches

CPU usage, system load, memory, disk, CPU and GPU temperature, and GPU
utilisation. When a threshold breaks it opens an incident and tells you; when
the metric comes back it tells you that too. Everything lands in a local SQLite
database so you keep the history.

## Features

### Discord & Telegram

Multiple notifiers supported, use one or both.

### Deduplication

An incident opens only on the Nth consecutive breach. No per-cycle spam at 4am.

### Recovery alerts

You get told when the metric returns to normal, not just when it broke.

### Reminders

Re-alerts on a configurable interval while an incident stays open.

### Incident history

Full history in a local SQLite database. No cloud, no account, no retention
tier.

### Runs as a service

`baba install` registers it with systemd on Linux or launchd on macOS.

## Install

```bash
# Linux / macOS
curl -fsSL https://github.com/orochibraru/baba/releases/latest/download/install.sh | sh

baba setup    # interactive wizard: notifier credentials + thresholds
baba install  # register as a background service
```

Or run it in the foreground with `baba start`, or in Docker with the
[example compose file](https://github.com/orochibraru/baba). Binaries for every
platform are on the releases page.

## Honest status

The version number is past 1.x but it’s still beta. It won’t hurt your system,
but I won’t call it reliable until there’s long-term data to prove it. That
warning is in the README too. I’d rather say it twice than oversell a free tool.
