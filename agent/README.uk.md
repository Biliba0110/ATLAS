# ATLAS Python Discovery Agent

Мовні версії: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS agent — Python collector без сторонніх залежностей, який надсилає підписані discovery snapshots в ATLAS через outbound HTTP(S).

Він не сканує мережу. Агент читає локальний або API-provided inventory з увімкнених collector'ів і надсилає його в ATLAS.

## Вимоги

- Python `3.10+`
- outbound-доступ від хоста агента до `atlas_url`
- agent record, створений в ATLAS
- доступи для увімкнених collector'ів:
  - Docker socket або Docker API
  - Kubernetes API token
  - Proxmox API token

Агент використовує лише стандартну бібліотеку Python.

## Як працюють discovery packets

Кожен цикл збору створює один `runId`. Потім агент надсилає окремі packets за source:

- `host`
- `docker`
- `kubernetes`
- `proxmox`

Великі sources діляться на chunks з packet metadata:

- `source`
- `index`
- `total`

ATLAS групує packets з однаковим `runId` в один discovery run. Кожен packet підписується agent token і проходить перевірки timestamp та nonce.

## Налаштування в ATLAS

1. Увійдіть як admin.
2. Відкрийте `Інтеграції -> Discovery -> Agents`.
3. Створіть агента.
4. Вкажіть зрозуміле ім'я, тип, allowed IP/CIDR за потреби та data policy.
5. Скопіюйте generated config, поки token видимий.
6. Збережіть його на машині агента як `atlas-agent.json`.

ATLAS зберігає лише hash token. Якщо token втрачено, зробіть rotate token в ATLAS і оновіть `agent_token` у config.

`agent_id` має бути унікальним для кожної reporting machine. Кілька агентів можуть ділити token лише якщо кожна машина має свій agent record і свій `agent_id`.

## Мінімальний config

Скопіюйте приклад:

```bash
cp atlas-agent.example.json atlas-agent.json
```

Мінімальний host-only config:

```json
{
  "atlas_url": "https://atlas.example.local:4173",
  "agent_id": "paste-agent-id-from-atlas",
  "agent_token": "paste-agent-token-shown-once",
  "interval": 60,
  "enabled_collectors": ["host"]
}
```

Для локального тесту ATLAS через plain HTTP:

```json
{
  "atlas_url": "http://127.0.0.1:4173",
  "allow_insecure_http": true,
  "verify_tls": false
}
```

Для реального розгортання використовуйте HTTPS і перевірку TLS.

## Повний довідник config

| Ключ | За замовчуванням | Опис |
| --- | --- | --- |
| `atlas_url` | required | Base URL ATLAS. HTTPS обов'язковий, якщо не увімкнено `allow_insecure_http`. |
| `agent_id` | required | Agent ID з ATLAS. |
| `agent_token` | required | Agent token, який ATLAS показує один раз. |
| `interval` / `interval_seconds` | `60` | Інтервал надсилання в секундах. Мінімум `15`. |
| `timeout` | `20` | Timeout надсилання snapshots в ATLAS. Мінімум `2`. |
| `source_name` | `agent` | Human source label для legacy combined payload. Source packets використовують імена collector'ів. |
| `verify_tls` | `true` | Перевіряти TLS certificate ATLAS. |
| `allow_insecure_http` | `false` | Дозволити `http://` ATLAS URL для локального тесту. |
| `enabled_collectors` | `["host"]` | Список або рядок через кому. Підтримуються: `host`, `docker`, `kubernetes`, `proxmox`. |
| `max_items_per_packet` | `450` | Локальний chunk size перед поділом source на кілька packets. |
| `max_packet_bytes` | `491520` | Локальний максимум розміру signed packet. |
| `max_packets_per_source` | `32` | Локальний safety limit chunks одного source. |
| `backoff_initial_seconds` | `30` | Початкова retry-затримка після помилки. |
| `backoff_max_seconds` | `900` | Максимальна retry-затримка. |
| `backoff_jitter` | `0.2` | Випадковий jitter ratio від `0.0` до `1.0`. |
| `docker_socket` | auto | Docker Unix socket. Auto-detect: `/var/run/docker.sock` і Docker Desktop `~/.docker/run/docker.sock`. |
| `docker_host` | empty | Опційний Docker HTTP(S) API endpoint. Використовуйте обережно. |
| `docker_timeout` | `timeout` або `10` | Timeout Docker API. |
| `kubernetes_api_url` | in-cluster env | URL Kubernetes API. In-cluster agent може брати service environment variables. |
| `kubernetes_allow_insecure_http` | `false` | Дозволити HTTP Kubernetes API URL. Лише lab. |
| `kubernetes_token` | empty | Kubernetes bearer token. |
| `kubernetes_token_file` | service account token | Шлях до token file. |
| `kubernetes_ca_cert` | service account CA | Шлях до CA certificate. |
| `kubernetes_namespaces` | service namespace або `default` | Namespaces для збору. Рядок або список. |
| `kubernetes_all_namespaces` | `false` | Збирати всі namespaces. Потребує прав. |
| `kubernetes_verify_tls` | `verify_tls` | Перевіряти TLS Kubernetes. |
| `kubernetes_timeout` | `timeout` або `20` | Timeout Kubernetes API. |
| `kubernetes_limit` | `500` | Kubernetes API list limit. |
| `proxmox_api_url` | required для Proxmox | Proxmox API URL, зазвичай `https://pve-host:8006`. |
| `proxmox_allow_insecure_http` | `false` | Дозволити HTTP Proxmox URL. Лише lab. |
| `proxmox_token_id` | required для Proxmox | Повний token id, наприклад `atlas@pve!discovery`. |
| `proxmox_token_secret` | required для Proxmox | Proxmox token secret. |
| `proxmox_nodes` | `[]` | Опційний allow-list node'ів. Порожньо означає всі видимі node'и. |
| `proxmox_include_ipv6` | `false` | Включати guest IPv6 addresses. |
| `proxmox_verify_tls` | `verify_tls` | Перевіряти TLS certificate Proxmox. |
| `proxmox_ca_cert` | empty | Опційний шлях до Proxmox CA certificate. |
| `proxmox_timeout` | `timeout` або `20` | Timeout Proxmox API. |

## Запуск

Надіслати один snapshot і вийти:

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Надрукувати signed packets без надсилання:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Запустити постійно:

```bash
python3 atlas_agent.py --config atlas-agent.json
```

Long-running режим спить `interval` секунд після успішних runs. При помилках використовується exponential backoff з jitter і враховується `Retry-After` від ATLAS.

## Приклад systemd

Приклад layout:

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

Якщо Docker collector використовує `/var/run/docker.sock`, service user має мати доступ до socket, зазвичай через групу `docker`. Це сильний локальний доступ.

## Collector: Host

Рекомендований майже в кожному config:

```json
{
  "enabled_collectors": ["host"]
}
```

Збирає:

- hostname і FQDN
- primary IPv4
- MAC
- OS name з `/etc/os-release`, macOS або Windows де доступно
- kernel label
- machine architecture
- версію ATLAS agent
- версії Docker і Docker Compose, якщо доступні CLI commands

Host collector дає ATLAS стабільну ідентичність пристрою і допомагає об'єднувати local host data з Proxmox hardware data тієї ж node.

## Collector: Docker

Використовуйте, коли агент запускається на Docker host:

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

Збирає:

- Docker version і API version
- Docker Compose version якщо доступна
- containers з `/containers/json?all=1`
- inspect data для кожного container
- container name, image, state, created/started/finished timestamps
- exposed і published ports
- labels
- networks, container IP, MAC і network id

Source IDs надають перевагу стабільним іменам контейнерів (`docker:name:<name>`), щоб пересоздані контейнери оновлювали наявні discovery records, а не створювали дублікати.

Важливо: Docker socket майже дорівнює root-level local access. Краще використовувати local Unix socket і не відкривати Docker TCP у недовірені мережі.

## Collector: Kubernetes

In-cluster приклад:

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

Out-of-cluster приклад:

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

Збирає:

- Kubernetes server version
- Pods
- Services
- namespace/name, UID, labels, owners
- Pod phase, Pod IP, host IP, node name
- container images, readiness count, restart count, start time
- Service type, ClusterIP, external IPs, selectors, ports

Потрібні permissions:

- `get/list` Pods
- `get/list` Services
- у кожному configured namespace або cluster-wide при `kubernetes_all_namespaces: true`

Краще явно вказувати `kubernetes_namespaces`, якщо cluster-wide discovery не потрібен.

## Collector: Proxmox

Приклад:

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

Як створити Proxmox token:

1. Створіть або виберіть restricted Proxmox user, наприклад `atlas@pve`.
2. Створіть API token, наприклад `discovery`.
3. Використайте повний token id: `atlas@pve!discovery`.
4. Скопіюйте token secret у `proxmox_token_secret`.
5. Дайте token read-only permissions на nodes/VMs/LXCs, які збирає ATLAS.

Збирає hypervisor/node data:

- node name і status
- Proxmox version у вигляді `Proxmox Virtual Environment <version>`
- kernel у вигляді `Linux <release>`
- CPU usage, CPU model, socket/core count
- RAM usage
- load average
- physical disk list і sizes

Збирає VM/LXC data:

- node, VMID, type, template flag, status, tags
- vCPU/RAM/disk allocation
- configured disks
- MAC address
- guest IPs з QEMU Guest Agent якщо доступні
- fallback IP/MAC з VM/LXC config де доступно
- VM OS/kernel з QEMU Guest Agent `get-osinfo` якщо доступно
- LXC OS label з `ostype` де доступно

Нотатки щодо guest IP:

- QEMU Guest Agent надає VM IP і OS data, коли він встановлений і ввімкнений.
- Collector ігнорує внутрішні guest interfaces на кшталт `lo`, `docker0`, `br-*`, `veth*`, `cni0`, `flannel*` і подібні CNI/Docker interfaces.
- Guest IPv6 пропускаються, якщо не увімкнено `proxmox_include_ipv6`.

TLS:

- Краще встановити Proxmox CA і вказати `proxmox_ca_cert`.
- Для lab із self-signed certificate можна поставити `proxmox_verify_tls: false`, але це менш безпечно.

## Змішані collectors

Collectors можна комбінувати:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Саме collectors визначають, що збирається. Тип агента в ATLAS — це UI-класифікація і сам по собі не обмежує local config.

## Data Policy в ATLAS

ATLAS може зберігати різний обсяг metadata залежно від discovery policy:

- runtime data
- labels
- network data
- raw metadata
- preview visibility
- create-on-discovery behavior

Якщо значення є в `--print-payload`, але його не видно в UI, перевірте agent або global discovery data policy в ATLAS.

Debug view може показати збережені raw fields і дозволяє переносити поля між visible та hidden lists для кожної сутності.

## Troubleshooting

Спочатку використовуйте `--print-payload`:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

Типові проблеми:

- `atlas_url must use https`: використовуйте HTTPS або поставте `allow_insecure_http: true` лише для локального тесту.
- `Config value 'agent_token' is required`: token не скопійовано в config.
- `ATLAS rejected snapshot: HTTP 401/403`: неправильний token, revoked token, неправильний agent id або IP/CIDR restriction.
- `Docker socket was not found`: вкажіть `docker_socket`, запускайте на Docker host або перевірте permissions.
- `Kubernetes token was not found`: вкажіть `kubernetes_token`, `kubernetes_token_file` або запускайте in-cluster з mounted service account.
- `Proxmox API returned HTTP 401/403`: перевірте token id, token secret і Proxmox permissions.
- немає VM IP з Proxmox: встановіть/увімкніть QEMU Guest Agent або налаштуйте static IP metadata в Proxmox де можливо.
- packet too large: зменште `max_items_per_packet` або raw metadata policy в ATLAS.

## Безпека

- Тримайте `atlas-agent.json` приватним. У ньому secrets.
- Використовуйте HTTPS для ATLAS і API endpoints.
- Використовуйте read-only Proxmox tokens.
- Обмежуйте Kubernetes service accounts потрібними namespaces.
- Вважайте Docker socket привілейованим локальним доступом.
- Ротуйте agent token, якщо config було розкрито.
- Використовуйте allowed IP/CIDR restrictions в ATLAS, якщо агенти мають стабільний egress address.

## Чого немає в поточному агенті

Це навмисно винесено за межі поточного Python agent:

- SNMP polling
- MQTT integration
- generic port scanning
- full hardware inventory через SSH
- ручне IoT object management

Можливі майбутні collectors: Podman, libvirt/KVM, ESXi, XCP-ng, service checks або глибший hardware inventory.
