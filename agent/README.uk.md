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
- `interval`: як часто агент надсилає дані в ATLAS, у секундах; мінімум `15`.
- `timeout`: HTTP timeout надсилання packets в ATLAS, типово `20`.
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
- `proxmox_include_ipv6`: надсилати IPv6 guest addresses; за замовчуванням `false`.
- `proxmox_verify_tls`: перевіряти TLS certificates Proxmox.

Для локального тесту з `http://127.0.0.1:4173` увімкніть `allow_insecure_http`.

## Налаштування в ATLAS

1. Відкрийте ATLAS під адміністратором.
2. Перейдіть в Інтеграції -> Discovery -> Agents & Policy.
3. Створіть агента та виберіть потрібні колектори.
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

## Рецепти налаштування колекторів

Майже завжди залишайте `host` увімкненим. Він визначає сервер, на якому працює агент,
і дає ATLAS стабільний батьківський запис для сервісів, контейнерів, VM/LXC і майбутньої карти.

### Тільки host

Використовуйте, якщо потрібно бачити лише сам сервер з агентом.

```json
{
  "enabled_collectors": ["host"]
}
```

Обов'язкові поля:

- `atlas_url`
- `agent_id`
- `agent_token`
- `enabled_collectors`

Host collector надсилає hostname, FQDN, основний IP, MAC, system/machine,
версію агента та інтервал надсилання.

### Docker host

Використовуйте, якщо агент запускається на тому самому сервері, де працює Docker.

```json
{
  "enabled_collectors": ["host", "docker"],
  "docker_socket": "/var/run/docker.sock",
  "docker_timeout": 10
}
```

Що налаштувати:

- `docker_socket`: найкращий варіант для Linux-серверів. Зазвичай `/var/run/docker.sock`.
- `docker_host`: опціональний TCP/HTTP endpoint. Використовуйте лише у довіреній мережі і тільки
  якщо Docker API явно потрібен по мережі.

Важливо щодо безпеки: доступ до Docker socket майже дорівнює локальному root-доступу. Краще використовувати
локальний socket, а не Docker TCP. Не відкривайте Docker TCP в інтернет.

Docker надсилає контейнери, ім'я, image, статус, labels якщо policy дозволяє, exposed/published ports,
networks/IP якщо policy дозволяє, timestamps і last seen. Для source tracking ATLAS використовує стабільне
ім'я контейнера, тому контейнер, перестворений Watchtower, має замінити старий discovery object,
а не створити дублікат.

### Proxmox / PVE

Використовуйте, якщо агент може дістатися до Proxmox API. Агент може працювати прямо на PVE node
або на іншому довіреному сервері, якому доступний `https://pve-host:8006`.

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

Де взяти значення Proxmox:

1. У Proxmox створіть окремого користувача, наприклад `atlas@pve`, або використайте обмеженого користувача.
2. Створіть API token для цього користувача, наприклад з іменем `discovery`.
3. Повний token id виглядатиме як `atlas@pve!discovery`.
4. Token secret показується один раз. Скопіюйте його в `proxmox_token_secret`.
5. `proxmox_api_url` зазвичай виглядає як `https://<pve-host-or-ip>:8006`.

Рекомендовані права Proxmox:

- достатньо read-only доступу;
- обмежте scope datacenter'ом або лише потрібними node'ами;
- collector читає cluster resources, VM/LXC status, VMID, node, name, type та IP, якщо вони доступні
  через guest agent або config metadata.

Поширені нюанси PVE:

- Якщо у Proxmox self-signed certificate, встановіть CA і вкажіть `proxmox_ca_cert`,
  або для lab тимчасово поставте `proxmox_verify_tls: false`.
- `proxmox_nodes: []` означає всі node'и, видимі token'у.
- `proxmox_nodes: ["pve1"]` обмежить збір конкретними node'ами.
- IP віртуальних машин найкраще з'являються, коли у VM увімкнено QEMU Guest Agent і guest agent встановлено всередині ОС.
- За замовчуванням Proxmox collector не надсилає IPv6 і пропускає guest interfaces на кшталт `docker0`,
  `br-*`, `veth*`, `cni0`, щоб не засмічувати ATLAS внутрішніми Docker/CNI адресами з VM.

### Kubernetes

Використовуйте, якщо агент працює всередині Kubernetes cluster або на хості, який має доступ до Kubernetes API.

Config всередині cluster:

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

Config ззовні cluster:

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

Token Kubernetes має мати read-доступ до:

- pods
- services
- потрібних namespaces

Для всіх namespaces:

```json
{
  "kubernetes_all_namespaces": true
}
```

Вмикайте це лише якщо service account має потрібні права і вам справді потрібна видимість усього cluster.
Інакше краще явно вказати `kubernetes_namespaces`.

### Змішаний сервер

Колектори можна комбінувати, якщо сервер виконує кілька ролей:

```json
{
  "enabled_collectors": ["host", "docker", "proxmox"]
}
```

Саме collectors визначають, що агент збирає. Тип агента в ATLAS — це опис для інтерфейсу:
`Hypervisor` може бути віддаленим, а `External` може збирати Docker або Proxmox, якщо це увімкнено в config.

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
Кожен packet також повідомляє налаштування надсилання в `payload.metadata.agentTiming`:
`sendIntervalSeconds` з config `interval` і `requestTimeoutSeconds` з config `timeout`.
ATLAS зберігає це як read-only runtime info, щоб було видно, як часто агент надсилає дані.
В основній таблиці агентів ATLAS показує лише інтервал надсилання. Доступність рахується від
`sendIntervalSeconds`: `UP <= interval + 20 сек.`, `PENDING <= interval * 2 + 75 сек.`,
далі `DOWN`.

Якщо ATLAS недоступний або відхиляє packet, long-running агент використовує exponential backoff
з jitter і враховує `Retry-After`, повернений ATLAS.

## Shared Tokens

Кілька серверів можуть використовувати один token лише якщо кожен сервер має унікальний `agent_id` в ATLAS.
Так ATLAS розділяє stale/orphan state за серверами, але все ще дозволяє робити групи token'ів на кшталт
`internal` або `external`.

## Поточні Collector'и

- `host`: hostname, FQDN, primary IP, MAC, system/machine.
- `docker`: containers, status, exposed/published ports, labels, networks/IP, image,
  created/started timestamps і last seen.
- `kubernetes`: Pods і Services з namespace/name, status, labels, ports, pod IP,
  node/host IP, images, owners, Service type/ClusterIP/external IPs і last seen.
- `proxmox`: PVE node/hypervisor resources з CPU/RAM/load/kernel/PVE version, а також
  VM/LXC resources з node, VMID, status, name, type, RAM, виділеними дисками, MAC
  і основним IP, якщо він доступний через guest agent або config metadata.

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
