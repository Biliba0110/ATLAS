# ATLAS

ATLAS is a self-hosted IPAM and lightweight infrastructure inventory for home-labs, small teams, and growing internal networks.

`ATLAS — инфраструктура под контролем, без лишней сложности.`

## What ATLAS Does

ATLAS helps keep network state understandable without turning the interface into a heavy enterprise control panel.

Core capabilities today:

- subnet management with `CIDR`, pools, and notes
- named IP range groups inside a subnet
- manual device registry with `name`, `IP`, optional `MAC`, `type`, and notes
- IP availability checks using database records and `ping`
- free IP suggestions
- conflict detection
- search by `IP`, `MAC`, device name, type, subnet, and group
- history of IP-related changes
- live updates in the UI
- import/export via `JSON` and `CSV`
- multi-user access with roles and access groups
- server-side user preferences and group suggestion templates

## Stack

- `Python 3`
- `SQLite`
- `HTML / CSS / Vanilla JavaScript`
- `Server-Sent Events`

## Quick Start

Run:

```bash
python3 server.py
```

Open:

- `http://localhost:4173`
- `http://<server-ip>:4173`

On first clean start, ATLAS creates a bootstrap admin user:

- username: `Admin`
- password: `Atlas`

The password must be changed after the first login.

## Data Storage

ATLAS stores shared state in server-side `SQLite`.

- default database path: `data/atlas.db`
- the database is created automatically
- the repository stays clean without embedded data
- multiple devices can use the same ATLAS instance if they connect to the same server

Stored data includes:

- subnets
- range groups
- devices
- ping scan results
- IP history
- users
- access groups
- sessions
- user preferences

## Access Model

ATLAS currently supports:

- `admin` — full access, users, access groups, server settings
- `editor` — read/write access to allowed data
- `viewer` — read-only access to allowed data

Access groups are used to limit visibility.

- a subnet can be public or bound to an access group
- `admin` sees everything
- non-admin users see public subnets and the restricted subnets assigned to their groups
- devices, groups, scan results, and relevant history follow the same visibility rules

## Ping and Scanning

`ping` in ATLAS is a lightweight occupancy signal, not full discovery.

What it is used for:

- detecting addresses that may already be in use
- helping free IP suggestions avoid obviously active addresses
- giving a quick network-state snapshot

What it is not:

- DHCP / ARP / SNMP replacement
- complete device discovery
- guaranteed proof that an IP is free

Current scan behavior:

- background scanning runs on a configured interval
- only subnets enabled for automation participate in background scanning
- each subnet can be included or excluded from background scans
- new subnets can inherit a default scan policy
- manual scans can be triggered from the UI
- group creation can trigger a scan only for that group range

## Import and Export

Supported formats:

- `JSON` — full state snapshot
- `CSV` — separate exports for subnets, range groups, and devices

`JSON` includes:

- `subnets`
- `groups`
- `devices`
- `scanResults`
- `history`

Import can either:

- merge data into the current state
- replace the current state

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

## Project Structure

- [index.html](/Users/bohdan/Documents/Projects/WEB/IPAM/index.html) — main UI
- [styles.css](/Users/bohdan/Documents/Projects/WEB/IPAM/styles.css) — styles
- [app.js](/Users/bohdan/Documents/Projects/WEB/IPAM/app.js) — client logic
- [server.py](/Users/bohdan/Documents/Projects/WEB/IPAM/server.py) — API, auth, static files, SQLite, scanning
- [group-suggestion-templates.json](/Users/bohdan/Documents/Projects/WEB/IPAM/group-suggestion-templates.json) — bundled group suggestion rules
- [PRODUCT_VISION.md](/Users/bohdan/Documents/Projects/WEB/IPAM/PRODUCT_VISION.md) — product direction and roadmap

## Notes

- ATLAS is designed to stay simple by default and grow by need
- unused complexity should not dominate the interface
- larger capabilities are being prepared as future optional layers, not forced workflow

## License

No license file is defined yet.
