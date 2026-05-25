# ATLAS

Языковые версии: [English](README.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

ATLAS — self-hosted IPAM, реестр сети и лёгкая discovery-консоль для home-lab, небольших команд и внутренней инфраструктуры.

Проект запускается просто: один Python-сервер, одна SQLite-база, браузерный интерфейс и опциональные push-агенты для динамического inventory.

## Что входит в ATLAS

- управление подсетями с `CIDR`, заметками, диапазонами и опциональными группами доступа
- именованные IP-диапазоны внутри подсетей
- устройства и сервисы с IP, MAC, портами, URL, типами, заметками и историей
- Network Map топология на базе IPAM и discovery
- подбор свободного IP по базе и опциональному `ping`
- обнаружение конфликтов IP
- многопользовательский доступ с ролями `admin`, `editor`, `viewer`
- группы доступа для ограничения видимости подсетей
- импорт, экспорт и полный backup экземпляра
- опциональное discovery через push-агенты для host, Docker, Kubernetes и Proxmox
- preview discovery, сопоставление с реестром, debug-просмотр и политики create-on-discovery

## Быстрый старт

Запустите сервер:

```bash
python3 server.py
```

Откройте:

- `http://localhost:4173`
- `http://<server-ip>:4173`

На чистой базе ATLAS создаёт bootstrap-аккаунт:

- логин: `Admin`
- пароль: `Atlas`

После первого входа пароль нужно сменить.

## Типовой сценарий

1. Добавьте подсети.
2. Добавьте группы диапазонов, если внутри подсети есть зоны вроде DHCP, servers, VPN, lab или IoT.
3. Добавьте устройства и сервисы вручную или включите discovery-агентов.
4. Используйте поиск, фильтры, детали в реестре и историю, чтобы понимать изменения.
5. Экспортируйте CSV/JSON для отчётов или делайте полный backup перед переносом и экспериментами.

## Пользователи и доступ

Роли:

- `admin`: полный доступ, пользователи, группы доступа, настройки, импорт/экспорт, discovery policy
- `editor`: чтение и запись разрешённого inventory
- `viewer`: только чтение разрешённого inventory

Группы доступа управляют видимостью:

- публичные подсети видны всем авторизованным пользователям
- ограниченные подсети видны только назначенным группам
- администраторы видят всё

## Ping — это не discovery

ATLAS может использовать `ping` как сигнал занятости адреса. Он не сканирует порты, не определяет устройства и не обходит сеть.

Используйте ping для:

- более безопасного подбора свободного IP
- быстрой проверки подсети
- обнаружения адресов, которые уже могут быть заняты

Рекомендации:

- включайте auto-ping только для сетей, достижимых с сервера ATLAS
- отключайте его для удалённых, фильтруемых или изолированных сетей, где ICMP ненадёжен

## Динамическое обнаружение

ATLAS принимает подписанные snapshots от опциональных outbound-only Python-агентов. Серверу не нужен входящий доступ к Docker, Kubernetes, Proxmox или удалённым хостам.

Текущие collector'ы агента:

- `host`: локальная идентичность хоста, OS, kernel, primary IP, MAC, версия агента, версии Docker/Compose если доступны
- `docker`: контейнеры, images, состояние, exposed/published ports, labels, networks, timestamps
- `kubernetes`: Pods и Services, namespaces, IP, ports, labels, owners, images, версия Kubernetes
- `proxmox`: гипервизоры, VM/LXC inventory, CPU/RAM/load, disks, guest IP/MAC, версия Proxmox, guest OS если доступна

По умолчанию discovery работает через preview. Обнаруженный объект можно:

- сопоставить с существующим устройством или сервисом
- посмотреть в Discovery
- создать вручную из preview
- создавать автоматически только если для доверенного агента явно включена политика create-on-discovery

ATLAS объединяет связанные discovery-данные в интерфейсе, где это возможно. Например, host-агент на Proxmox node и Proxmox hardware data той же node показываются как одна понятная сущность, а не как две дублирующиеся записи.

Подмена обновлённых Docker-контейнеров включена по умолчанию для Watchtower/recreate сценариев: если контейнер сохранил имя на том же связанном хосте, ATLAS обновит identity существующего сервиса вместо старого дубля. Администратор может выключить это в `Интеграции -> Discovery -> Agents & Policy -> Data Policy`.

Массовая очистка устаревших удаляет stale preview rows, опциональные agent-owned записи реестра и audit events, связанные с удалёнными rows, оставляя само событие cleanup в аудите.

Discovery Debug умеет показывать сохранённые raw metadata, фильтровать по агенту/kind и вручную выбирать, какие raw keys видимы или скрыты для каждой сущности.

## Network Map

Network Map — это topology-слой версии 0.4. Он строит граф инфраструктуры из IPAM-записей, сервисов и discovery-results.

В UI есть:

- режимы simple и advanced
- фильтры по subnet, layer, source и status
- SVG-граф с масштабом
- отдельные карточки контекста подсетей
- цветные связи сети, гипервизоров, Kubernetes и host-to-service
- видимость слоёв по capabilities текущего пользователя

Topology API:

```text
GET /api/topology
```

Ответ содержит:

- `nodes`: нормализованные объекты `subnet`, `core-router`, `switch`, `host`, `service`, `container`, `hypervisor`, `vm`, `lxc`, `kubernetes-service`, `kubernetes-pod`, `kubernetes-workload`, `iot`
- `links`: связи с `source`, `target`, `kind`, `confidence`, `graphSource`
- `interfaces`: адреса узлов с IP, MAC, subnet, confidence и source metadata
- `capabilities`: доступные слои и advanced mode для текущего пользователя

Поддерживаемые связи:

- `core-subnet`: core router является якорем подсети
- `subnet-member`: подсеть содержит host, service, workload или IoT object
- `core-member`: membership подсети в UI показан через core router
- `host-service`: host предоставляет service/container
- `hypervisor-guest`: Proxmox hypervisor содержит VM/LXC
- `kubernetes-service-workload`: Kubernetes Service selector совпал с Pod/workload

`confidence` может быть `high`, `medium`, `low`. `graphSource` может быть `manual`, `ipam`, `discovery`, `inferred`.

Карта строится автоматически. Ручное редактирование карты, pinned positions и manual topology overrides лучше вынести в следующую версию.

## Безопасность discovery

- agent token показывается один раз и хранится только как hash
- каждый snapshot содержит schema key, timestamp, nonce, run id, packet info и HMAC signature
- nonce защищает от простого replay
- агента можно ограничить allowed IP/CIDR в ATLAS
- exported agent definitions не содержат token secrets
- хранение raw metadata управляется data policy

## Настройка агента

Подробная документация агента находится в [agent/README.ru.md](agent/README.ru.md).

Коротко:

1. Откройте ATLAS под администратором.
2. Перейдите в `Интеграции -> Discovery -> Agents`.
3. Создайте агента и скопируйте config, пока token виден.
4. Поместите `agent/atlas_agent.py` и `atlas-agent.json` на машину, которая должна отправлять inventory.
5. Проверьте:

```bash
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once --print-payload
python3 agent/atlas_agent.py --config agent/atlas-agent.json --once
```

6. Запустите постоянно через `systemd`, Docker, cron wrapper или другой supervisor.

## Импорт, экспорт и backup

Поддерживаемые экспорты:

- `JSON`: snapshot состояния ATLAS
- `CSV`: отдельные выгрузки подсетей, групп диапазонов, устройств и сервисов
- `Backup ATLAS`: полный backup для восстановления или миграции

Используйте full backup, если нужно сохранить пользователей, группы доступа, настройки, discovery agents и policies.

## Хранение данных

ATLAS хранит состояние в SQLite.

- путь к базе по умолчанию: `data/atlas.db`
- база создаётся автоматически
- путь можно изменить через `ATLAS_DB_PATH`
- перед обновлениями и экспериментами делайте backup базы или встроенный full backup

## Конфигурация сервера

Переменные окружения:

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `ATLAS_HOST` | `0.0.0.0` | Адрес bind. |
| `ATLAS_PORT` | `4173` | HTTP-порт. |
| `ATLAS_DB_PATH` | `data/atlas.db` | Путь к SQLite-базе. |
| `ATLAS_SCAN_INTERVAL` | `90` | Интервал фонового ping в секундах. |
| `ATLAS_SCAN_TIMEOUT_MS` | `1000` | Таймаут одного ping. |
| `ATLAS_SCAN_CONCURRENCY` | `32` | Количество параллельных ping workers. |
| `ATLAS_HISTORY_LIMIT` | `200` | Количество записей истории, возвращаемых UI. |
| `ATLAS_SESSION_TTL_SECONDS` | `1209600` | Время жизни сессии, по умолчанию 14 дней. |
| `ATLAS_DISCOVERY_MAX_BODY_BYTES` | `524288` | Максимальный HTTP body одного discovery packet. |
| `ATLAS_DISCOVERY_MAX_ITEMS` | `500` | Максимум discovery items в одном packet. |
| `ATLAS_DISCOVERY_MAX_RAW_BYTES` | `16384` | Максимум raw metadata на item/host/metadata block. |
| `ATLAS_DISCOVERY_MAX_PACKETS_PER_RUN` | `128` | Максимум packets в одном discovery run. |
| `ATLAS_DISCOVERY_RETRY_AFTER_SECONDS` | `30` | Retry hint при временном отказе discovery. |

Пример:

```bash
ATLAS_PORT=4180 ATLAS_DB_PATH=/srv/atlas/atlas.db python3 server.py
```

## Тесты

Полный regression suite запускается так:

```bash
python3 -m unittest discover -s tests
```

Или можно запускать отдельные suites:

```bash
python3 -m unittest tests.test_topology
python3 -m unittest tests.test_discovery_integrity
```

Fixtures проверяют связи subnet-to-host, host-to-service, Proxmox hypervisor-to-VM/LXC, Kubernetes Service-to-Pod, IoT-to-subnet, различия capabilities для admin/viewer, Docker host-scoped replacement, защиту Watchtower recreate и очистку stale discovery audit.

## Файлы проекта

- `server.py`: HTTP server, API, auth, SQLite, ping, discovery ingestion
- `index.html`: оболочка приложения
- `app.js`: клиентская логика
- `styles.css`: стили
- `i18n.js`: строки UI на английском, украинском и русском
- `agent/atlas_agent.py`: опциональный Python discovery agent
- `agent/atlas-agent.example.json`: шаблон config агента
- `group-suggestion-templates.json`: встроенные шаблоны групп диапазонов
- `data/`: локальная директория данных по умолчанию
