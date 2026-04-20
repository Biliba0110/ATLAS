# ATLAS Product Vision

## Слоган

Русский:
`ATLAS — инфраструктура под контролем, без лишней сложности.`

English:
`ATLAS — infrastructure under control, without unnecessary complexity.`

Альтернативный вариант:

Русский:
`ATLAS — ясная карта сети, гибкая платформа роста.`

English:
`ATLAS — a clear map of the network, a flexible platform for growth.`

## Видение

ATLAS должен стать платформой управления сетью и инфраструктурой, которая:

- остается легкой и понятной для home-lab
- не перегружает пользователя обязательными сущностями и процессами
- масштабируется до production и small enterprise without replatforming
- позволяет включать только нужные возможности
- не навязывает функционал, который пользователь не использует

Ключевой принцип продукта:

`Простота по умолчанию, мощность по требованию.`

## Позиционирование

ATLAS находится между двумя крайностями:

- простые таблицы и самописные списки IP без истории, ролей и автоматизации
- тяжелые системы вроде NetBox, где много обязательной структуры, сущностей и enterprise-логики уже на старте

ATLAS должен выигрывать не количеством экранов и сущностей, а качеством пользовательского опыта:

- быстрее старт
- меньше перегруза
- понятнее интерфейс
- легче кастомизация
- модульность без принуждения

## Для кого ATLAS

### Home-lab

- учет подсетей, диапазонов и устройств
- проверка занятости адресов
- контейнеры, хосты, IoT без enterprise-перегруза
- минимальный интерфейс без обязательных сложных моделей

### SMB / production

- роли и группы доступа
- история и аудит
- интеграции и автоматическое обновление состояния
- уведомления, резервирование, API, бэкапы

### Future enterprise

- отключаемые модули
- интеграции по требованию
- серверные настройки пользователей
- подготовка к SSO, HA, plugin architecture и policy-driven workflows

## Принципы продукта

### 1. Не навязывать сущности

Если пользователю не нужны стойки, VLAN, визуализация, интеграции или контейнеры, он не должен видеть это в интерфейсе.

### 2. Интерфейс от сценариев, а не от базы данных

Пользователь приходит не "посмотреть таблицу устройств", а:

- найти свободный IP
- проверить конфликт
- увидеть изменения
- понять, что происходит в его зоне ответственности
- быстро перейти к нужному объекту

### 3. Развитие слоями

ATLAS должен развиваться слоями:

- `Core`
- `Optional capabilities`
- `Future modules`

### 4. Разная глубина для разных пользователей

Один и тот же продукт должен быть:

- легким для домашнего администратора
- достаточным для маленькой команды
- расширяемым для enterprise-потребностей

### 5. Все расширения должны быть отключаемыми

Если возможность не нужна:

- она выключается
- исчезает из интерфейса
- не перегружает навигацию
- не мешает основному сценарию

## Архитектурная стратегия

### Core

Это обязательная часть продукта, которая всегда присутствует.

### Optional in 1.0

Это входит в поставку, но включается и выключается в настройках экземпляра.

### 1.x Modules

Это отдельные расширяемые направления для зрелого enterprise-сценария.

## Core до 1.0

Следующий функционал должен быть частью ядра ATLAS:

- подсети
- диапазоны
- устройства
- поиск
- ping-проверка занятости
- подсказка свободного IP
- проверка конфликтов IP
- история изменений
- live-обновления
- импорт / экспорт
- пользователи
- авторизация
- роли
- группы доступа
- фильтрация отображаемой информации
- серверное хранение пользовательских настроек
- аудит
- source tracking
- backup / restore
- API
- теги
- кастомные поля
- резервирование IP
- расширенный поиск
- multi-network support
- saved filters / smart views
- import preview
- IPv6

## Optional in 1.0

Следующие возможности должны входить в продукт, но быть отключаемыми:

- Docker integration
- Proxmox integration
- IoT integration
- network map
- DNS awareness
- DHCP awareness
- notifications channels
- analytics widgets
- external monitoring connectors
- advanced discovery jobs
- visualization widgets on dashboard

## Что оставить на 1.x

Следующие вещи лучше перенести на зрелую фазу после 1.0:

- plugin system
- module marketplace / installable modules
- enterprise SSO: LDAP / OIDC / SAML
- rule engine / automation workflows
- distributed workers
- HA / clustering
- multi-tenant / MSP mode
- approval workflows
- compliance / reporting packs
- full SDK for integrations
- custom IoT codecs and payload decoding pipelines

## Навигационная модель

Целевая структура интерфейса:

- `Dashboard`
- `Inventory`
- `Activity`
- `Map`
- `Integrations`
- `Admin`
- `Settings`

Правило:

- если capability выключена, раздела нет в интерфейсе
- если пользователь не имеет прав, раздел или блок скрыт
- если раздел не нужен home-lab режиму, он не перегружает навигацию

## Dashboard Vision

Dashboard не должен дублировать весь продукт.

Главная страница должна отвечать только на три вопроса:

- что сейчас важно
- что требует внимания
- куда перейти дальше

На Dashboard должны оставаться:

- быстрый `IP Status / Quick Check`
- блок внимания: конфликты, новые устройства, offline changes, integration issues
- короткий `Recent Activity`
- `Quick Actions`
- позже: персонализированная область пользователя

С Dashboard должны уходить:

- полные списки сущностей
- длинные таблицы
- настройки
- сервисные функции
- все, что дублирует реестр

## Режимы продукта

### Minimal mode

Для home-lab и минимального IPAM:

- IPAM core
- quick IP tools
- история
- поиск
- конфликты

### Extended mode

Для небольших команд и production:

- integrations
- map
- notifications
- tags
- custom fields
- richer visibility controls

### Enterprise-ready mode

Для будущего развития:

- advanced RBAC
- access scopes
- API tokens
- external integrations
- optional enterprise modules

## Версионный roadmap

### 0.2.3 — UX cleanup и foundation polish

Цель: довести продукт до более чистого и дружественного состояния перед авторизацией.

Фокус:

- пересмотреть Dashboard
- убрать дублирующие кнопки и блоки
- улучшить композицию главной страницы
- сделать более очевидным flow добавления объектов
- сократить визуальный шум
- улучшить feedback в формах
- подготовить интерфейс к server-side user settings

### 0.2.4 — Пользователи, доступ, персональные настройки

Цель: перейти от single-user utility к многопользовательскому продукту.

Включить:

- пользователи для входа
- первый вход под `Admin / Atlas` с обязательной сменой пароля
- права доступа
- группы доступа
- изоляция части функционала и данных
- хранение индивидуальных настроек пользователя на сервере
- подготовка к capability-based UI

### 0.3 — Интеграция с Docker / Proxmox / IoT

Цель: видеть динамические среды и связывать их с хостами.

Включить:

- Docker discovery
- Proxmox discovery
- IoT discovery model
- `host -> containers / services / devices`
- source tracking
- optional create-on-discovery
- ports / status / timestamps
- orphan detection

### 0.4 — Визуализация сети

Цель: сделать наглядную карту сети без превращения интерфейса в перегруженный NOC.

Включить:

- карта подсетей и устройств
- вложенное отображение контейнеров и сервисов
- цветовую маркировку по статусу и типу
- фильтрацию карты
- упрощенный и расширенный режим карты

### 0.5 — Продвинутый IPAM

Цель: выйти на зрелый operational-уровень.

Включить:

- историю изменений подсетей и диапазонов
- резервирование IP
- теги
- кастомные поля
- расширенный поиск
- saved filters
- smart views
- multi-network support
- conflict workflows

### 0.6 — Network services awareness

Цель: связать IPAM с реальным поведением сети.

Включить:

- DNS awareness
- DHCP lease awareness
- reverse lookups
- mismatch detection
- hostname enrichment
- MAC / vendor enrichment

### 0.7 — Reliability and operations

Цель: production readiness.

Включить:

- backup / restore from UI
- import preview + diff
- soft delete / archive
- API tokens
- notifications
- integration health checks
- background jobs control

### 0.8 — Platform foundation

Цель: заложить реальную модульность.

Включить:

- feature flags
- module toggles
- per-role feature visibility
- navigation by enabled capabilities
- pluggable integration contracts
- внутреннюю подготовку к plugin architecture

### 0.9 — 1.0 readiness

Цель: стабилизация и полировка.

Включить:

- IPv6
- performance pass
- scalable queries
- hardening permission model
- API stabilization
- migration reliability
- UX cleanup across all key screens

### 1.0 — Полноценный продукт

Цель: универсальный IPAM / infrastructure inventory platform для home-lab, SMB и small production teams.

Включить:

- стабильное ядро
- users / roles / access groups
- optional integrations
- optional visualization
- polished UX
- API
- backup / restore
- extensibility foundation
- минимальный режим по умолчанию

## Будущий модуль: Racks & Network Equipment

Этот модуль не должен быть частью обязательного ядра.

Его лучше развивать как отдельную capability / future module.

### Цель

Добавить поддержку физического уровня инфраструктуры:

- стойки
- шкафы
- сетевое оборудование
- размещение устройств по U-позициям
- физическую топологию оборудования

### Возможности

- карточки стоек
- визуализация оборудования в стойке
- привязка устройств к rack / room / site
- отображение сетевого оборудования
- связь между physical placement и IP/inventory
- optional topology view

### Почему это модуль, а не core

Потому что:

- home-lab пользователю это часто не нужно
- принудительный physical layer перегружает интерфейс
- часть пользователей никогда не работает со стойками
- enterprise и small datacenter use-case от этого сильно выиграет, но включать это надо осознанно

## Что делает ATLAS лучше NetBox

ATLAS должен быть лучше не потому, что в нем "еще больше сущностей", а потому что он:

- проще стартует
- не заставляет моделировать лишнее
- легче в ежедневном использовании
- чище по интерфейсу
- модульнее по возможностям
- позволяет выключать неиспользуемое
- одинаково хорошо чувствует себя в home-lab и в production

## Формула продукта

Русский:

`ATLAS — модульная платформа управления сетью и инфраструктурой: простая в основе, мощная по мере роста.`

English:

`ATLAS is a modular platform for network and infrastructure management: simple at its core, powerful as you grow.`

