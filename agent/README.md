# ATLAS Python Discovery Agent

Language versions: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

The ATLAS agent is a dependency-free Python collector that sends signed discovery snapshots to ATLAS over outbound HTTP(S).

It does not scan networks. It reads local or API-provided inventory from enabled collectors and pushes it to ATLAS.

## Requirements

- Python `3.10+`
- outbound access from the agent host to `atlas_url`
- an agent record created in ATLAS
- collector-specific access when enabled:
  - Docker socket or Docker API
  - Kubernetes API token
  - Proxmox API token

The agent uses only Python standard library modules.

## How Discovery Packets Work

Each collection cycle creates one `runId`. The agent then sends separate packets by source:

- `host`
- `docker`
- `kubernetes`
- `proxmox`

Large sources are split into chunks with packet metadata:

- `source`
- `index`
- `total`

ATLAS groups packets with the same `runId` into one discovery run. Every packet is signed with the agent token and includes timestamp and nonce checks.

## Setup In ATLAS

1. Sign in as an admin.
2. Open `Integrations -> Discovery -> Agents`.
3. Create an agent.
4. Choose a clear name, type, allowed IP/CIDR if needed, and data policy.
5. Copy the generated config while the token is visible.
6. Save it on the machine that will run the agent as `atlas-agent.json`.

ATLAS stores only the token hash. If the token is lost, rotate it in ATLAS and update `agent_token` in the config.

Keep `agent_id` unique per reporting machine. Multiple agents may share a token only when each machine has its own agent record and `agent_id`.

## Minimal Config

Copy the example:

```bash
cp atlas-agent.example.json atlas-agent.json
```

Minimal host-only config:

```json
{
  "atlas_url": "https://atlas.example.local:4173",
  "agent_id": "paste-agent-id-from-atlas",
  "agent_token": "paste-agent-token-shown-once",
  "interval": 60,
  "enabled_collectors": ["host"]
}
```

For local ATLAS testing with plain HTTP:

```json
{
  "atlas_url": "http://127.0.0.1:4173",
  "allow_insecure_http": true,
  "verify_tls": false
}
```

Use HTTPS and TLS verification for real deployments.

## Full Config Reference

| Key | Default | Description |
| --- | --- | --- |
| `atlas_url` | required | ATLAS base URL. HTTPS is required unless `allow_insecure_http` is true. |
| `agent_id` | required | Agent ID from ATLAS. |
| `agent_token` | required | Agent token shown once by ATLAS. |
| `interval` / `interval_seconds` | `60` | Send interval in seconds. Minimum `15`. |
| `timeout` | `20` | Timeout for posting snapshots to ATLAS. Minimum `2`. |
| `source_name` | `agent` | Human source label used for combined legacy payloads. Source packets still use collector names. |
| `verify_tls` | `true` | Verify ATLAS TLS certificate. |
| `allow_insecure_http` | `false` | Allow `http://` ATLAS URL for local testing. |
| `enabled_collectors` | `["host"]` | List or comma-separated string. Supported: `host`, `docker`, `kubernetes`, `proxmox`. |
| `max_items_per_packet` | `450` | Local chunk size before splitting one source into several packets. |
| `max_packet_bytes` | `491520` | Local max signed packet size. |
| `max_packets_per_source` | `32` | Local safety limit for chunks from one source. |
| `backoff_initial_seconds` | `30` | Initial retry backoff after an error. |
| `backoff_max_seconds` | `900` | Maximum retry backoff. |
| `backoff_jitter` | `0.2` | Random jitter ratio from `0.0` to `1.0`. |
| `docker_socket` | auto | Docker Unix socket. Auto-detects `/var/run/docker.sock` and Docker Desktop `~/.docker/run/docker.sock`. |
| `docker_host` | empty | Optional Docker HTTP(S) API endpoint. Use with care. |
| `docker_timeout` | `timeout` or `10` | Docker API timeout. |
| `kubernetes_api_url` | in-cluster env | Kubernetes API URL. In-cluster agents can use service environment variables. |
| `kubernetes_allow_insecure_http` | `false` | Allow HTTP Kubernetes API URL. Lab only. |
| `kubernetes_token` | empty | Kubernetes bearer token. |
| `kubernetes_token_file` | service account token | Path to token file. |
| `kubernetes_ca_cert` | service account CA | CA certificate path. |
| `kubernetes_namespaces` | service namespace or `default` | Namespaces to collect. String or list. |
| `kubernetes_all_namespaces` | `false` | Collect all namespaces. Requires permissions. |
| `kubernetes_verify_tls` | `verify_tls` | Verify Kubernetes TLS. |
| `kubernetes_timeout` | `timeout` or `20` | Kubernetes API timeout. |
| `kubernetes_limit` | `500` | Kubernetes API list limit. |
| `proxmox_api_url` | required for Proxmox | Proxmox API URL, usually `https://pve-host:8006`. |
| `proxmox_allow_insecure_http` | `false` | Allow HTTP Proxmox URL. Lab only. |
| `proxmox_token_id` | required for Proxmox | Full token id, for example `atlas@pve!discovery`. |
| `proxmox_token_secret` | required for Proxmox | Proxmox token secret. |
| `proxmox_nodes` | `[]` | Optional node allow-list. Empty means all visible nodes. |
| `proxmox_include_ipv6` | `false` | Include guest IPv6 addresses. |
| `proxmox_verify_tls` | `verify_tls` | Verify Proxmox TLS certificate. |
| `proxmox_ca_cert` | empty | Optional Proxmox CA certificate path. |
| `proxmox_timeout` | `timeout` or `20` | Proxmox API timeout. |

## Run

Send one snapshot and exit:

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Print signed packets without sending them:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Run continuously:

```bash
python3 atlas_agent.py --config atlas-agent.json
```

The long-running mode sleeps for `interval` seconds after successful runs. On errors it uses exponential backoff with jitter and respects `Retry-After` from ATLAS.

## systemd Example

Example layout:

- script: `/opt/atlas-agent/atlas_agent.py`
- config: `/etc/atlas-agent.json`
- service user: `atlas-agent`

Service file:

```ini
[Unit]
Description=ATLAS Discovery Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=atlas-agent
Group=atlas-agent
ExecStart=/usr/bin/python3 /opt/atlas-agent/atlas_agent.py --config /etc/atlas-agent.json
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

If the Docker collector uses `/var/run/docker.sock`, the service user must be allowed to access that socket, usually by membership in the `docker` group. Treat that as powerful local access.

## Collector: Host

Recommended in almost every config:

```json
{
  "enabled_collectors": ["host"]
}
```

Collects:

- hostname and FQDN
- primary IPv4
- MAC
- OS name from `/etc/os-release`, macOS, or Windows where available
- kernel label
- machine architecture
- ATLAS agent version
- Docker and Docker Compose versions when CLI commands are available

The host collector gives ATLAS a stable device identity and helps merge local host data with Proxmox hardware data for the same node.

## Collector: Docker

Use when the agent runs on a Docker host:

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

Collects:

- Docker version and API version
- Docker Compose version when available
- containers from `/containers/json?all=1`
- inspect data for each container
- container name, image, state, created/started/finished timestamps
- exposed and published ports
- labels
- networks, container IP, MAC, and network id

Source IDs prefer stable container names (`docker:name:<name>`) so recreated containers can update existing discovery records instead of creating duplicates.

Security note: Docker socket access is effectively root-level local access. Prefer the local Unix socket and do not expose Docker TCP to untrusted networks.

## Collector: Kubernetes

In-cluster example:

```json
{
  "enabled_collectors": ["host", "kubernetes"],
  "kubernetes_api_url": "https://kubernetes.default.svc",
  "kubernetes_token_file": "/var/run/secrets/kubernetes.io/serviceaccount/token",
  "kubernetes_ca_cert": "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt",
  "kubernetes_namespaces": ["default"],
  "kubernetes_all_namespaces": false,
  "kubernetes_verify_tls": true,
  "kubernetes_timeout": 10
}
```

Out-of-cluster example:

```json
{
  "enabled_collectors": ["host", "kubernetes"],
  "kubernetes_api_url": "https://k8s-api.example.local:6443",
  "kubernetes_token": "paste-service-account-token",
  "kubernetes_ca_cert": "/path/to/cluster-ca.crt",
  "kubernetes_namespaces": ["default", "apps"],
  "kubernetes_verify_tls": true
}
```

Collects:

- Kubernetes server version
- Pods
- Services
- namespace/name, UID, labels, owners
- Pod phase, Pod IP, host IP, node name
- container images, readiness count, restart count, start time
- Service type, ClusterIP, external IPs, selectors, ports

Permissions needed:

- `get/list` Pods
- `get/list` Services
- in each configured namespace, or cluster-wide when `kubernetes_all_namespaces` is true

Prefer explicit `kubernetes_namespaces` unless you really need cluster-wide discovery.

## Collector: Proxmox

Example:

```json
{
  "enabled_collectors": ["host", "proxmox"],
  "proxmox_api_url": "https://pve.example.local:8006",
  "proxmox_token_id": "atlas@pve!discovery",
  "proxmox_token_secret": "paste-proxmox-token-secret",
  "proxmox_nodes": [],
  "proxmox_include_ipv6": false,
  "proxmox_verify_tls": true,
  "proxmox_timeout": 10
}
```

How to create the Proxmox token:

1. Create or choose a restricted Proxmox user, for example `atlas@pve`.
2. Create an API token, for example `discovery`.
3. Use the full token id: `atlas@pve!discovery`.
4. Copy the token secret into `proxmox_token_secret`.
5. Give the token read-only permissions for the nodes/VMs/LXCs ATLAS should see.

Collects hypervisor/node data:

- node name and status
- Proxmox version formatted as `Proxmox Virtual Environment <version>`
- kernel formatted as `Linux <release>`
- CPU usage, CPU model, socket/core count
- RAM usage
- load average
- physical disk list and sizes

Collects VM/LXC data:

- node, VMID, type, template flag, status, tags
- vCPU/RAM/disk allocation
- configured disks
- MAC address
- guest IPs from QEMU Guest Agent when available
- fallback IP/MAC from VM/LXC config where available
- VM OS/kernel from QEMU Guest Agent `get-osinfo` when available
- LXC OS label from `ostype` where available

Guest IP notes:

- For VMs, install and enable QEMU Guest Agent for best IP and OS results.
- The collector ignores internal guest interfaces such as `lo`, `docker0`, `br-*`, `veth*`, `cni0`, `flannel*`, and similar CNI/Docker interfaces.
- IPv6 guest addresses are skipped unless `proxmox_include_ipv6` is true.

TLS notes:

- Prefer installing the Proxmox CA and setting `proxmox_ca_cert`.
- For lab-only self-signed setups, `proxmox_verify_tls: false` works but is less safe.

## Mixed Collectors

You can combine collectors:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Collectors define what is collected. The agent type selected in ATLAS is a UI classification and does not restrict the local config by itself.

## Data Policy In ATLAS

ATLAS can store different amounts of metadata depending on discovery policy:

- runtime data
- labels
- network data
- raw metadata
- preview visibility
- create-on-discovery behavior

If a value appears in `--print-payload` but not in the UI, check the agent or global discovery data policy in ATLAS.

The Debug view can reveal stored raw fields and lets you move fields between visible and hidden lists per entity.

## Troubleshooting

Use `--print-payload` first:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Common issues:

- `atlas_url must use https`: use HTTPS, or set `allow_insecure_http: true` only for local testing.
- `Config value 'agent_token' is required`: the token was not copied into config.
- `ATLAS rejected snapshot: HTTP 401/403`: wrong token, revoked token, wrong agent id, or IP/CIDR restriction.
- `Docker socket was not found`: set `docker_socket`, run on the Docker host, or check permissions.
- `Kubernetes token was not found`: set `kubernetes_token`, `kubernetes_token_file`, or run in-cluster with a mounted service account.
- `Proxmox API returned HTTP 401/403`: check token id, token secret, and Proxmox permissions.
- no VM IPs from Proxmox: install/enable QEMU Guest Agent or configure static IP metadata in Proxmox where possible.
- packet too large: lower `max_items_per_packet` or reduce raw metadata policy in ATLAS.

## Security Notes

- Keep `atlas-agent.json` private. It contains secrets.
- Use HTTPS for ATLAS and API endpoints.
- Use read-only Proxmox tokens.
- Scope Kubernetes service accounts to the namespaces you need.
- Treat Docker socket access as privileged local access.
- Rotate an agent token if a config was exposed.
- Use allowed IP/CIDR restrictions in ATLAS when agents have stable egress addresses.

## Not Implemented In This Agent

These are intentionally separate from the current Python agent:

- SNMP polling
- MQTT integration
- generic port scanning
- full hardware inventory via SSH
- manual IoT object management

Possible future collectors may include Podman, libvirt/KVM, ESXi, XCP-ng, service checks, or deeper hardware inventory.
