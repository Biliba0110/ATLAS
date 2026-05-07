# ATLAS Python Agent MVP

Мовні версії: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

MVP-агент збирає локальні metadata хоста, Docker, Kubernetes і Proxmox та надсилає підписані discovery packets в ATLAS.
Кожен цикл збору отримує спільний `runId`, після чого агент надсилає окремі packets за `source`:
`host`, `docker`, `kubernetes`, `proxmox`, пізніше можуть з'явитися інші sources. ATLAS групує ці packets в один discovery run.

## Конфігурація

Скопіюйте `atlas-agent.example.json` в `atlas-agent.json` і налаштуйте:

- `atlas_url`: URL ATLAS. У реальному розгортанні використовуйте HTTPS.
- `agent_id`: ID агента, створений в ATLAS.
- `agent_token`: token, який ATLAS показує один раз.
- `interval`: інтервал snapshot у секундах, мінімум `15`.
- `source_name`: ім'я джерела пакета, типово `agent`.
- `max_items_per_packet`: максимум об'єктів в одному source packet, типово `450`.
- `max_packet_bytes`: локальний safety limit для одного signed packet, типово `491520`.
- `max_packets_per_source`: limit chunks для одного source, типово `32`.
- `backoff_initial_seconds`: базова затримка після першої помилки, типово `30`.
- `backoff_max_seconds`: максимальна затримка після помилок, типово `900`.
- `backoff_jitter`: випадковий розкид затримки від `0.0` до `1.0`, типово `0.2`.
- `enabled_collectors`: collector'и для запуску, наприклад `["host", "docker", "kubernetes", "proxmox"]`.
- `docker_socket`: шлях до Docker Unix socket. Типово агент може знайти `/var/run/docker.sock` і Docker Desktop `~/.docker/run/docker.sock`.
- `docker_host`: опціональний Docker TCP endpoint. Використовуйте лише якщо це явно потрібно.
- `kubernetes_api_url`: URL Kubernetes API. Для in-cluster агента часто можна не вказувати.
- `kubernetes_token` або `kubernetes_token_file`: service account token.
- `kubernetes_ca_cert`: CA-файл для Kubernetes API.
- `kubernetes_namespaces`: namespaces для збору, наприклад `["default", "apps"]`.
- `kubernetes_all_namespaces`: збирати всі namespaces, якщо token це дозволяє.
- `proxmox_api_url`: URL Proxmox API, наприклад `https://pve.local:8006`.
- `proxmox_token_id` і `proxmox_token_secret`: Proxmox API token, зберігається лише в конфігу агента.
- `proxmox_nodes`: опціональний allow-list node'ів, наприклад `["pve1", "pve2"]`; порожній список означає всі видимі node'и.
- `proxmox_verify_tls`: перевіряти TLS certificates Proxmox.

Для локального тесту з `http://127.0.0.1:4173` увімкніть `allow_insecure_http`.

## Налаштування в ATLAS

1. Відкрийте ATLAS під адміністратором.
2. Перейдіть у Settings -> Discovery.
3. Створіть агента.
4. Скопіюйте згенерований config, поки token видно.
5. Покладіть config на сервер, де працюватиме агент.
6. Залишайте `agent_id` унікальним для кожного сервера, навіть якщо кілька агентів використовують спільний token.

ATLAS зберігає лише hash token. Якщо config втрачено, виконайте rotate token і оновіть config агента.

Docker socket дає дуже широкі права. Вважайте його локальним root-level доступом і краще запускайте
агент поруч із Docker, а не відкривайте Docker TCP ports.

Proxmox tokens мають бути read-only і обмежені мінімальними правами для inventory VM/LXC.
Агент спочатку пробує мережеві дані QEMU guest agent, потім metadata з VM/LXC config,
і не виконує probe гостьових мереж.

Агент не збирає SNMP, MQTT або ручний IoT inventory. Це заплановано як окремі
налаштування integrations в ATLAS, а не як agent collectors.

## Запуск

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Надрукувати signed snapshot без відправлення:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

`--print-payload` виводить список signed source packets, які були б надіслані в межах одного run.

Великі sources діляться на кілька packets з одним `runId` і packet metadata
(`source`, `index`, `total`). ATLAS групує їх в один discovery run і чекає фінальний packet source,
перш ніж позначати зниклі об'єкти як stale.

Якщо ATLAS недоступний або відхиляє packet, long-running агент використовує exponential backoff
з jitter і враховує `Retry-After`, повернений ATLAS.

## Shared Tokens

Кілька серверів можуть використовувати один token лише якщо кожен сервер має унікальний `agent_id` в ATLAS.
Так ATLAS розділяє stale/orphan state за серверами, але все ще дозволяє робити групи token'ів на кшталт
`internal` або `external`.

## Поточні Collector'и

- `host`: hostname, FQDN, primary IP, MAC, OS/platform, Python version.
- `docker`: containers, status, exposed/published ports, labels, networks/IP, image,
  created/started timestamps і last seen.
- `kubernetes`: Pods і Services з namespace/name, status, labels, ports, pod IP,
  node/host IP, images, owners, Service type/ClusterIP/external IPs і last seen.
- `proxmox`: VM/LXC resources з node, VMID, status, name, type і IPs, якщо вони доступні
  через guest agent або config metadata.

## Заплановано окремо

Це навмисно не входить у поточний агент:

- `snmp`: планується як ATLAS-side integration з explicit targets і encrypted credentials.
- `mqtt`: планується як communication/integration channel.
- `iot`: залишається object model в ATLAS; дані мають приходити через майбутні integrations.

Можливі майбутні agent collectors:

- `podman`
- `libvirt` / `kvm`
- `lxc`
- `esxi`
- `xcp-ng`
- `services`
- `hardware`
