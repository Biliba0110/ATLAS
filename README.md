# ATLAS

Language versions: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS is a self-hosted IPAM and lightweight network inventory for home-labs, small teams, and growing internal networks.

## What ATLAS does

- manages subnets with `CIDR`, pools, notes, and optional access scopes
- supports named IP range groups inside a subnet
- stores devices with `name`, `IP`, optional `MAC`, `type`, and notes
- suggests free IPs based on the database and optional `ping`
- detects IP conflicts
- keeps IP change history
- supports multi-user access with roles and access groups
- imports and exports data with `JSON`, `CSV`, and full `backup`

## Quick start

Run:

```bash
python3 server.py
```

Open:

- `http://localhost:4173`
- `http://<server-ip>:4173`

Bootstrap account on a clean install:

- username: `Admin`
- password: `Atlas`

The bootstrap password must be changed after the first sign-in.

## How to use

Basic workflow:

1. Add a subnet.
2. Create range groups inside the subnet if needed.
3. Add devices manually.
4. Use search, filters, and history to track usage.
5. Export or back up the instance when needed.

## Users and access

Roles:

- `admin` — full access, users, access groups, server settings
- `editor` — read/write access to allowed data
- `viewer` — read-only access to allowed data

Access groups control visibility:

- a subnet can be public or restricted to an access group
- `admin` sees everything
- non-admin users see public subnets and the subnets assigned to their groups

## Ping and automation

`ping` in ATLAS is an occupancy signal, not full discovery.

Use it for:

- safer free IP suggestions
- quick subnet-level checks
- detecting addresses that may already be in use

Recommended practice:

- enable auto-ping only for subnets reachable from the ATLAS server
- disable it for remote or isolated networks where `ping` is not reliable

## Import, export, and backup

Supported formats:

- `JSON` — ATLAS state snapshot
- `CSV` — separate exports for subnets, range groups, and devices
- `Backup ATLAS` — full backup for restore or migration

Use `Backup ATLAS` when you want to restore a full instance with users, settings, and access model.

## Storage

ATLAS stores shared state in server-side `SQLite`.

- default database path: `data/atlas.db`
- the database is created automatically
- multiple devices can connect to the same ATLAS instance

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

## Project files

- `index.html` — main UI
- `styles.css` — styles
- `app.js` — client logic
- `server.py` — API, auth, static serving, SQLite, scanning
- `group-suggestion-templates.json` — bundled group suggestion rules
