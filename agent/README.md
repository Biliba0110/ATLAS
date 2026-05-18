# ATLAS Python Agent MVP

Language versions: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

The MVP agent collects local host, Docker, Kubernetes, and Proxmox metadata and pushes signed discovery packets to ATLAS.
Each collection cycle gets one shared `runId`, then the agent sends separate packets by `source`:
`host`, `docker`, `kubernetes`, `proxmox`, later more sources. ATLAS groups those packets into one discovery run.

## Config

Copy `atlas-agent.example.json` to `atlas-agent.json` and set:

- `atlas_url`: ATLAS URL. Use HTTPS in real deployments.
- `agent_id`: the agent ID created in ATLAS.
- `agent_token`: token shown once by ATLAS.
- `interval`: how often the agent sends data to ATLAS, in seconds; minimum `15`.
- `timeout`: HTTP timeout for sending packets to ATLAS, default `20`.
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
- `proxmox_include_ipv6`: send IPv6 guest addresses; default is `false`.
- `proxmox_verify_tls`: verify Proxmox TLS certificates.

For local testing with `http://127.0.0.1:4173`, set `allow_insecure_http` to `true`.

## ATLAS setup

1. Open ATLAS as an admin.
2. Go to Integrations -> Discovery -> Agents & Policy.
3. Create an agent and choose the collectors you need.
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

## Collector recipes

Keep `host` enabled in almost every config. It identifies the server running the agent and gives
ATLAS a stable parent for services, containers, VM/LXC, and future map links.

### Host only

Use this when you only want the server itself to report basic inventory.

```json
{
  "enabled_collectors": ["host"]
}
```

Required fields:

- `atlas_url`
- `agent_id`
- `agent_token`
- `enabled_collectors`

The host collector sends hostname, FQDN, primary IP, MAC, system/machine,
agent version, and send interval.

### Docker host

Use this when the agent runs on the same server as Docker.

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

What to configure:

- `docker_socket`: best option for Linux servers. Usually `/var/run/docker.sock`.
- `docker_host`: optional TCP/HTTP endpoint. Use only inside trusted networks and only when you
  explicitly expose Docker API.

Security note: Docker socket access is effectively root-level local access. Prefer local socket
over Docker TCP. Do not expose Docker TCP to the internet.

Docker sends containers, name, image, status, labels if policy allows them, exposed/published ports,
networks/IPs if policy allows them, timestamps, and last seen. ATLAS uses stable container names for
source tracking, so a container recreated by Watchtower should replace the old discovery object
instead of creating a duplicate.

### Proxmox / PVE

Use this when the agent can reach a Proxmox API. The agent may run directly on a PVE node or on
another trusted server that can access `https://pve-host:8006`.

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

Where to get the Proxmox values:

1. In Proxmox, create a dedicated user, for example `atlas@pve`, or use an existing restricted user.
2. Create an API token for that user, for example token name `discovery`.
3. The full token id becomes `atlas@pve!discovery`.
4. Copy the token secret once and paste it into `proxmox_token_secret`.
5. Set `proxmox_api_url` to the PVE API URL, usually `https://<pve-host-or-ip>:8006`.

Recommended Proxmox permissions:

- read-only access is enough;
- scope it to the datacenter or only the nodes ATLAS should see;
- the collector reads cluster resources, VM/LXC status, VMID, node, name, type, and IPs when
  guest agent or config metadata makes them available.

Common PVE notes:

- If Proxmox uses a self-signed certificate, either install the CA and set `proxmox_ca_cert`,
  or temporarily set `proxmox_verify_tls` to `false` for lab use.
- `proxmox_nodes: []` means all nodes visible to the token.
- `proxmox_nodes: ["pve1"]` limits collection to selected nodes.
- Guest IPs are best when QEMU Guest Agent is enabled in the VM and installed inside the guest OS.
- By default, the Proxmox collector does not send IPv6 and skips guest interfaces such as `docker0`,
  `br-*`, `veth*`, and `cni0` to avoid storing internal Docker/CNI addresses from inside a VM.

### Kubernetes

Use this when the agent runs inside a Kubernetes cluster or on a host that can reach the Kubernetes API.

In-cluster config:

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

Out-of-cluster config:

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

The Kubernetes token needs read permissions for:

- pods
- services
- namespaces you want to collect

For all namespaces, set:

```json
{
  "kubernetes_all_namespaces": true
}
```

Only do that if the service account has the needed permissions and you really want cluster-wide
visibility. Otherwise prefer explicit `kubernetes_namespaces`.

### Mixed host

You can combine collectors when one server has multiple roles:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Collector choice controls what the agent collects. The ATLAS “agent type” is only a UI description:
`Hypervisor` can still be remote, and `External` can still collect Docker or Proxmox if the config
enables those collectors.

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
Each packet also reports the agent's configured send timing in `payload.metadata.agentTiming`:
`sendIntervalSeconds` from config `interval`, and `requestTimeoutSeconds` from config `timeout`.
ATLAS stores those as read-only runtime info so you can see how often data is sent.
The main ATLAS agent table shows only the send interval. Availability is calculated from
`sendIntervalSeconds`: `UP <= interval + 20s`, `PENDING <= interval * 2 + 75s`,
then `DOWN`.

When ATLAS is unavailable or rejects a packet, the long-running agent uses exponential
backoff with jitter and respects `Retry-After` returned by ATLAS.

## Shared Tokens

Multiple servers may use the same token only when each server has a unique `agent_id` in ATLAS.
This lets ATLAS separate stale/orphan state per server while still allowing token groups such as
`internal` or `external`.

## Current Collectors

- `host`: hostname, FQDN, primary IP, MAC, system/machine.
- `docker`: containers, status, exposed/published ports, labels, networks/IP, image,
  created/started timestamps, and last seen.
- `kubernetes`: Pods and Services with namespace/name, status, labels, ports, pod IP,
  node/host IP, images, owners, Service type/ClusterIP/external IPs, and last seen.
- `proxmox`: PVE node/hypervisor resources with CPU/RAM/load/kernel/PVE version, plus
  VM/LXC resources with node, VMID, status, name, type, RAM, allocated disks, MAC,
  and primary IP when available from guest agent or config metadata.

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
