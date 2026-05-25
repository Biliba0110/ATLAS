# ATLAS

Language versions: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS is a self-hosted IPAM, network registry, and lightweight discovery console for home labs, small teams, and internal infrastructure.

It is intentionally simple to run: one Python server, one SQLite database, a browser UI, and optional push agents for dynamic inventory.

## What ATLAS Includes

- subnet management with `CIDR`, notes, ranges, and optional access scopes
- named IP range groups inside subnets
- devices and services with IP, MAC, ports, URLs, types, notes, and history
- Network Map topology from IPAM and discovery data
- free IP suggestions based on stored inventory and optional `ping`
- IP conflict detection
- multi-user access with `admin`, `editor`, and `viewer` roles
- access groups for restricting subnet visibility
- import, export, and full-instance backup
- optional push-agent discovery for hosts, Docker, Kubernetes, and Proxmox
- discovery preview, registry matching, debug inspection, and create-on-discovery policies

## Quick Start

Run the server:

```bash
python3 server.py
```

Open:

- `http://localhost:4173`
- `http://<server-ip>:4173`

On a clean database ATLAS creates a bootstrap account:

- username: `Admin`
- password: `Atlas`

Change that password after the first sign-in.

## Typical Workflow

1. Add subnets.
2. Add range groups if a subnet has meaningful zones such as DHCP, servers, VPN, lab, or IoT.
3. Add devices and services manually, or enable discovery agents.
4. Use search, filters, registry details, and history to understand what changed.
5. Export CSV/JSON for reports, or create a full backup before migrations.

## Users And Access

Roles:

- `admin`: full access, users, access groups, settings, import/export, discovery policy
- `editor`: read/write access to allowed inventory
- `viewer`: read-only access to allowed inventory

Access groups control visibility:

- public subnets are visible to all signed-in users
- restricted subnets are visible only to assigned groups
- admins always see everything

## Ping Is Not Discovery

ATLAS can use `ping` as an occupancy signal. It does not scan ports, identify devices, or crawl networks.

Use ping for:

- safer free IP suggestions
- quick subnet checks
- detecting addresses that may already be in use

Recommended practice:

- enable auto-ping only for networks reachable from the ATLAS server
- disable it for remote, filtered, or isolated networks where ICMP is not reliable

## Dynamic Discovery

ATLAS receives signed snapshots from optional outbound-only Python agents. The server does not need inbound access to Docker, Kubernetes, Proxmox, or remote hosts.

Current agent collectors:

- `host`: local host identity, OS, kernel, primary IP, MAC, agent version, Docker/Compose versions when available
- `docker`: containers, images, state, exposed/published ports, labels, networks, timestamps
- `kubernetes`: Pods and Services, namespaces, IPs, ports, labels, owners, images, Kubernetes version
- `proxmox`: hypervisors, VM/LXC inventory, CPU/RAM/load, disks, guest IP/MAC, Proxmox version, guest OS when available

Discovery is preview-first by default. A discovered item can be:

- matched to an existing device or service
- reviewed in the Discovery screen
- created manually from preview
- created automatically only when a trusted policy enables create-on-discovery

ATLAS merges related discovery data in the UI where possible. For example, a host agent running on a Proxmox node and Proxmox hardware data for the same node are shown as one understandable entity instead of two confusing records.

Docker container replacement is automated by default for Watchtower/recreate flows: if a container keeps the same name on the same linked host, ATLAS updates the existing service identity instead of leaving an old duplicate. Admins can disable this in `Integrations -> Discovery -> Agents & Policy -> Data Policy`.

Bulk stale cleanup removes the stale preview rows, optional agent-owned registry records, and the discovery audit events tied to those deleted rows while keeping the cleanup event itself.

The Discovery Debug view can show stored raw metadata, filter by agent/kind, and choose which raw keys are visible or hidden for each entity.

## Network Map

The Network Map is the 0.4 topology layer. It builds a readable graph from IPAM records, services, and discovery results.

The UI includes:

- simple and advanced map modes
- subnet, layer, source, and status filters
- zoomable SVG graph
- subnet context cards
- colored network, hypervisor, Kubernetes, and host-to-service links
- capability-based layer visibility for admin/viewer users

The topology API is available at:

```text
GET /api/topology
```

It returns:

- `nodes`: normalized topology objects such as `subnet`, `core-router`, `switch`, `host`, `service`, `container`, `hypervisor`, `vm`, `lxc`, `kubernetes-service`, `kubernetes-pod`, `kubernetes-workload`, and `iot`
- `links`: normalized relationships with `source`, `target`, `kind`, `confidence`, and `graphSource`
- `interfaces`: normalized node addresses with IP, MAC, subnet, confidence, and source metadata
- `capabilities`: layer visibility and advanced-mode availability for the current user

Supported link kinds:

- `core-subnet`: core router anchors a subnet
- `subnet-member`: subnet contains a host, service, workload, or IoT object
- `core-member`: UI-collapsed subnet membership shown through the core router
- `host-service`: host provides a service/container
- `hypervisor-guest`: Proxmox hypervisor contains a VM/LXC
- `kubernetes-service-workload`: Kubernetes Service selector matches a Pod/workload

`confidence` is `high`, `medium`, or `low`. `graphSource` is `manual`, `ipam`, `discovery`, or `inferred`.

The map is generated automatically. Manual map editing, pinned node positions, and manual topology overrides are intentionally kept for a later version.

## Discovery Security

- agent tokens are shown once and stored only as hashes
- every snapshot includes a schema key, timestamp, nonce, run id, packet info, and HMAC signature
- nonces prevent simple replay
- agents can be limited by allowed IP/CIDR in ATLAS
- exported agent definitions do not include token secrets
- raw metadata storage is controlled by data policy

## Agent Setup

Detailed agent documentation is in [agent/README.md](agent/README.md).

Short version:

1. Open ATLAS as admin.
2. Go to `Integrations -> Discovery -> Agents`.
3. Create an agent and copy the generated config while the token is visible.
4. Put `agent/atlas_agent.py` and `atlas-agent.json` on the machine that should report inventory.
5. Test with:

```bash
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once --print-payload
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once
```

6. Run it continuously with a service manager such as `systemd`, Docker, cron wrapper, or your process supervisor.

## Import, Export, And Backup

Supported exports:

- `JSON`: ATLAS state snapshot
- `CSV`: separate exports for subnets, range groups, devices, and services
- `Backup ATLAS`: full backup for restore or migration

Use full backup when you need to preserve users, access groups, settings, discovery agents, and policies.

## Storage

ATLAS stores state in SQLite.

- default database path: `data/atlas.db`
- the database is created automatically
- use `ATLAS_DB_PATH` to move it
- back up the database or use the built-in full backup before upgrades and experiments

## Configuration

Environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `ATLAS_HOST` | `0.0.0.0` | Bind address. |
| `ATLAS_PORT` | `4173` | HTTP port. |
| `ATLAS_DB_PATH` | `data/atlas.db` | SQLite database path. |
| `ATLAS_SCAN_INTERVAL` | `90` | Background ping interval in seconds. |
| `ATLAS_SCAN_TIMEOUT_MS` | `1000` | Timeout for one ping. |
| `ATLAS_SCAN_CONCURRENCY` | `32` | Parallel ping workers. |
| `ATLAS_HISTORY_LIMIT` | `200` | History rows returned to the UI. |
| `ATLAS_SESSION_TTL_SECONDS` | `1209600` | Session lifetime, default 14 days. |
| `ATLAS_DISCOVERY_MAX_BODY_BYTES` | `524288` | Max HTTP body size for one discovery packet. |
| `ATLAS_DISCOVERY_MAX_ITEMS` | `500` | Max discovery items in one packet. |
| `ATLAS_DISCOVERY_MAX_RAW_BYTES` | `16384` | Max raw metadata bytes per item/host/metadata block. |
| `ATLAS_DISCOVERY_MAX_PACKETS_PER_RUN` | `128` | Max packets accepted for one discovery run. |
| `ATLAS_DISCOVERY_RETRY_AFTER_SECONDS` | `30` | Retry hint returned when discovery is rate-limited/rejected temporarily. |

Example:

```bash
ATLAS_PORT=4180 ATLAS_DB_PATH=/srv/atlas/atlas.db python3 server.py
```

## Testing

Run the full regression suite with:

```bash
python3 -m unittest discover -s tests
```

Or run focused suites:

```bash
python3 -m unittest tests.test_topology
python3 -m unittest tests.test_discovery_integrity
```

The fixtures cover subnet-to-host, host-to-service, Proxmox hypervisor-to-VM/LXC, Kubernetes Service-to-Pod, IoT-to-subnet, admin/viewer topology capability differences, Docker host-scoped replacement, Watchtower recreate protection, and stale discovery audit cleanup.

## Project Files

- `server.py`: HTTP server, API, auth, SQLite, ping, discovery ingestion
- `index.html`: application shell
- `app.js`: client logic
- `styles.css`: UI styles
- `i18n.js`: English, Ukrainian, and Russian UI strings
- `agent/atlas_agent.py`: optional Python discovery agent
- `agent/atlas-agent.example.json`: agent config template
- `group-suggestion-templates.json`: bundled range group templates
- `data/`: default local data directory
