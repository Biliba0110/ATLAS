# ATLAS Python Agent MVP

The MVP agent collects local host, Docker, Kubernetes, and Proxmox metadata and pushes one signed discovery snapshot to ATLAS.
The snapshot is a package from one `agent_id`; objects inside it are separated by `source`
(`host`, `docker`, `kubernetes`, `proxmox`, later more sources).

## Config

Copy `atlas-agent.example.json` to `atlas-agent.json` and set:

- `atlas_url`: ATLAS URL. Use HTTPS in real deployments.
- `agent_id`: the agent ID created in ATLAS.
- `agent_token`: token shown once by ATLAS.
- `interval`: snapshot interval in seconds, minimum `15`.
- `source_name`: package source name, default `agent`.
- `enabled_collectors`: collectors to run, for example `["host", "docker", "kubernetes", "proxmox"]`.
- `docker_socket`: Docker Unix socket path. Defaults can auto-detect `/var/run/docker.sock`
  and Docker Desktop's `~/.docker/run/docker.sock`.
- `docker_host`: optional Docker TCP endpoint. Use only when explicitly needed.
- `kubernetes_api_url`: Kubernetes API URL. In-cluster agents can usually omit it.
- `kubernetes_token` or `kubernetes_token_file`: service account token.
- `kubernetes_ca_cert`: CA file for the Kubernetes API.
- `kubernetes_namespaces`: namespaces to collect, for example `["default", "apps"]`.
- `kubernetes_all_namespaces`: collect across all namespaces if the token allows it.
- `proxmox_api_url`: Proxmox API URL, for example `https://pve.local:8006`.
- `proxmox_token_id` and `proxmox_token_secret`: Proxmox API token stored only in the agent config.
- `proxmox_nodes`: optional node allow-list, for example `["pve1", "pve2"]`; empty means all visible nodes.
- `proxmox_verify_tls`: verify Proxmox TLS certificates.

For local testing with `http://127.0.0.1:4173`, set `allow_insecure_http` to `true`.

Docker socket access is powerful. Treat it as local root-level access and prefer running
the agent next to Docker instead of exposing Docker TCP ports.

Proxmox tokens should be read-only and scoped to the minimum permissions needed for VM/LXC
inventory. The agent tries QEMU guest agent network data first, then VM/LXC config metadata,
and does not probe guest networks.

## Run

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Print a signed snapshot without sending:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

## Shared Tokens

Multiple servers may use the same token only when each server has a unique `agent_id` in ATLAS.
This lets ATLAS separate stale/orphan state per server while still allowing token groups such as
`internal` or `external`.

## Current Collectors

- `host`: hostname, FQDN, primary IP, MAC, OS/platform, Python version.
- `docker`: containers, status, exposed/published ports, labels, networks/IP, image,
  created/started timestamps, and last seen.
- `kubernetes`: Pods and Services with namespace/name, status, labels, ports, pod IP,
  node/host IP, images, owners, Service type/ClusterIP/external IPs, and last seen.
- `proxmox`: VM/LXC resources with node, VMID, status, name, type, and IPs when available
  from guest agent or config metadata.
