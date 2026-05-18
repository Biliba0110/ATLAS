# ATLAS

Мовні версії: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS — self-hosted IPAM, мережевий реєстр і легка discovery-консоль для home lab, невеликих команд і внутрішньої інфраструктури.

Проєкт легко запускати: один Python-сервер, одна SQLite-база, браузерний UI і опційні push-агенти для динамічного inventory.

## Що входить в ATLAS

- керування підмережами з `CIDR`, нотатками, діапазонами й опційними групами доступу
- іменовані IP-діапазони всередині підмереж
- пристрої та сервіси з IP, MAC, портами, URL, типами, нотатками й історією
- підбір вільного IP за базою та опційним `ping`
- виявлення конфліктів IP
- багатокористувацький доступ з ролями `admin`, `editor`, `viewer`
- групи доступу для обмеження видимості підмереж
- імпорт, експорт і повний backup екземпляра
- опційне discovery через push-агенти для host, Docker, Kubernetes і Proxmox
- discovery preview, зіставлення з реєстром, debug-перегляд і політики create-on-discovery

## Швидкий старт

Запустіть сервер:

```bash
python3 server.py
```

Відкрийте:

- `http://localhost:4173`
- `http://<server-ip>:4173`

На чистій базі ATLAS створює bootstrap-акаунт:

- логін: `Admin`
- пароль: `Atlas`

Після першого входу пароль потрібно змінити.

## Типовий сценарій

1. Додайте підмережі.
2. Додайте групи діапазонів, якщо в підмережі є зони на кшталт DHCP, servers, VPN, lab або IoT.
3. Додайте пристрої й сервіси вручну або увімкніть discovery-агенти.
4. Використовуйте пошук, фільтри, деталі в реєстрі та історію, щоб бачити зміни.
5. Експортуйте CSV/JSON для звітів або робіть повний backup перед міграціями.

## Користувачі та доступ

Ролі:

- `admin`: повний доступ, користувачі, групи доступу, налаштування, імпорт/експорт, discovery policy
- `editor`: читання й запис дозволеного inventory
- `viewer`: лише читання дозволеного inventory

Групи доступу керують видимістю:

- публічні підмережі видимі всім авторизованим користувачам
- обмежені підмережі видимі лише призначеним групам
- адміністратори бачать усе

## Ping — це не discovery

ATLAS може використовувати `ping` як сигнал зайнятості адреси. Він не сканує порти, не визначає пристрої та не обходить мережу.

Використовуйте ping для:

- безпечнішого підбору вільного IP
- швидкої перевірки підмережі
- виявлення адрес, які вже можуть бути зайняті

Рекомендації:

- вмикайте auto-ping лише для мереж, досяжних із сервера ATLAS
- вимикайте його для віддалених, фільтрованих або ізольованих мереж, де ICMP ненадійний

## Динамічне виявлення

ATLAS приймає підписані snapshots від опційних outbound-only Python-агентів. Серверу не потрібен вхідний доступ до Docker, Kubernetes, Proxmox або віддалених хостів.

Поточні collector'и агента:

- `host`: локальна ідентичність хоста, OS, kernel, primary IP, MAC, версія агента, версії Docker/Compose якщо доступні
- `docker`: контейнери, images, стан, exposed/published ports, labels, networks, timestamps
- `kubernetes`: Pods і Services, namespaces, IP, ports, labels, owners, images, версія Kubernetes
- `proxmox`: гіпервізори, VM/LXC inventory, CPU/RAM/load, disks, guest IP/MAC, версія Proxmox, guest OS якщо доступна

За замовчуванням discovery працює через preview. Виявлений об'єкт можна:

- зіставити з наявним пристроєм або сервісом
- переглянути в Discovery
- створити вручну з preview
- створювати автоматично лише якщо для довіреного агента явно увімкнена політика create-on-discovery

ATLAS об'єднує пов'язані discovery-дані в UI, де це можливо. Наприклад, host-агент на Proxmox node і Proxmox hardware data тієї ж node показуються як одна зрозуміла сутність.

Discovery Debug показує збережені raw metadata, фільтрує за агентом/kind і дозволяє вручну обирати, які raw keys видимі або приховані для кожної сутності.

## Безпека discovery

- agent token показується один раз і зберігається лише як hash
- кожен snapshot містить schema key, timestamp, nonce, run id, packet info і HMAC signature
- nonce захищає від простого replay
- агента можна обмежити allowed IP/CIDR в ATLAS
- exported agent definitions не містять token secrets
- зберігання raw metadata керується data policy

## Налаштування агента

Детальна документація агента: [agent/README.uk.md](agent/README.uk.md).

Коротко:

1. Відкрийте ATLAS як адміністратор.
2. Перейдіть у `Інтеграції -> Discovery -> Agents`.
3. Створіть агента й скопіюйте config, поки token видимий.
4. Розмістіть `agent/atlas_agent.py` і `atlas-agent.json` на машині, яка має надсилати inventory.
5. Перевірте:

```bash
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once --print-payload
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once
```

6. Запустіть постійно через `systemd`, Docker, cron wrapper або інший supervisor.

## Імпорт, експорт і backup

Підтримувані експорти:

- `JSON`: snapshot стану ATLAS
- `CSV`: окремі вивантаження підмереж, груп діапазонів, пристроїв і сервісів
- `Backup ATLAS`: повний backup для відновлення або міграції

Використовуйте full backup, якщо потрібно зберегти користувачів, групи доступу, налаштування, discovery agents і policies.

## Зберігання даних

ATLAS зберігає стан у SQLite.

- шлях до бази за замовчуванням: `data/atlas.db`
- база створюється автоматично
- шлях можна змінити через `ATLAS_DB_PATH`
- перед оновленнями й експериментами робіть backup бази або вбудований full backup

## Конфігурація сервера

Змінні середовища:

| Змінна | За замовчуванням | Опис |
| --- | --- | --- |
| `ATLAS_HOST` | `0.0.0.0` | Bind address. |
| `ATLAS_PORT` | `4173` | HTTP-порт. |
| `ATLAS_DB_PATH` | `data/atlas.db` | Шлях до SQLite-бази. |
| `ATLAS_SCAN_INTERVAL` | `90` | Інтервал фонового ping у секундах. |
| `ATLAS_SCAN_TIMEOUT_MS` | `1000` | Timeout одного ping. |
| `ATLAS_SCAN_CONCURRENCY` | `32` | Кількість паралельних ping workers. |
| `ATLAS_HISTORY_LIMIT` | `200` | Кількість записів історії для UI. |
| `ATLAS_SESSION_TTL_SECONDS` | `1209600` | Час життя сесії, за замовчуванням 14 днів. |
| `ATLAS_DISCOVERY_MAX_BODY_BYTES` | `524288` | Максимальний HTTP body одного discovery packet. |
| `ATLAS_DISCOVERY_MAX_ITEMS` | `500` | Максимум discovery items в одному packet. |
| `ATLAS_DISCOVERY_MAX_RAW_BYTES` | `16384` | Максимум raw metadata на item/host/metadata block. |
| `ATLAS_DISCOVERY_MAX_PACKETS_PER_RUN` | `128` | Максимум packets в одному discovery run. |
| `ATLAS_DISCOVERY_RETRY_AFTER_SECONDS` | `30` | Retry hint при тимчасовій відмові discovery. |

Приклад:

```bash
ATLAS_PORT=4180 ATLAS_DB_PATH=/srv/atlas/atlas.db python3 server.py
```

## Файли проєкту

- `server.py`: HTTP server, API, auth, SQLite, ping, discovery ingestion
- `index.html`: оболонка застосунку
- `app.js`: клієнтська логіка
- `styles.css`: стилі
- `i18n.js`: рядки UI англійською, українською та російською
- `agent/atlas_agent.py`: опційний Python discovery agent
- `agent/atlas-agent.example.json`: шаблон config агента
- `group-suggestion-templates.json`: вбудовані шаблони груп діапазонів
- `data/`: локальна директорія даних за замовчуванням
