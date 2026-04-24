# ATLAS

Language versions: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS is a self-hosted IPAM and lightweight infrastructure inventory for home-labs, small teams, and growing internal networks.

`ATLAS — infrastructure under control, without unnecessary complexity.`

## Features

- subnet management with `CIDR`, pools, notes, and optional access scopes
- named IP range groups inside a subnet
- manual device registry with `name`, `IP`, optional `MAC`, `type`, and notes
- free IP suggestions based on database records and `ping`
- IP conflict detection
- history of IP-related changes
- live UI updates
- import/export with `JSON` and `CSV`
- multi-user access with roles and access groups
- server-side user preferences and group suggestion templates

## Stack

- `Python 3`
- `SQLite`
- `HTML / CSS / Vanilla JavaScript`
- `Server-Sent Events`

## Quick Start

```bash
python3 server.py
```

Open:

- `http://localhost:4173`
- `http://<server-ip>:4173`

First clean start bootstrap account:

- username: `Admin`
- password: `Atlas`

The bootstrap password must be changed after the first sign-in.

## Storage

ATLAS stores shared state in server-side `SQLite`.

- default database path: `data/atlas.db`
- the database is created automatically
- multiple devices can connect to the same ATLAS instance

Stored data includes subnets, range groups, devices, scan results, history, users, sessions, access groups, and user preferences.

## Access Model

- `admin` — full access, users, access groups, server settings
- `editor` — read/write access to allowed data
- `viewer` — read-only access to allowed data

Access groups control visibility:

- a subnet can be public or restricted to an access group
- `admin` sees everything
- non-admin users see public subnets and the subnets assigned to their groups

## Ping and Scanning

`ping` in ATLAS is a lightweight occupancy signal, not full discovery.

It is used for:

- spotting addresses that may already be in use
- making IP suggestions safer
- quick subnet-level checks

It is not a replacement for DHCP, ARP, SNMP, or full asset discovery.

Current behavior:

- background scanning runs on a configured interval
- only subnets enabled for automation are scanned in the background
- new subnets can inherit the default automation policy
- subnet checks can be triggered directly from the registry
- group creation can trigger a targeted range scan

## Import and Export

Supported formats:

- `JSON` — full state snapshot
- `CSV` — separate exports for subnets, range groups, and devices

Import can merge data into the current state or replace it.

## Configuration

Environment variables:

- `ATLAS_HOST` — bind address, default `0.0.0.0`
- `ATLAS_PORT` — port, default `4173`
- `ATLAS_DB_PATH` — database path, default `data/atlas.db`
- `ATLAS_SCAN_INTERVAL` — background scan interval in seconds, default `90`
- `ATLAS_SCAN_TIMEOUT_MS` — timeout for a single ping, default `1000`
- `ATLAS_SCAN_CONCURRENCY` — parallel ping workers, default `32`
- `ATLAS_HISTORY_LIMIT` — history entries returned to the UI, default `200`

Example:

```bash
ATLAS_PORT=4180 python3 server.py
```

## Project Files

- `index.html` — main UI
- `styles.css` — styles
- `app.js` — client logic
- `server.py` — API, auth, static serving, SQLite, scanning
- `group-suggestion-templates.json` — bundled group suggestion rules
- `PRODUCT_VISION.md` — product direction and roadmap

## Product Direction

ATLAS is designed to stay simple by default and grow only when needed.

The long-term product vision is documented in [PRODUCT_VISION.md](PRODUCT_VISION.md).
