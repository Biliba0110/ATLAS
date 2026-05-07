# ATLAS Python Agent MVP

The MVP agent collects local host, Docker, Kubernetes, and Proxmox metadata and pushes signed discovery packets to ATLAS.
Each collection cycle gets one shared `runId`, then the agent sends separate packets by `source`:
`host`, `docker`, `kubernetes`, `proxmox`, later more sources. ATLAS groups those packets into one discovery run.

## Config

Copy `atlas-agent.example.json` to `atlas-agent.json` and set:

- `atlas_url`: ATLAS URL. Use HTTPS in real deployments.
- `agent_id`: the agent ID created in ATLAS.
- `agent_token`: token shown once by ATLAS.
- `interval`: snapshot interval in seconds, minimum `15`.
- `source_name`: package source name, default `agent`.
- `max_items_per_packet`: max objects in one source packet, default `450`.
- `max_packet_bytes`: local safety limit for one signed packet, default `491520`.
- `max_packets_per_source`: safety limit for chunks from one source, default `32`.
- `backoff_initial_seconds`: first error backoff base, default `30`.
- `backoff_max_seconds`: max error backoff, default `900`.
- `backoff_jitter`: random delay spread from `0.0` to `1.0`, default `0.2`.
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

## ATLAS setup

1. Open ATLAS as an admin.
2. Go to Settings -> Discovery.
3. Create an agent.
4. Copy the generated config while the token is visible.
5. Put the config on the server that will run the agent.
6. Keep `agent_id` unique per server, even if several agents share one token.

ATLAS stores only the token hash. If the config is lost, rotate the token and update the agent config.

Docker socket access is powerful. Treat it as local root-level access and prefer running
the agent next to Docker instead of exposing Docker TCP ports.

Proxmox tokens should be read-only and scoped to the minimum permissions needed for VM/LXC
inventory. The agent tries QEMU guest agent network data first, then VM/LXC config metadata,
and does not probe guest networks.

The agent does not collect SNMP, MQTT, or manual IoT inventory. Those are planned as separate
ATLAS integration settings, not as agent collectors.

## Run

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Print a signed snapshot without sending:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

`--print-payload` prints the list of signed source packets that would be sent in the same run.

Large sources are split into multiple packets with the same `runId` and packet metadata
(`source`, `index`, `total`). ATLAS groups them into one discovery run and waits for the
final packet of a source before marking missing objects as stale.

When ATLAS is unavailable or rejects a packet, the long-running agent uses exponential
backoff with jitter and respects `Retry-After` returned by ATLAS.

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

## Planned separately

These are intentionally not part of the current agent:

- `snmp`: planned as an ATLAS-side integration with explicit targets and encrypted credentials.
- `mqtt`: planned as a communication/integration channel.
- `iot`: remains an ATLAS object model; data should arrive through future integrations.

Possible future agent collectors:

- `podman`
- `libvirt` / `kvm`
- `lxc`
- `esxi`
- `xcp-ng`
- `services`
- `hardware`
