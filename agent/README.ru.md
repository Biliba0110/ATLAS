# ATLAS Python Discovery Agent

Языковые версии: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS agent — Python collector без сторонних зависимостей, который отправляет подписанные discovery snapshots в ATLAS через outbound HTTP(S).

Он не сканирует сеть. Агент читает локальный или API-provided inventory из включённых collector'ов и отправляет его в ATLAS.

## Требования

- Python `3.10+`
- outbound-доступ от хоста агента до `atlas_url`
- agent record, созданный в ATLAS
- доступы для включённых collector'ов:
  - Docker socket или Docker API
  - Kubernetes API token
  - Proxmox API token

Агент использует только стандартную библиотеку Python.

## Как работают discovery packets

Каждый цикл сбора создаёт один `runId`. Затем агент отправляет отдельные packets по source:

- `host`
- `docker`
- `kubernetes`
- `proxmox`

Большие sources делятся на chunks с packet metadata:

- `source`
- `index`
- `total`

ATLAS группирует packets с одинаковым `runId` в один discovery run. Каждый packet подписывается agent token и проходит проверки timestamp и nonce.

## Настройка в ATLAS

1. Войдите как admin.
2. Откройте `Интеграции -> Discovery -> Agents`.
3. Создайте агента.
4. Укажите понятное имя, тип, allowed IP/CIDR при необходимости и data policy.
5. Скопируйте generated config, пока token виден.
6. Сохраните его на машине агента как `atlas-agent.json`.

ATLAS хранит только hash token. Если token потерян, сделайте rotate token в ATLAS и обновите `agent_token` в config.

`agent_id` должен быть уникальным для каждой reporting machine. Несколько агентов могут делить token только если у каждой машины свой agent record и свой `agent_id`.

## Минимальный config

Скопируйте пример:

```bash
cp atlas-agent.example.json atlas-agent.json
```

Минимальный host-only config:

```json
{
  "atlas_url": "https://atlas.example.local:4173",
  "agent_id": "paste-agent-id-from-atlas",
  "agent_token": "paste-agent-token-shown-once",
  "interval": 60,
  "enabled_collectors": ["host"]
}
```

Для локального теста ATLAS через plain HTTP:

```json
{
  "atlas_url": "http://127.0.0.1:4173",
  "allow_insecure_http": true,
  "verify_tls": false
}
```

Для реального развертывания используйте HTTPS и проверку TLS.

## Полный справочник config

| Ключ | По умолчанию | Описание |
| --- | --- | --- |
| `atlas_url` | required | Base URL ATLAS. HTTPS обязателен, если не включён `allow_insecure_http`. |
| `agent_id` | required | Agent ID из ATLAS. |
| `agent_token` | required | Agent token, который ATLAS показывает один раз. |
| `interval` / `interval_seconds` | `60` | Интервал отправки в секундах. Минимум `15`. |
| `timeout` | `20` | Timeout отправки snapshots в ATLAS. Минимум `2`. |
| `source_name` | `agent` | Human source label для legacy combined payload. Source packets используют имена collector'ов. |
| `verify_tls` | `true` | Проверять TLS certificate ATLAS. |
| `allow_insecure_http` | `false` | Разрешить `http://` ATLAS URL для локального теста. |
| `enabled_collectors` | `["host"]` | Список или строка через запятую. Поддерживаются: `host`, `docker`, `kubernetes`, `proxmox`. |
| `max_items_per_packet` | `450` | Локальный chunk size перед разделением source на несколько packets. |
| `max_packet_bytes` | `491520` | Локальный максимум размера signed packet. |
| `max_packets_per_source` | `32` | Локальный safety limit chunks одного source. |
| `backoff_initial_seconds` | `30` | Начальная retry-задержка после ошибки. |
| `backoff_max_seconds` | `900` | Максимальная retry-задержка. |
| `backoff_jitter` | `0.2` | Случайный jitter ratio от `0.0` до `1.0`. |
| `docker_socket` | auto | Docker Unix socket. Auto-detect: `/var/run/docker.sock` и Docker Desktop `~/.docker/run/docker.sock`. |
| `docker_host` | empty | Опциональный Docker HTTP(S) API endpoint. Используйте осторожно. |
| `docker_timeout` | `timeout` или `10` | Timeout Docker API. |
| `kubernetes_api_url` | in-cluster env | URL Kubernetes API. In-cluster agent может брать service environment variables. |
| `kubernetes_allow_insecure_http` | `false` | Разрешить HTTP Kubernetes API URL. Только lab. |
| `kubernetes_token` | empty | Kubernetes bearer token. |
| `kubernetes_token_file` | service account token | Путь к token file. |
| `kubernetes_ca_cert` | service account CA | Путь к CA certificate. |
| `kubernetes_namespaces` | service namespace или `default` | Namespaces для сбора. Строка или список. |
| `kubernetes_all_namespaces` | `false` | Собирать все namespaces. Требует прав. |
| `kubernetes_verify_tls` | `verify_tls` | Проверять TLS Kubernetes. |
| `kubernetes_timeout` | `timeout` или `20` | Timeout Kubernetes API. |
| `kubernetes_limit` | `500` | Kubernetes API list limit. |
| `proxmox_api_url` | required для Proxmox | Proxmox API URL, обычно `https://pve-host:8006`. |
| `proxmox_allow_insecure_http` | `false` | Разрешить HTTP Proxmox URL. Только lab. |
| `proxmox_token_id` | required для Proxmox | Полный token id, например `atlas@pve!discovery`. |
| `proxmox_token_secret` | required для Proxmox | Proxmox token secret. |
| `proxmox_nodes` | `[]` | Опциональный allow-list node'ов. Пусто означает все видимые node'ы. |
| `proxmox_include_ipv6` | `false` | Включать guest IPv6 addresses. |
| `proxmox_verify_tls` | `verify_tls` | Проверять TLS certificate Proxmox. |
| `proxmox_ca_cert` | empty | Опциональный путь к Proxmox CA certificate. |
| `proxmox_timeout` | `timeout` или `20` | Timeout Proxmox API. |

## Запуск

Отправить один snapshot и выйти:

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Напечатать signed packets без отправки:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Запустить постоянно:

```bash
python3 atlas_agent.py --config atlas-agent.json
```

Long-running режим спит `interval` секунд после успешных runs. При ошибках используется exponential backoff с jitter и учитывается `Retry-After` от ATLAS.

## Пример systemd

Пример layout:

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

Если Docker collector использует `/var/run/docker.sock`, service user должен иметь доступ к socket, обычно через группу `docker`. Считайте это сильным локальным доступом.

## Collector: Host

Рекомендуется почти в каждом config:

```json
{
  "enabled_collectors": ["host"]
}
```

Собирает:

- hostname и FQDN
- primary IPv4
- MAC
- OS name из `/etc/os-release`, macOS или Windows где доступно
- kernel label
- machine architecture
- версия ATLAS agent
- версии Docker и Docker Compose, если доступны CLI commands

Host collector даёт ATLAS стабильную идентичность устройства и помогает объединять local host data с Proxmox hardware data той же node.

## Collector: Docker

Используйте, когда агент запускается на Docker host:

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

Собирает:

- Docker version и API version
- Docker Compose version если доступна
- containers из `/containers/json?all=1`
- inspect data для каждого container
- container name, image, state, created/started/finished timestamps
- exposed и published ports
- labels
- networks, container IP, MAC и network id

Source IDs предпочитают стабильные имена контейнеров (`docker:name:<name>`), чтобы пересозданные контейнеры обновляли существующие discovery records, а не создавали дубликаты.

Важно: Docker socket почти равен root-level local access. Лучше использовать local Unix socket и не открывать Docker TCP в недоверенные сети.

## Collector: Kubernetes

In-cluster пример:

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

Out-of-cluster пример:

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

Собирает:

- Kubernetes server version
- Pods
- Services
- namespace/name, UID, labels, owners
- Pod phase, Pod IP, host IP, node name
- container images, readiness count, restart count, start time
- Service type, ClusterIP, external IPs, selectors, ports

Нужные permissions:

- `get/list` Pods
- `get/list` Services
- в каждом configured namespace или cluster-wide при `kubernetes_all_namespaces: true`

Лучше явно указывать `kubernetes_namespaces`, если cluster-wide discovery не нужен.

## Collector: Proxmox

Пример:

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

Как создать Proxmox token:

1. Создайте или выберите restricted Proxmox user, например `atlas@pve`.
2. Создайте API token, например `discovery`.
3. Используйте полный token id: `atlas@pve!discovery`.
4. Скопируйте token secret в `proxmox_token_secret`.
5. Дайте token read-only permissions на nodes/VMs/LXCs, которые собирает ATLAS.

Собирает hypervisor/node data:

- node name и status
- Proxmox version в виде `Proxmox Virtual Environment <version>`
- kernel в виде `Linux <release>`
- CPU usage, CPU model, socket/core count
- RAM usage
- load average
- physical disk list и sizes

Собирает VM/LXC data:

- node, VMID, type, template flag, status, tags
- vCPU/RAM/disk allocation
- configured disks
- MAC address
- guest IPs из QEMU Guest Agent если доступны
- fallback IP/MAC из VM/LXC config где доступно
- VM OS/kernel из QEMU Guest Agent `get-osinfo` если доступно
- LXC OS label из `ostype` где доступно

Заметки по guest IP:

- QEMU Guest Agent предоставляет VM IP и OS data, когда он установлен и включен.
- Collector игнорирует внутренние guest interfaces вроде `lo`, `docker0`, `br-*`, `veth*`, `cni0`, `flannel*` и похожие CNI/Docker interfaces.
- Guest IPv6 пропускаются, если не включён `proxmox_include_ipv6`.

TLS:

- Лучше установить Proxmox CA и указать `proxmox_ca_cert`.
- Для lab с self-signed certificate можно поставить `proxmox_verify_tls: false`, но это менее безопасно.

## Смешанные collectors

Collectors можно комбинировать:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Именно collectors определяют, что собирается. Тип агента в ATLAS — это UI-классификация и сам по себе не ограничивает local config.

## Data Policy в ATLAS

ATLAS может хранить разный объём metadata в зависимости от discovery policy:

- runtime data
- labels
- network data
- raw metadata
- preview visibility
- create-on-discovery behavior

Если значение есть в `--print-payload`, но не видно в UI, проверьте agent или global discovery data policy в ATLAS.

Debug view может показать сохранённые raw fields и позволяет переносить поля между visible и hidden lists для каждой сущности.

## Troubleshooting

Сначала используйте `--print-payload`:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Частые проблемы:

- `atlas_url must use https`: используйте HTTPS или поставьте `allow_insecure_http: true` только для локального теста.
- `Config value 'agent_token' is required`: token не скопирован в config.
- `ATLAS rejected snapshot: HTTP 401/403`: неверный token, revoked token, неправильный agent id или IP/CIDR restriction.
- `Docker socket was not found`: укажите `docker_socket`, запускайте на Docker host или проверьте permissions.
- `Kubernetes token was not found`: укажите `kubernetes_token`, `kubernetes_token_file` или запускайте in-cluster с mounted service account.
- `Proxmox API returned HTTP 401/403`: проверьте token id, token secret и Proxmox permissions.
- нет VM IP из Proxmox: установите/включите QEMU Guest Agent или настройте static IP metadata в Proxmox где возможно.
- packet too large: уменьшите `max_items_per_packet` или raw metadata policy в ATLAS.

## Безопасность

- Держите `atlas-agent.json` приватным. В нём secrets.
- Используйте HTTPS для ATLAS и API endpoints.
- Используйте read-only Proxmox tokens.
- Ограничивайте Kubernetes service accounts нужными namespaces.
- Считайте Docker socket привилегированным локальным доступом.
- Ротируйте agent token, если config был раскрыт.
- Используйте allowed IP/CIDR restrictions в ATLAS, если у агентов стабильный egress address.

## Чего нет в текущем агенте

Это намеренно вынесено за пределы текущего Python agent:

- SNMP polling
- MQTT integration
- generic port scanning
- full hardware inventory через SSH
- ручное IoT object management

Возможные будущие collectors: Podman, libvirt/KVM, ESXi, XCP-ng, service checks или более глубокий hardware inventory.
