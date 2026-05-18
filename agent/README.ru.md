# ATLAS Python Agent MVP

Языковые версии: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

MVP-агент собирает локальные metadata хоста, Docker, Kubernetes и Proxmox и отправляет подписанные discovery packets в ATLAS.
Каждый цикл сбора получает общий `runId`, после чего агент отправляет отдельные packets по `source`:
`host`, `docker`, `kubernetes`, `proxmox`, позже могут появиться другие sources. ATLAS группирует эти packets в один discovery run.

## Конфигурация

Скопируйте `atlas-agent.example.json` в `atlas-agent.json` и настройте:

- `atlas_url`: URL ATLAS. В реальном развертывании используйте HTTPS.
- `agent_id`: ID агента, созданный в ATLAS.
- `agent_token`: token, который ATLAS показывает один раз.
- `interval`: как часто агент отправляет данные в ATLAS, в секундах; минимум `15`.
- `timeout`: HTTP timeout отправки packets в ATLAS, по умолчанию `20`.
- `source_name`: имя источника пакета, по умолчанию `agent`.
- `max_items_per_packet`: максимум объектов в одном source packet, по умолчанию `450`.
- `max_packet_bytes`: локальный лимит безопасности для одного signed packet, по умолчанию `491520`.
- `max_packets_per_source`: лимит chunks для одного source, по умолчанию `32`.
- `backoff_initial_seconds`: базовая задержка после первой ошибки, по умолчанию `30`.
- `backoff_max_seconds`: максимальная задержка после ошибок, по умолчанию `900`.
- `backoff_jitter`: случайный разброс задержки от `0.0` до `1.0`, по умолчанию `0.2`.
- `enabled_collectors`: collector'ы для запуска, например `["host", "docker", "kubernetes", "proxmox"]`.
- `docker_socket`: путь к Docker Unix socket. По умолчанию агент может найти `/var/run/docker.sock` и Docker Desktop `~/.docker/run/docker.sock`.
- `docker_host`: опциональный Docker TCP endpoint. Используйте только если это явно нужно.
- `kubernetes_api_url`: URL Kubernetes API. Для in-cluster агента часто можно не указывать.
- `kubernetes_token` или `kubernetes_token_file`: service account token.
- `kubernetes_ca_cert`: CA-файл для Kubernetes API.
- `kubernetes_namespaces`: namespaces для сбора, например `["default", "apps"]`.
- `kubernetes_all_namespaces`: собирать все namespaces, если token это разрешает.
- `proxmox_api_url`: URL Proxmox API, например `https://pve.local:8006`.
- `proxmox_token_id` и `proxmox_token_secret`: Proxmox API token, хранится только в конфиге агента.
- `proxmox_nodes`: опциональный allow-list node'ов, например `["pve1", "pve2"]`; пустой список означает все видимые node'ы.
- `proxmox_include_ipv6`: отправлять IPv6 guest addresses; по умолчанию `false`.
- `proxmox_verify_tls`: проверять TLS certificates Proxmox.

Для локального теста с `http://127.0.0.1:4173` включите `allow_insecure_http`.

## Настройка в ATLAS

1. Откройте ATLAS под администратором.
2. Перейдите в Интеграции -> Discovery -> Agents & Policy.
3. Создайте агента и выберите нужные коллекторы.
4. Скопируйте сгенерированный config, пока token виден.
5. Поместите config на сервер, где будет работать агент.
6. Оставляйте `agent_id` уникальным для каждого сервера, даже если несколько агентов используют общий token.

ATLAS хранит только hash token. Если config потерян, выполните rotate token и обновите config агента.

Docker socket дает очень широкие права. Считайте его локальным root-level доступом и лучше запускайте
агент рядом с Docker, а не открывайте Docker TCP ports.

Proxmox tokens должны быть read-only и ограничены минимальными правами для inventory VM/LXC.
Агент сначала пробует сетевые данные QEMU guest agent, затем metadata из VM/LXC config,
и не выполняет probe гостевых сетей.

Агент не собирает SNMP, MQTT или ручной IoT inventory. Это запланировано как отдельные
настройки integrations в ATLAS, а не как agent collectors.

## Рецепты настройки коллекторов

Почти всегда оставляйте `host` включенным. Он определяет сервер, на котором работает агент,
и дает ATLAS стабильную родительскую запись для сервисов, контейнеров, VM/LXC и будущей карты.

### Только host

Используйте, если нужно видеть только сам сервер с агентом.

```json
{
  "enabled_collectors": ["host"]
}
```

Обязательные поля:

- `atlas_url`
- `agent_id`
- `agent_token`
- `enabled_collectors`

Host collector отправляет hostname, FQDN, основной IP, MAC, system/machine,
версию агента и интервал отправки.

### Docker host

Используйте, если агент запускается на том же сервере, где работает Docker.

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

Что настроить:

- `docker_socket`: лучший вариант для Linux-серверов. Обычно `/var/run/docker.sock`.
- `docker_host`: опциональный TCP/HTTP endpoint. Используйте только в доверенной сети и только
  если Docker API явно нужен по сети.

Важно по безопасности: доступ к Docker socket почти равен локальному root-доступу. Лучше использовать
локальный socket, а не Docker TCP. Не открывайте Docker TCP в интернет.

Docker отправляет контейнеры, имя, image, статус, labels если policy разрешает, exposed/published ports,
networks/IP если policy разрешает, timestamps и last seen. Для source tracking ATLAS использует стабильное
имя контейнера, поэтому контейнер, пересозданный Watchtower, должен заменить старый discovery object,
а не создать дубликат.

### Proxmox / PVE

Используйте, если агент может достучаться до Proxmox API. Агент может работать прямо на PVE node
или на другом доверенном сервере, которому доступен `https://pve-host:8006`.

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

Где взять значения Proxmox:

1. В Proxmox создайте отдельного пользователя, например `atlas@pve`, или используйте ограниченного пользователя.
2. Создайте API token для этого пользователя, например с именем `discovery`.
3. Полный token id будет выглядеть как `atlas@pve!discovery`.
4. Token secret показывается один раз. Скопируйте его в `proxmox_token_secret`.
5. `proxmox_api_url` обычно выглядит как `https://<pve-host-or-ip>:8006`.

Рекомендуемые права Proxmox:

- достаточно read-only доступа;
- ограничьте scope datacenter'ом или только нужными node'ами;
- collector читает cluster resources, VM/LXC status, VMID, node, name, type и IP, если они доступны
  через guest agent или config metadata.

Частые нюансы PVE:

- Если у Proxmox self-signed certificate, установите CA и укажите `proxmox_ca_cert`,
  либо для lab временно поставьте `proxmox_verify_tls: false`.
- `proxmox_nodes: []` означает все node'ы, видимые token'у.
- `proxmox_nodes: ["pve1"]` ограничит сбор конкретными node'ами.
- IP виртуальных машин лучше всего появляются, когда в VM включен QEMU Guest Agent и guest agent установлен внутри ОС.
- По умолчанию Proxmox collector не отправляет IPv6 и пропускает guest interfaces вроде `docker0`,
  `br-*`, `veth*`, `cni0`, чтобы не засорять ATLAS внутренними Docker/CNI адресами из VM.

### Kubernetes

Используйте, если агент работает внутри Kubernetes cluster или на хосте, который имеет доступ к Kubernetes API.

Config внутри cluster:

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

Config снаружи cluster:

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

Token Kubernetes должен иметь read-доступ к:

- pods
- services
- нужным namespaces

Для всех namespaces:

```json
{
  "kubernetes_all_namespaces": true
}
```

Включайте это только если service account имеет нужные права и вам действительно нужна видимость всего cluster.
Иначе лучше явно указать `kubernetes_namespaces`.

### Смешанный сервер

Коллекторы можно комбинировать, если сервер выполняет несколько ролей:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Именно collectors определяют, что агент собирает. Тип агента в ATLAS — это описание для интерфейса:
`Hypervisor` может быть удаленным, а `External` может собирать Docker или Proxmox, если это включено в config.

## Запуск

```bash
python3 atlas_agent.py --config atlas-agent.json --once
```

Напечатать signed snapshot без отправки:

```bash
python3 atlas_agent.py --config atlas-agent.json --once --print-payload
```

`--print-payload` выводит список signed source packets, которые были бы отправлены в рамках одного run.

Большие sources делятся на несколько packets с одним `runId` и packet metadata
(`source`, `index`, `total`). ATLAS группирует их в один discovery run и ждет финальный packet source,
прежде чем помечать пропавшие объекты как stale.
Каждый packet также сообщает настройки отправки в `payload.metadata.agentTiming`:
`sendIntervalSeconds` из config `interval` и `requestTimeoutSeconds` из config `timeout`.
ATLAS хранит это как read-only runtime info, чтобы было видно, как часто агент отправляет данные.
В основной таблице агентов ATLAS показывает только интервал отправки. Доступность считается от
`sendIntervalSeconds`: `UP <= interval + 20 сек.`, `PENDING <= interval * 2 + 75 сек.`,
дальше `DOWN`.

Если ATLAS недоступен или отклоняет packet, long-running агент использует exponential backoff
с jitter и учитывает `Retry-After`, возвращенный ATLAS.

## Shared Tokens

Несколько серверов могут использовать один token только если каждый сервер имеет уникальный `agent_id` в ATLAS.
Так ATLAS разделяет stale/orphan state по серверам, но все еще позволяет делать группы token'ов вроде
`internal` или `external`.

## Текущие Collector'ы

- `host`: hostname, FQDN, primary IP, MAC, system/machine.
- `docker`: containers, status, exposed/published ports, labels, networks/IP, image,
  created/started timestamps и last seen.
- `kubernetes`: Pods и Services с namespace/name, status, labels, ports, pod IP,
  node/host IP, images, owners, Service type/ClusterIP/external IPs и last seen.
- `proxmox`: PVE node/hypervisor resources с CPU/RAM/load/kernel/PVE version, а также
  VM/LXC resources с node, VMID, status, name, type, RAM, выделенными дисками, MAC
  и основным IP, если он доступен через guest agent или config metadata.

## Запланировано отдельно

Это намеренно не входит в текущий агент:

- `snmp`: планируется как ATLAS-side integration с explicit targets и encrypted credentials.
- `mqtt`: планируется как communication/integration channel.
- `iot`: остается object model в ATLAS; данные должны приходить через будущие integrations.

Возможные будущие agent collectors:

- `podman`
- `libvirt` / `kvm`
- `lxc`
- `esxi`
- `xcp-ng`
- `services`
- `hardware`
