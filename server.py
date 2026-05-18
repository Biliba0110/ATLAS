#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import hashlib
import hmac
import ipaddress
import json
import mimetypes
import os
import platform
import queue
import secrets
import sqlite3
import subprocess
import threading
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"

DB_PATH = Path(os.environ.get("ATLAS_DB_PATH", DATA_DIR / "atlas.db"))
HOST = os.environ.get("ATLAS_HOST", "0.0.0.0")
PORT = int(os.environ.get("ATLAS_PORT", "4173"))
DEFAULT_SCAN_INTERVAL_SECONDS = int(os.environ.get("ATLAS_SCAN_INTERVAL", "90"))
MIN_SCAN_INTERVAL_SECONDS = 15
MAX_SCAN_INTERVAL_SECONDS = 3600
SCAN_TIMEOUT_MS = int(os.environ.get("ATLAS_SCAN_TIMEOUT_MS", "1000"))
SCAN_CONCURRENCY = max(1, int(os.environ.get("ATLAS_SCAN_CONCURRENCY", "32")))
HISTORY_LIMIT = int(os.environ.get("ATLAS_HISTORY_LIMIT", "200"))
SESSION_TTL_SECONDS = int(os.environ.get("ATLAS_SESSION_TTL_SECONDS", str(14 * 24 * 60 * 60)))
PASSWORD_HASH_ITERATIONS = 240000
DEFAULT_BOOTSTRAP_USERNAME = "Admin"
DEFAULT_BOOTSTRAP_PASSWORD = "Atlas"
ROLE_ADMIN = "admin"
ROLE_EDITOR = "editor"
ROLE_VIEWER = "viewer"
SUPPORTED_ROLES = {ROLE_ADMIN, ROLE_EDITOR, ROLE_VIEWER}
SESSION_COOKIE_NAME = "atlas_session"
DISCOVERY_SCHEMA = "atlas.discovery.snapshot.v1"
DISCOVERY_RESULT_STATES = {"new", "matched", "stale", "ignored", "error"}
DISCOVERY_RUN_STATES = {"running", "completed", "failed", "rejected"}
DISCOVERY_CREATE_MODES = {"preview_only", "auto_create_services", "auto_create_devices_and_services"}
DISCOVERY_AGENT_KINDS = {"host", "local", "hypervisor", "external"}
DISCOVERY_MAX_BODY_BYTES = int(os.environ.get("ATLAS_DISCOVERY_MAX_BODY_BYTES", str(512 * 1024)))
DISCOVERY_MAX_ITEMS = int(os.environ.get("ATLAS_DISCOVERY_MAX_ITEMS", "500"))
DISCOVERY_MAX_RAW_BYTES = int(os.environ.get("ATLAS_DISCOVERY_MAX_RAW_BYTES", str(16 * 1024)))
DISCOVERY_MAX_PACKETS_PER_RUN = int(os.environ.get("ATLAS_DISCOVERY_MAX_PACKETS_PER_RUN", "128"))
DISCOVERY_RETRY_AFTER_SECONDS = int(os.environ.get("ATLAS_DISCOVERY_RETRY_AFTER_SECONDS", "30"))
DISCOVERY_TIMESTAMP_SKEW_SECONDS = 300
DISCOVERY_NONCE_TTL_SECONDS = 600
DEFAULT_DISCOVERY_DATA_POLICY = {
    "storeRuntime": True,
    "storeLabels": False,
    "storeNetworkDetails": False,
    "storeInternalIps": False,
    "storeRawMetadata": False,
    "showMetadataInPreview": False,
}
DISCOVERY_CORE_RAW_FIELDS = {
    "address",
    "containerId",
    "fqdn",
    "battery",
    "batteryLevel",
    "deviceClass",
    "firmware",
    "firmwareVersion",
    "hostname",
    "ip",
    "location",
    "mac",
    "macAddress",
    "mac_address",
    "manufacturer",
    "model",
    "node",
    "os",
    "primaryIp",
    "primary_ip",
    "protocol",
    "room",
    "rssi",
    "signal",
    "proxmoxType",
    "type",
    "uid",
    "vendor",
    "vmid",
}
DISCOVERY_RUNTIME_RAW_FIELDS = {
    "cpu",
    "cpuModel",
    "cpus",
    "created",
    "disk",
    "diskCount",
    "disks",
    "diskSummary",
    "diskTotal",
    "diskUsage",
    "dockerState",
    "dockerComposeVersion",
    "dockerVersion",
    "finishedAt",
    "image",
    "images",
    "kernel",
    "kernelVersion",
    "kubernetesVersion",
    "kubernetesGitVersion",
    "loadAverage",
    "maxDisk",
    "maxMemory",
    "memory",
    "mounts",
    "mountSummary",
    "phase",
    "platform",
    "pveVersion",
    "ram",
    "ramUsage",
    "release",
    "restartCount",
    "sockets",
    "startedAt",
    "statusText",
    "system",
    "template",
    "uptime",
}
DISCOVERY_LABEL_RAW_FIELDS = {"labels", "owners", "selector", "tags"}
DISCOVERY_NETWORK_RAW_FIELDS = {
    "clusterIP",
    "externalIPs",
    "hostIP",
    "ips",
    "loadBalancer",
    "networks",
    "nodeName",
    "podIP",
}

STATIC_FILES = {
    "index.html",
    "styles.css",
    "app.js",
    "i18n.js",
    "group-suggestion-templates.json",
    "atlas-logo.svg",
    "favicon.svg",
}

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subnets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cidr TEXT NOT NULL,
    network TEXT NOT NULL,
    network_int INTEGER NOT NULL,
    broadcast TEXT NOT NULL,
    broadcast_int INTEGER NOT NULL,
    mask_bits INTEGER NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    range_start_int INTEGER NOT NULL,
    range_end_int INTEGER NOT NULL,
    pool_size INTEGER NOT NULL,
    usable_hosts INTEGER NOT NULL,
    scan_enabled INTEGER NOT NULL DEFAULT 1,
    access_group_id TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS range_groups (
    id TEXT PRIMARY KEY,
    subnet_id TEXT NOT NULL,
    name TEXT NOT NULL,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    range_start_int INTEGER NOT NULL,
    range_end_int INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (subnet_id) REFERENCES subnets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    mac TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    subnet_id TEXT,
    host_device_id TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    source_kind TEXT NOT NULL DEFAULT '',
    source_id TEXT NOT NULL DEFAULT '',
    integration_status TEXT NOT NULL DEFAULT '',
    integration_status_changed_at TEXT NOT NULL DEFAULT '',
    protocol TEXT NOT NULL DEFAULT '',
    service_url TEXT NOT NULL DEFAULT '',
    access_port TEXT NOT NULL DEFAULT '',
    ports TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (subnet_id) REFERENCES subnets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ip_scan_results (
    ip TEXT PRIMARY KEY,
    subnet_id TEXT NOT NULL,
    is_reachable INTEGER NOT NULL,
    checked_at TEXT NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY (subnet_id) REFERENCES subnets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ip_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    device_name TEXT NOT NULL,
    ip TEXT NOT NULL,
    previous_ip TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'system',
    changed_at TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_system_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_access_groups (
    user_id TEXT NOT NULL,
    access_group_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, access_group_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (access_group_id) REFERENCES access_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discovery_agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'host',
    enabled INTEGER NOT NULL DEFAULT 1,
    token_hash TEXT NOT NULL DEFAULT '',
    allowed_cidrs TEXT NOT NULL DEFAULT '',
    create_mode TEXT NOT NULL DEFAULT 'preview_only'
        CHECK (create_mode IN ('preview_only', 'auto_create_services', 'auto_create_devices_and_services')),
    linked_host_device_id TEXT NOT NULL DEFAULT '',
    data_policy TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL DEFAULT '',
    reported_interval_seconds INTEGER NOT NULL DEFAULT 0,
    reported_timeout_seconds INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NOT NULL DEFAULT '',
    last_remote_addr TEXT NOT NULL DEFAULT '',
    last_rejected_at TEXT NOT NULL DEFAULT '',
    last_reject_reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discovery_results (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    host_device_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    ports TEXT NOT NULL DEFAULT '',
    access_port TEXT NOT NULL DEFAULT '',
    service_url TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL DEFAULT '',
    matched_device_id TEXT NOT NULL DEFAULT '',
    matched_service_id TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT 'new'
        CHECK (state IN ('new', 'matched', 'stale', 'ignored', 'error')),
    raw TEXT NOT NULL DEFAULT '{}',
    received_fields TEXT NOT NULL DEFAULT '[]',
    accepted_fields TEXT NOT NULL DEFAULT '[]',
    visible_fields TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (agent_id, source, source_id),
    FOREIGN KEY (agent_id) REFERENCES discovery_agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discovery_runs (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    external_run_id TEXT NOT NULL DEFAULT '',
    schema TEXT NOT NULL DEFAULT 'atlas.discovery.snapshot.v1',
    source TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'rejected')),
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL DEFAULT '',
    packet_count INTEGER NOT NULL DEFAULT 0,
    found_count INTEGER NOT NULL DEFAULT 0,
    created_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    stale_count INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    remote_addr TEXT NOT NULL DEFAULT '',
    seen_source_ids TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES discovery_agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discovery_nonces (
    agent_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    PRIMARY KEY (agent_id, nonce),
    FOREIGN KEY (agent_id) REFERENCES discovery_agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discovery_audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    agent_id TEXT NOT NULL DEFAULT '',
    agent_name TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT 'system',
    remote_addr TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subnets_network_int ON subnets(network_int);
CREATE INDEX IF NOT EXISTS idx_groups_subnet_id ON range_groups(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_subnet_id ON devices(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_scan_subnet_id ON ip_scan_results(subnet_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON ip_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_access_groups_user_id ON user_access_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_discovery_agents_enabled ON discovery_agents(enabled);
CREATE INDEX IF NOT EXISTS idx_discovery_results_agent_id ON discovery_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_discovery_results_state ON discovery_results(state);
CREATE INDEX IF NOT EXISTS idx_discovery_results_source_lookup ON discovery_results(agent_id, source, source_id);
CREATE INDEX IF NOT EXISTS idx_discovery_results_last_seen ON discovery_results(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_agent_id ON discovery_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_started_at ON discovery_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_nonces_expires_at ON discovery_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_discovery_audit_created_at ON discovery_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_audit_agent_id ON discovery_audit_events(agent_id);
"""

SUBSCRIBERS: set[queue.Queue[str]] = set()
SUBSCRIBERS_LOCK = threading.Lock()
SCAN_LOCK = threading.Lock()
SCAN_REQUEST_EVENT = threading.Event()
STOP_EVENT = threading.Event()
REVISION_LOCK = threading.Lock()
CURRENT_REVISION = 0
SCAN_SIGNAL_LOCK = threading.Lock()
SCAN_EXECUTION_REQUESTED = False


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_iso8601(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def create_id() -> str:
    return secrets.token_hex(16)


class RequestError(Exception):
    def __init__(
        self,
        status: HTTPStatus,
        message: str,
        headers: list[tuple[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.headers = headers or []


def hash_password(password: str, *, salt: str | None = None) -> str:
    normalized_password = str(password or "")
    if not normalized_password:
        raise ValueError("Пароль не может быть пустым.")
    salt_value = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        normalized_password.encode("utf-8"),
        salt_value.encode("utf-8"),
        PASSWORD_HASH_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt_value}${derived}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt, expected_hash = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations = int(iterations_raw)
    except ValueError:
        return False

    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        str(password or "").encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return hmac.compare_digest(actual_hash, expected_hash)


def generate_agent_token() -> str:
    return f"atlas_agent_{secrets.token_urlsafe(32)}"


def hash_agent_token(token: str) -> str:
    token_value = str(token or "").strip()
    if not token_value:
        raise ValueError("Токен агента не может быть пустым.")
    digest = hashlib.sha256(token_value.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def hmac_sha256_hex(secret: str, message: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def normalize_signature_value(value: object) -> str:
    raw_value = str(value or "").strip()
    if raw_value.startswith("sha256="):
        raw_value = raw_value.removeprefix("sha256=")
    return raw_value.lower()


def normalize_ip_address(value: object) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        raise ValueError("IP-адрес не может быть пустым.")
    try:
        return str(ipaddress.ip_address(raw_value))
    except ValueError as error:
        raise ValueError("Указан некорректный IP-адрес.") from error


def is_ip_inside_network_bounds(ip_value: ipaddress._BaseAddress, network: ipaddress.IPv4Network) -> bool:
    return int(network.network_address) <= int(ip_value) <= int(network.broadcast_address)


def normalize_subnet_payload(payload: dict) -> dict:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise ValueError("Имя подсети обязательно.")

    cidr_raw = str(payload.get("cidr") or "").strip()
    if not cidr_raw:
        raise ValueError("CIDR подсети обязателен.")

    try:
        network = ipaddress.ip_network(cidr_raw, strict=False)
    except ValueError as error:
        raise ValueError("Указан некорректный CIDR.") from error

    if network.version != 4:
        raise ValueError("Сейчас поддерживаются только IPv4-подсети.")

    total_addresses = network.num_addresses
    if network.prefixlen >= 31:
        first_usable = network.network_address
        last_usable = network.broadcast_address
    else:
        first_usable = network.network_address + 1
        last_usable = network.broadcast_address - 1

    range_start = normalize_ip_address(payload.get("rangeStart") or str(first_usable))
    range_end = normalize_ip_address(payload.get("rangeEnd") or str(last_usable))
    range_start_ip = ipaddress.ip_address(range_start)
    range_end_ip = ipaddress.ip_address(range_end)

    if int(range_start_ip) > int(range_end_ip):
        raise ValueError(f"Для подсети {name} начало диапазона должно быть меньше или равно концу.")

    if not is_ip_inside_network_bounds(range_start_ip, network) or not is_ip_inside_network_bounds(range_end_ip, network):
        raise ValueError(f"Диапазон подсети {name} должен находиться внутри {network.with_prefixlen}.")

    return {
        "id": str(payload.get("id") or create_id()).strip() or create_id(),
        "name": name,
        "cidr": network.with_prefixlen,
        "network": str(network.network_address),
        "networkInt": int(network.network_address),
        "broadcast": str(network.broadcast_address),
        "broadcastInt": int(network.broadcast_address),
        "maskBits": network.prefixlen,
        "rangeStart": range_start,
        "rangeEnd": range_end,
        "rangeStartInt": int(range_start_ip),
        "rangeEndInt": int(range_end_ip),
        "poolSize": int(range_end_ip) - int(range_start_ip) + 1,
        "usableHosts": total_addresses if network.prefixlen >= 31 else max(total_addresses - 2, 0),
        "scanEnabled": bool(payload.get("scanEnabled", True)),
        "accessGroupId": str(payload.get("accessGroupId") or "").strip(),
        "note": str(payload.get("note") or "").strip(),
        "createdAt": str(payload.get("createdAt") or utc_now_iso()),
    }


def normalize_mac_address(value: object) -> str:
    raw_value = str(value or "").strip().replace("-", ":").upper()
    if not raw_value:
        return ""
    parts = [part for part in raw_value.split(":") if part]
    if len(parts) != 6 or any(len(part) != 2 for part in parts):
        raise ValueError("Указан некорректный MAC-адрес.")
    try:
        normalized_parts = [f"{int(part, 16):02X}" for part in parts]
    except ValueError as error:
        raise ValueError("Указан некорректный MAC-адрес.") from error
    return ":".join(normalized_parts)


def normalize_device_type(value: object) -> str:
    raw_value = str(value or "").strip().lower()
    aliases = {
        "server": "server",
        "servers": "server",
        "сервер": "server",
        "серверы": "server",
        "сервери": "server",
        "container": "container",
        "containers": "container",
        "контейнер": "container",
        "контейнеры": "container",
        "контейнери": "container",
        "service": "service",
        "services": "service",
        "сервис": "service",
        "сервіс": "service",
        "iot": "iot",
    }
    device_type = aliases.get(raw_value, raw_value.replace(" ", "-"))
    if not device_type or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for character in device_type):
        raise ValueError("Тип устройства должен содержать только латинские буквы, цифры, дефис или подчёркивание.")
    return device_type


def normalize_slug_value(value: object, *, default: str = "") -> str:
    normalized = str(value or default).strip().lower().replace(" ", "-")
    if not normalized:
        return default
    if any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for character in normalized):
        raise ValueError("Источник, статус и тип интеграции должны содержать только латинские буквы, цифры, дефис или подчёркивание.")
    return normalized


def normalize_device_ports(value: object) -> str:
    raw_value = str(value or "").strip()
    if len(raw_value) > 500:
        raise ValueError("Список портов слишком длинный.")
    return raw_value


def normalize_optional_text(value: object, max_length: int, field_name: str) -> str:
    text = str(value or "").strip()
    if len(text) > max_length:
        raise ValueError(f"{field_name} слишком длинный.")
    return text


def get_blocking_ip_duplicate(
    connection: sqlite3.Connection,
    *,
    device_id: str,
    ip: str,
    device_type: str,
    host_device_id: str,
) -> sqlite3.Row | None:
    if device_type != "service":
        return connection.execute(
            """
            SELECT id, name
            FROM devices
            WHERE ip = ?
              AND id != ?
              AND NOT (type = 'service' AND host_device_id = ?)
            LIMIT 1
            """,
            (ip, device_id, device_id),
        ).fetchone()

    if not host_device_id:
        return connection.execute(
            "SELECT id, name FROM devices WHERE ip = ? AND id != ? LIMIT 1",
            (ip, device_id),
        ).fetchone()

    host_row = connection.execute(
        "SELECT id, ip FROM devices WHERE id = ?",
        (host_device_id,),
    ).fetchone()
    if host_row is None or host_row["ip"] != ip:
        return connection.execute(
            "SELECT id, name FROM devices WHERE ip = ? AND id != ? LIMIT 1",
            (ip, device_id),
        ).fetchone()

    return connection.execute(
        """
        SELECT id, name
        FROM devices
        WHERE ip = ?
          AND id NOT IN (?, ?)
          AND NOT (type = 'service' AND host_device_id = ?)
        LIMIT 1
        """,
        (ip, device_id, host_device_id, host_device_id),
    ).fetchone()


def normalize_group_payload(
    connection: sqlite3.Connection,
    payload: dict,
    *,
    existing_id: str | None = None,
    created_at: str | None = None,
) -> dict:
    group_id = str(payload.get("id") or existing_id or create_id()).strip() or create_id()
    subnet_id = str(payload.get("subnetId") or "").strip()
    subnet = get_subnet_by_id(connection, subnet_id)
    if subnet is None:
        raise ValueError("Подсеть для группы не найдена.")

    name = str(payload.get("name") or "").strip()
    if not name:
        raise ValueError("Имя группы обязательно.")

    note = str(payload.get("note") or "").strip()
    range_start = normalize_ip_address(payload.get("rangeStart"))
    range_end = normalize_ip_address(payload.get("rangeEnd"))
    range_start_int = ip_to_int_value(range_start)
    range_end_int = ip_to_int_value(range_end)

    if range_start_int > range_end_int:
        raise ValueError("Начало диапазона должно быть меньше или равно концу.")

    if range_start_int < subnet["networkInt"] or range_end_int > subnet["broadcastInt"]:
        raise ValueError(f"Диапазон группы должен находиться внутри {subnet['cidr']}.")

    overlapping_group = connection.execute(
        """
        SELECT id, name
        FROM range_groups
        WHERE subnet_id = ?
          AND id != ?
          AND range_start_int <= ?
          AND range_end_int >= ?
        LIMIT 1
        """,
        (subnet_id, group_id, range_end_int, range_start_int),
    ).fetchone()
    if overlapping_group is not None:
        raise ValueError(f"Диапазон пересекается с группой {overlapping_group['name']}.")

    return {
        "id": group_id,
        "subnetId": subnet_id,
        "name": name,
        "rangeStart": range_start,
        "rangeEnd": range_end,
        "rangeStartInt": range_start_int,
        "rangeEndInt": range_end_int,
        "note": note,
        "createdAt": created_at or str(payload.get("createdAt") or utc_now_iso()),
    }


def normalize_device_payload(
    connection: sqlite3.Connection,
    payload: dict,
    *,
    existing_id: str | None = None,
    created_at: str | None = None,
) -> dict:
    device_id = str(payload.get("id") or existing_id or create_id()).strip() or create_id()
    name = str(payload.get("name") or "").strip()
    if not name:
        raise ValueError("Имя устройства обязательно.")

    ip = normalize_ip_address(payload.get("ip"))
    mac = normalize_mac_address(payload.get("mac"))
    device_type = normalize_device_type(payload.get("type"))
    note = str(payload.get("note") or "").strip()
    subnet_id = str(payload.get("subnetId") or "").strip()
    group_id = str(payload.get("groupId") or "").strip()
    host_device_id = str(payload.get("hostDeviceId") or "").strip()
    source = normalize_slug_value(payload.get("source"), default="")
    source_kind = normalize_slug_value(payload.get("sourceKind"), default="")
    source_id = str(payload.get("sourceId") or "").strip()
    integration_status = normalize_slug_value(payload.get("integrationStatus"), default="")
    integration_status_changed_at = str(payload.get("integrationStatusChangedAt") or "").strip()
    protocol = normalize_slug_value(payload.get("protocol"), default="")
    service_url = str(payload.get("serviceUrl") or "").strip()
    access_port = normalize_device_ports(payload.get("accessPort"))
    ports = normalize_device_ports(payload.get("ports"))
    last_seen_at = str(payload.get("lastSeenAt") or "").strip()
    ip_int = ip_to_int_value(ip)

    if host_device_id == device_id:
        raise ValueError("Устройство не может быть собственным хостом.")

    subnet = get_subnet_by_id(connection, subnet_id) if subnet_id else None
    if subnet is not None and not (subnet["networkInt"] <= ip_int <= subnet["broadcastInt"]):
        raise ValueError(f"IP {ip} не входит в подсеть {subnet['name']}.")

    if subnet is None:
        for candidate in get_subnets_for_scan(connection):
            if candidate["networkInt"] <= ip_int <= candidate["broadcastInt"]:
                subnet = candidate
                subnet_id = candidate["id"]
                break

    if group_id:
        group = get_group_for_scan(connection, group_id)
        if group is None:
            raise ValueError("Выбранная группа не найдена.")
        if subnet_id and group["subnetId"] != subnet_id:
            raise ValueError("Группа диапазона не относится к выбранной подсети.")
        if not (group["rangeStartInt"] <= ip_int <= group["rangeEndInt"]):
            raise ValueError("IP устройства не входит в диапазон выбранной группы.")
        subnet_id = group["subnetId"]

    duplicate_ip = get_blocking_ip_duplicate(
        connection,
        device_id=device_id,
        ip=ip,
        device_type=device_type,
        host_device_id=host_device_id,
    )
    if duplicate_ip is not None:
        raise ValueError(f"IP {ip} уже назначен устройству {duplicate_ip['name']}.")

    if mac:
        duplicate_mac = connection.execute(
            "SELECT id, name FROM devices WHERE UPPER(mac) = ? AND id != ? LIMIT 1",
            (mac, device_id),
        ).fetchone()
        if duplicate_mac is not None:
            raise ValueError(f"MAC {mac} уже назначен устройству {duplicate_mac['name']}.")

    return {
        "id": device_id,
        "name": name,
        "ip": ip,
        "mac": mac,
        "type": device_type,
        "subnetId": subnet_id,
        "hostDeviceId": host_device_id,
        "source": source,
        "sourceKind": source_kind,
        "sourceId": source_id,
        "integrationStatus": integration_status,
        "integrationStatusChangedAt": integration_status_changed_at,
        "protocol": protocol,
        "serviceUrl": service_url,
        "accessPort": access_port,
        "ports": ports,
        "lastSeenAt": last_seen_at,
        "note": note,
        "createdAt": created_at or str(payload.get("createdAt") or utc_now_iso()),
    }


def ensure_column(connection: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {
        row["name"]
        for row in connection.execute(f"PRAGMA table_info({table})")
    }
    if column not in columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def ensure_migrations(connection: sqlite3.Connection) -> None:
    ensure_column(connection, "subnets", "access_group_id", "TEXT")
    ensure_column(connection, "subnets", "scan_enabled", "INTEGER NOT NULL DEFAULT 1")
    ensure_column(connection, "users", "is_system_admin", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(connection, "devices", "host_device_id", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "source", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "source_kind", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "source_id", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "integration_status", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "integration_status_changed_at", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "protocol", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "service_url", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "access_port", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "ports", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "devices", "last_seen_at", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "discovery_agents", "data_policy", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "discovery_agents", "reported_interval_seconds", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(connection, "discovery_agents", "reported_timeout_seconds", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(connection, "discovery_results", "received_fields", "TEXT NOT NULL DEFAULT '[]'")
    ensure_column(connection, "discovery_results", "accepted_fields", "TEXT NOT NULL DEFAULT '[]'")
    ensure_column(connection, "discovery_results", "visible_fields", "TEXT NOT NULL DEFAULT '[]'")
    ensure_column(connection, "discovery_runs", "external_run_id", "TEXT NOT NULL DEFAULT ''")
    ensure_column(connection, "discovery_runs", "sources", "TEXT NOT NULL DEFAULT '[]'")
    ensure_column(connection, "discovery_runs", "packet_count", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(connection, "discovery_runs", "seen_source_ids", "TEXT NOT NULL DEFAULT '{}'")
    connection.execute("UPDATE discovery_agents SET kind = 'host' WHERE kind = 'network'")
    connection.execute("UPDATE devices SET source = '' WHERE source = 'manual'")


def ensure_system_admin_marker(connection: sqlite3.Connection) -> None:
    existing_system_admin = connection.execute(
        "SELECT id FROM users WHERE is_system_admin = 1 LIMIT 1"
    ).fetchone()
    if existing_system_admin is not None:
        return
    connection.execute(
        """
        UPDATE users
        SET is_system_admin = 1
        WHERE username = ? COLLATE NOCASE
        """,
        (DEFAULT_BOOTSTRAP_USERNAME,),
    )


def create_bootstrap_admin(connection: sqlite3.Connection) -> None:
    existing_user = connection.execute("SELECT id FROM users LIMIT 1").fetchone()
    if existing_user is not None:
        return

    now = utc_now_iso()
    connection.execute(
        """
        INSERT INTO users (
            id, username, display_name, password_hash, role, must_change_password,
            is_active, is_system_admin, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            create_id(),
            DEFAULT_BOOTSTRAP_USERNAME,
            DEFAULT_BOOTSTRAP_USERNAME,
            hash_password(DEFAULT_BOOTSTRAP_PASSWORD),
            ROLE_ADMIN,
            1,
            1,
            1,
            now,
            now,
        ),
    )


def parse_cookie_header(header_value: str | None) -> dict[str, str]:
    if not header_value:
        return {}

    cookies: dict[str, str] = {}
    for chunk in header_value.split(";"):
        if "=" not in chunk:
            continue
        name, value = chunk.split("=", 1)
        cookies[name.strip()] = value.strip()
    return cookies


def create_session(connection: sqlite3.Connection, user_id: str) -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    now = utc_now_iso()
    expires_at = datetime.fromtimestamp(
        parse_iso8601(now).timestamp() + SESSION_TTL_SECONDS,
        tz=timezone.utc,
    ).isoformat(timespec="seconds").replace("+00:00", "Z")
    connection.execute(
        """
        INSERT INTO sessions (token, user_id, created_at, expires_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (token, user_id, now, expires_at, now),
    )
    return token, expires_at


def cleanup_expired_sessions(connection: sqlite3.Connection) -> None:
    connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (utc_now_iso(),))


def normalize_role(value: object) -> str:
    role = str(value or "").strip().lower()
    if role not in SUPPORTED_ROLES:
        raise ValueError("Поддерживаются роли admin, editor и viewer.")
    return role


def sanitize_username(value: object) -> str:
    username = str(value or "").strip()
    if not username:
        raise ValueError("Имя пользователя обязательно.")
    return username


def sanitize_display_name(value: object, *, fallback: str = "") -> str:
    display_name = str(value or "").strip()
    if display_name:
        return display_name
    if fallback:
        return fallback
    raise ValueError("Отображаемое имя пользователя обязательно.")


def require_non_empty_password(value: object) -> str:
    password = str(value or "")
    if len(password) < 4:
        raise ValueError("Пароль должен содержать минимум 4 символа.")
    return password


def configure_connection(connection: sqlite3.Connection) -> sqlite3.Connection:
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


def ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH, timeout=10) as connection:
        configure_connection(connection)
        connection.executescript(SCHEMA)
        ensure_migrations(connection)
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_subnets_access_group_id ON subnets(access_group_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_discovery_runs_external_run_id ON discovery_runs(agent_id, external_run_id)"
        )
        connection.execute(
            """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO NOTHING
            """,
            ("scan_interval_seconds", str(DEFAULT_SCAN_INTERVAL_SECONDS), utc_now_iso()),
        )
        connection.execute(
            """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO NOTHING
            """,
            ("default_subnet_scan_enabled", "1", utc_now_iso()),
        )
        create_bootstrap_admin(connection)
        ensure_system_admin_marker(connection)
        connection.commit()


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=10)
    return configure_connection(connection)


def subnet_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "cidr": row["cidr"],
        "network": row["network"],
        "networkInt": row["network_int"],
        "broadcast": row["broadcast"],
        "broadcastInt": row["broadcast_int"],
        "maskBits": row["mask_bits"],
        "rangeStart": row["range_start"],
        "rangeEnd": row["range_end"],
        "rangeStartInt": row["range_start_int"],
        "rangeEndInt": row["range_end_int"],
        "poolSize": row["pool_size"],
        "usableHosts": row["usable_hosts"],
        "scanEnabled": bool(row["scan_enabled"]),
        "note": row["note"],
        "createdAt": row["created_at"],
    }


def group_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "subnetId": row["subnet_id"],
        "name": row["name"],
        "rangeStart": row["range_start"],
        "rangeEnd": row["range_end"],
        "rangeStartInt": row["range_start_int"],
        "rangeEndInt": row["range_end_int"],
        "note": row["note"],
        "createdAt": row["created_at"],
    }


def device_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "ip": row["ip"],
        "mac": row["mac"] or "",
        "type": row["type"],
        "subnetId": row["subnet_id"] or "",
        "hostDeviceId": row["host_device_id"] or "",
        "source": row["source"] or "",
        "sourceKind": row["source_kind"] or "",
        "sourceId": row["source_id"] or "",
        "integrationStatus": row["integration_status"] or "",
        "integrationStatusChangedAt": row["integration_status_changed_at"] or "",
        "protocol": row["protocol"] or "",
        "serviceUrl": row["service_url"] or "",
        "accessPort": row["access_port"] or "",
        "ports": row["ports"] or "",
        "lastSeenAt": row["last_seen_at"] or "",
        "note": row["note"],
        "createdAt": row["created_at"],
    }


def scan_result_from_row(row: sqlite3.Row) -> dict:
    return {
        "ip": row["ip"],
        "subnetId": row["subnet_id"],
        "isReachable": bool(row["is_reachable"]),
        "checkedAt": row["checked_at"],
        "source": row["source"],
    }


def history_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "deviceId": row["device_id"] or "",
        "deviceName": row["device_name"],
        "ip": row["ip"],
        "previousIp": row["previous_ip"],
        "action": row["action"],
        "actor": row["actor"],
        "changedAt": row["changed_at"],
        "note": row["note"],
    }


def access_group_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def user_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "displayName": row["display_name"],
        "role": row["role"],
        "mustChangePassword": bool(row["must_change_password"]),
        "isActive": bool(row["is_active"]),
        "isSystemAdmin": bool(row["is_system_admin"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def discovery_agent_from_row(row: sqlite3.Row) -> dict:
    try:
        allowed_cidrs = json.loads(row["allowed_cidrs"] or "[]")
    except json.JSONDecodeError:
        allowed_cidrs = []
    if not isinstance(allowed_cidrs, list):
        allowed_cidrs = []
    raw_data_policy = str(row["data_policy"] or "").strip()

    return {
        "id": row["id"],
        "name": row["name"],
        "kind": row["kind"],
        "enabled": bool(row["enabled"]),
        "allowedCidrs": [str(item) for item in allowed_cidrs],
        "createMode": row["create_mode"],
        "linkedHostDeviceId": row["linked_host_device_id"] or "",
        "lastSeenAt": row["last_seen_at"] or "",
        "reportedIntervalSeconds": int(row["reported_interval_seconds"] or 0),
        "reportedTimeoutSeconds": int(row["reported_timeout_seconds"] or 0),
        "lastError": row["last_error"] or "",
        "lastRemoteAddr": row["last_remote_addr"] or "",
        "lastRejectedAt": row["last_rejected_at"] or "",
        "lastRejectReason": row["last_reject_reason"] or "",
        "dataPolicyOverride": normalize_discovery_data_policy(raw_data_policy) if raw_data_policy else None,
        "usesDefaultDataPolicy": not bool(raw_data_policy),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def decode_json_object(value: str) -> dict:
    try:
        decoded = json.loads(value or "{}")
    except json.JSONDecodeError:
        return {}
    return decoded if isinstance(decoded, dict) else {}


def decode_json_list(value: str) -> list[str]:
    try:
        decoded = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    if not isinstance(decoded, list):
        return []
    return [str(item or "").strip() for item in decoded if str(item or "").strip()]


def discovery_result_from_row(row: sqlite3.Row) -> dict:
    raw = decode_json_object(row["raw"] or "{}")
    visible_fields = decode_json_list(row["visible_fields"] or "[]")
    visible_raw = {
        key: raw.get(key)
        for key in visible_fields
        if key in raw
    }
    fallback_host_name = ""
    if row["source"] == "proxmox":
        fallback_host_name = str(raw.get("node") or "").strip()
    return {
        "id": row["id"],
        "agentId": row["agent_id"],
        "agentName": row["agent_name"] or "",
        "source": row["source"],
        "sourceId": row["source_id"],
        "sourceKind": row["source_kind"],
        "hostDeviceId": row["host_device_id"] or "",
        "hostName": row["host_name"] or fallback_host_name,
        "name": row["name"],
        "status": row["status"] or "",
        "ports": row["ports"] or "",
        "accessPort": row["access_port"] or "",
        "serviceUrl": row["service_url"] or "",
        "lastSeenAt": row["last_seen_at"] or "",
        "matchedDeviceId": row["matched_device_id"] or "",
        "matchedServiceId": row["matched_service_id"] or "",
        "state": row["state"],
        "receivedFields": decode_json_list(row["received_fields"] or "[]"),
        "acceptedFields": decode_json_list(row["accepted_fields"] or "[]"),
        "visibleFields": visible_fields,
        "visibleRaw": visible_raw,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def discovery_audit_event_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": int(row["id"]),
        "eventType": row["event_type"],
        "severity": row["severity"],
        "agentId": row["agent_id"] or "",
        "agentName": row["agent_name"] or "",
        "actor": row["actor"] or "system",
        "remoteAddr": row["remote_addr"] or "",
        "message": row["message"] or "",
        "details": decode_json_object(row["details"] or "{}"),
        "createdAt": row["created_at"],
    }


def get_user_access_group_ids(connection: sqlite3.Connection, user_id: str) -> list[str]:
    return [
        row["access_group_id"]
        for row in connection.execute(
            "SELECT access_group_id FROM user_access_groups WHERE user_id = ? ORDER BY access_group_id",
            (user_id,),
        )
    ]


def list_access_groups(connection: sqlite3.Connection) -> list[dict]:
    return [
        access_group_from_row(row)
        for row in connection.execute(
            "SELECT * FROM access_groups ORDER BY name COLLATE NOCASE ASC, created_at ASC"
        )
    ]


def list_users(connection: sqlite3.Connection) -> list[dict]:
    users = [
        user_from_row(row)
        for row in connection.execute(
            "SELECT * FROM users ORDER BY username COLLATE NOCASE ASC, created_at ASC"
        )
    ]
    for user in users:
        user["accessGroupIds"] = get_user_access_group_ids(connection, user["id"])
    return users


def list_discovery_agents(connection: sqlite3.Connection) -> list[dict]:
    return [
        discovery_agent_from_row(row)
        for row in connection.execute(
            "SELECT * FROM discovery_agents ORDER BY name COLLATE NOCASE ASC, created_at ASC"
        )
    ]


def list_discovery_results(connection: sqlite3.Connection) -> list[dict]:
    return [
        discovery_result_from_row(row)
        for row in connection.execute(
            """
            SELECT
                discovery_results.*,
                discovery_agents.name AS agent_name,
                devices.name AS host_name
            FROM discovery_results
            LEFT JOIN discovery_agents ON discovery_agents.id = discovery_results.agent_id
            LEFT JOIN devices ON devices.id = discovery_results.host_device_id
            ORDER BY discovery_results.updated_at DESC, discovery_results.created_at DESC
            """
        )
    ]


def list_discovery_audit_events(connection: sqlite3.Connection, limit: int = 80) -> list[dict]:
    return [
        discovery_audit_event_from_row(row)
        for row in connection.execute(
            """
            SELECT *
            FROM discovery_audit_events
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        )
    ]


def record_discovery_audit_event(
    connection: sqlite3.Connection,
    event_type: str,
    *,
    severity: str = "info",
    agent_id: str = "",
    agent_name: str = "",
    actor: str = "system",
    remote_addr: str = "",
    message: str = "",
    details: dict | None = None,
) -> None:
    normalized_details = details if isinstance(details, dict) else {}

    def short_text(value: object, max_length: int) -> str:
        return str(value or "").strip()[:max_length]

    connection.execute(
        """
        INSERT INTO discovery_audit_events (
            event_type, severity, agent_id, agent_name, actor, remote_addr,
            message, details, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            short_text(event_type, 80) or "discovery_event",
            short_text(severity, 24) or "info",
            short_text(agent_id, 80),
            short_text(agent_name, 120),
            short_text(actor, 120) or "system",
            short_text(remote_addr, 128),
            short_text(message, 240),
            json.dumps(normalized_details, ensure_ascii=False, sort_keys=True),
            utc_now_iso(),
        ),
    )


def get_discovery_result_row(connection: sqlite3.Connection, result_id: str) -> sqlite3.Row:
    row = connection.execute(
        """
        SELECT
            discovery_results.*,
            discovery_agents.name AS agent_name,
            discovery_agents.linked_host_device_id AS agent_linked_host_device_id,
            devices.name AS host_name
        FROM discovery_results
        LEFT JOIN discovery_agents ON discovery_agents.id = discovery_results.agent_id
        LEFT JOIN devices ON devices.id = discovery_results.host_device_id
        WHERE discovery_results.id = ?
        """,
        (result_id,),
    ).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Найденный объект не найден.")
    return row


def get_discovery_result(connection: sqlite3.Connection, result_id: str) -> dict:
    return discovery_result_from_row(get_discovery_result_row(connection, result_id))


def decode_discovery_raw(row: sqlite3.Row) -> dict:
    return decode_json_object(row["raw"] or "{}")


def get_device_row(connection: sqlite3.Connection, device_id: str) -> sqlite3.Row | None:
    if not device_id:
        return None
    return connection.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()


def proxmox_node_name_from_raw(raw: dict) -> str:
    return normalize_optional_text(raw.get("node"), 120, "node") if raw.get("node") else ""


def find_host_row_for_proxmox_node(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    node_name: str,
) -> sqlite3.Row | None:
    if not node_name:
        return None
    row = connection.execute(
        """
        SELECT devices.*
        FROM discovery_results
        JOIN devices ON devices.id = discovery_results.matched_device_id
        WHERE discovery_results.agent_id = ?
          AND discovery_results.source_kind = 'host'
          AND devices.type != 'service'
        ORDER BY
          CASE
            WHEN lower(discovery_results.name) = lower(?) THEN 0
            WHEN lower(devices.name) = lower(?) THEN 1
            ELSE 2
          END,
          discovery_results.updated_at DESC
        LIMIT 1
        """,
        (agent_id, node_name, node_name),
    ).fetchone()
    if row is not None:
        return row
    return connection.execute(
        """
        SELECT *
        FROM devices
        WHERE type != 'service'
          AND lower(name) = lower(?)
        ORDER BY created_at ASC
        LIMIT 1
        """,
        (node_name,),
    ).fetchone()


def resolve_discovery_host_id_for_item(connection: sqlite3.Connection, agent: dict, item: dict) -> str:
    host_device_id = item["hostDeviceId"] or agent.get("linkedHostDeviceId", "")
    if host_device_id:
        return host_device_id
    if item["source"] != "proxmox":
        return ""
    raw = decode_json_object(item.get("raw") or "{}")
    host_row = find_host_row_for_proxmox_node(
        connection,
        agent_id=agent["id"],
        node_name=proxmox_node_name_from_raw(raw),
    )
    return host_row["id"] if host_row is not None else ""


def find_existing_device_id_for_discovery_item(connection: sqlite3.Connection, item: dict) -> str:
    source_kind = normalize_slug_value(item.get("sourceKind"), default="")
    if source_kind in {"template", "service", "container", "docker-container", "pod", "workload"}:
        return ""
    raw = decode_json_object(item.get("raw") or "{}")
    ip = first_raw_value(raw, ["primaryIp", "primary_ip", "ip", "address"])
    if not ip:
        if item.get("source") == "proxmox" and source_kind == "hypervisor":
            node_name = proxmox_node_name_from_raw(raw) or str(item.get("name") or "").strip()
            if node_name:
                row = connection.execute(
                    """
                    SELECT id
                    FROM devices
                    WHERE type != 'service'
                      AND lower(name) = lower(?)
                    ORDER BY created_at ASC
                    LIMIT 1
                    """,
                    (node_name,),
                ).fetchone()
                return row["id"] if row is not None else ""
        return ""
    row = connection.execute(
        """
        SELECT id
        FROM devices
        WHERE ip = ?
          AND type != 'service'
        ORDER BY created_at ASC
        LIMIT 1
        """,
        (ip,),
    ).fetchone()
    return row["id"] if row is not None else ""


def resolve_discovery_host_row(connection: sqlite3.Connection, row: sqlite3.Row) -> sqlite3.Row | None:
    host_device_id = row["host_device_id"] or row["agent_linked_host_device_id"] or ""
    host_row = get_device_row(connection, host_device_id)
    if host_row is not None:
        return host_row
    if row["source"] == "proxmox":
        return find_host_row_for_proxmox_node(
            connection,
            agent_id=row["agent_id"],
            node_name=proxmox_node_name_from_raw(decode_discovery_raw(row)),
        )
    return None


def list_user_access_group_rows(connection: sqlite3.Connection) -> list[dict]:
    return [
        {
            "userId": row["user_id"],
            "accessGroupId": row["access_group_id"],
            "createdAt": row["created_at"],
        }
        for row in connection.execute(
            "SELECT user_id, access_group_id, created_at FROM user_access_groups ORDER BY user_id ASC, access_group_id ASC"
        )
    ]


def list_user_settings_rows(connection: sqlite3.Connection) -> list[dict]:
    return [
        {
            "userId": row["user_id"],
            "key": row["key"],
            "value": row["value"],
            "updatedAt": row["updated_at"],
        }
        for row in connection.execute(
            "SELECT user_id, key, value, updated_at FROM user_settings ORDER BY user_id ASC, key ASC"
        )
    ]


def list_app_settings_rows(connection: sqlite3.Connection) -> list[dict]:
    return [
        {
            "key": row["key"],
            "value": row["value"],
            "updatedAt": row["updated_at"],
        }
        for row in connection.execute(
            "SELECT key, value, updated_at FROM app_settings ORDER BY key ASC"
        )
    ]


def list_discovery_agent_backup_rows(connection: sqlite3.Connection) -> list[dict]:
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "kind": row["kind"],
            "enabled": bool(row["enabled"]),
            "allowedCidrs": decode_json_list(row["allowed_cidrs"] or "[]"),
            "createMode": row["create_mode"],
            "linkedHostDeviceId": row["linked_host_device_id"] or "",
            "dataPolicyOverride": normalize_discovery_data_policy(row["data_policy"]) if str(row["data_policy"] or "").strip() else None,
            "usesDefaultDataPolicy": not bool(str(row["data_policy"] or "").strip()),
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "tokenRequired": True,
        }
        for row in connection.execute(
            """
            SELECT
                id, name, kind, enabled, allowed_cidrs, create_mode,
                linked_host_device_id, data_policy, created_at, updated_at
            FROM discovery_agents
            ORDER BY name COLLATE NOCASE ASC, created_at ASC
            """
        )
    ]


def export_backup(connection: sqlite3.Connection, include: dict | None = None) -> dict:
    include = include or {}
    include_inventory = bool(include.get("inventory", True))
    include_activity = bool(include.get("activity", True))
    include_system = bool(include.get("system", True))
    include_access = bool(include.get("access", True))
    include_preferences = bool(include.get("preferences", True))
    include_discovery = bool(include.get("discovery", True))

    payload = {
        "kind": "atlas-backup",
        "version": "0.3",
        "exportedAt": utc_now_iso(),
        "sections": {},
    }

    if include_inventory:
        payload["sections"]["inventory"] = {
            "subnets": [
                enrich_subnet(subnet_from_db_row_with_access(row), {})
                for row in connection.execute("SELECT * FROM subnets ORDER BY created_at DESC, rowid DESC")
            ],
            "groups": [
                group_from_row(row)
                for row in connection.execute("SELECT * FROM range_groups ORDER BY created_at DESC, rowid DESC")
            ],
            "devices": [
                device_from_row(row)
                for row in connection.execute("SELECT * FROM devices ORDER BY created_at DESC, rowid DESC")
            ],
        }

    if include_activity:
        payload["sections"]["activity"] = {
            "scanResults": [
                scan_result_from_row(row)
                for row in connection.execute("SELECT * FROM ip_scan_results ORDER BY checked_at DESC, ip ASC")
            ],
            "history": [
                history_from_row(row)
                for row in connection.execute("SELECT * FROM ip_history ORDER BY changed_at DESC, id DESC")
            ],
        }

    if include_system:
        payload["sections"]["system"] = {
            "appSettings": list_app_settings_rows(connection),
        }

    if include_access:
        payload["sections"]["access"] = {
            "users": [
                {
                    "id": row["id"],
                    "username": row["username"],
                    "displayName": row["display_name"],
                    "passwordHash": row["password_hash"],
                    "role": row["role"],
                    "mustChangePassword": bool(row["must_change_password"]),
                    "isActive": bool(row["is_active"]),
                    "isSystemAdmin": bool(row["is_system_admin"]),
                    "createdAt": row["created_at"],
                    "updatedAt": row["updated_at"],
                }
                for row in connection.execute("SELECT * FROM users ORDER BY username COLLATE NOCASE ASC, created_at ASC")
            ],
            "accessGroups": list_access_groups(connection),
            "userAccessGroups": list_user_access_group_rows(connection),
        }

    if include_preferences:
        payload["sections"]["preferences"] = {
            "userSettings": list_user_settings_rows(connection),
        }

    if include_discovery:
        payload["sections"]["discovery"] = {
            "agents": list_discovery_agent_backup_rows(connection),
            "secretPolicy": "tokens-not-exported",
            "restoreNote": "Restored agents are disabled and require token rotation.",
        }

    return payload


def import_discovery_agent_definitions(connection: sqlite3.Connection, agents: list, actor: str) -> int:
    restored_count = 0
    now = utc_now_iso()
    valid_host_ids = {
        row["id"]
        for row in connection.execute("SELECT id FROM devices")
    }
    seen_agent_ids: set[str] = set()
    for raw_agent in agents:
        if not isinstance(raw_agent, dict):
            continue
        agent_id = normalize_optional_text(raw_agent.get("id") or create_id(), 80, "agentId") or create_id()
        if agent_id in seen_agent_ids:
            continue
        seen_agent_ids.add(agent_id)
        name = normalize_optional_text(raw_agent.get("name"), 80, "name")
        if not name:
            continue
        kind = normalize_slug_value(raw_agent.get("kind"), default="host")
        allowed_cidrs = normalize_allowed_cidrs(raw_agent.get("allowedCidrs"))
        create_mode = normalize_discovery_create_mode(raw_agent.get("createMode"))
        data_policy = ""
        if not bool(raw_agent.get("usesDefaultDataPolicy", True)):
            data_policy = json.dumps(
                normalize_discovery_data_policy(raw_agent.get("dataPolicyOverride") or raw_agent.get("dataPolicy")),
                ensure_ascii=False,
                sort_keys=True,
            )
        linked_host_device_id = normalize_optional_text(raw_agent.get("linkedHostDeviceId"), 80, "linkedHostDeviceId")
        if linked_host_device_id not in valid_host_ids:
            linked_host_device_id = ""
        created_at = normalize_optional_text(raw_agent.get("createdAt"), 40, "createdAt") or now
        invalid_token_hash = hash_agent_token(generate_agent_token())
        connection.execute(
            """
            INSERT INTO discovery_agents (
                id, name, kind, enabled, token_hash, allowed_cidrs, create_mode,
                linked_host_device_id, data_policy, last_error, last_remote_addr,
                last_rejected_at, last_reject_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                agent_id,
                name,
                kind,
                0,
                invalid_token_hash,
                json.dumps(allowed_cidrs, ensure_ascii=False),
                create_mode,
                linked_host_device_id,
                data_policy,
                "Token required after restore.",
                "",
                "",
                "",
                created_at,
                now,
            ),
        )
        record_discovery_audit_event(
            connection,
            "agent_restored",
            severity="warn",
            agent_id=agent_id,
            agent_name=name,
            actor=actor,
            message="Discovery agent restored without token. Rotate token before enabling.",
            details={
                "enabledBeforeBackup": bool(raw_agent.get("enabled")),
                "tokenRequired": True,
            },
        )
        restored_count += 1
    return restored_count


def import_backup(connection: sqlite3.Connection, backup: dict, actor: str) -> dict:
    if str(backup.get("kind") or "").strip() != "atlas-backup":
        raise ValueError("Файл не похож на backup ATLAS.")

    sections = backup.get("sections")
    if not isinstance(sections, dict) or not sections:
        raise ValueError("В backup отсутствуют секции для восстановления.")

    replaced_access = False
    discovery_agents_need_tokens = 0

    with connection:
        if "inventory" in sections:
            inventory = sections.get("inventory") or {}
            connection.execute("DELETE FROM discovery_nonces")
            connection.execute("DELETE FROM discovery_runs")
            connection.execute("DELETE FROM discovery_results")
            connection.execute("UPDATE discovery_agents SET linked_host_device_id = '', updated_at = ?", (utc_now_iso(),))
            connection.execute("DELETE FROM devices")
            connection.execute("DELETE FROM range_groups")
            connection.execute("DELETE FROM subnets")

            for subnet in inventory.get("subnets", []):
                insert_subnet_without_commit(connection, subnet)
            for group in inventory.get("groups", []):
                insert_group_without_commit(connection, group)
            for device in inventory.get("devices", []):
                insert_device_without_commit(connection, device)

        if "activity" in sections:
            activity = sections.get("activity") or {}
            connection.execute("DELETE FROM ip_scan_results")
            connection.execute("DELETE FROM ip_history")

            for history in activity.get("history", []):
                insert_history_without_commit(connection, history)
            for scan_result in activity.get("scanResults", []):
                insert_scan_result_without_commit(connection, scan_result)

        if "system" in sections:
            system = sections.get("system") or {}
            connection.execute("DELETE FROM app_settings")
            for item in system.get("appSettings", []):
                connection.execute(
                    """
                    INSERT INTO app_settings (key, value, updated_at)
                    VALUES (?, ?, ?)
                    """,
                    (
                        str(item.get("key") or "").strip(),
                        str(item.get("value") or ""),
                        str(item.get("updatedAt") or utc_now_iso()),
                    ),
                )

        if "access" in sections:
            access = sections.get("access") or {}
            replaced_access = True
            connection.execute("DELETE FROM sessions")
            connection.execute("DELETE FROM user_access_groups")
            connection.execute("DELETE FROM access_groups")
            connection.execute("DELETE FROM users")

            for group in access.get("accessGroups", []):
                connection.execute(
                    """
                    INSERT INTO access_groups (id, name, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        str(group.get("id") or create_id()),
                        str(group.get("name") or "").strip(),
                        str(group.get("description") or "").strip(),
                        str(group.get("createdAt") or utc_now_iso()),
                        str(group.get("updatedAt") or group.get("createdAt") or utc_now_iso()),
                    ),
                )

            for user in access.get("users", []):
                connection.execute(
                    """
                    INSERT INTO users (
                        id, username, display_name, password_hash, role,
                        must_change_password, is_active, is_system_admin, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(user.get("id") or create_id()),
                        sanitize_username(user.get("username")),
                        str(user.get("displayName") or "").strip() or sanitize_username(user.get("username")),
                        str(user.get("passwordHash") or "").strip(),
                        str(user.get("role") or ROLE_VIEWER).strip().lower(),
                        1 if bool(user.get("mustChangePassword")) else 0,
                        1 if bool(user.get("isActive", True)) else 0,
                        1 if bool(user.get("isSystemAdmin")) else 0,
                        str(user.get("createdAt") or utc_now_iso()),
                        str(user.get("updatedAt") or user.get("createdAt") or utc_now_iso()),
                    ),
                )

            for row in access.get("userAccessGroups", []):
                connection.execute(
                    """
                    INSERT INTO user_access_groups (user_id, access_group_id, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (
                        str(row.get("userId") or "").strip(),
                        str(row.get("accessGroupId") or "").strip(),
                        str(row.get("createdAt") or utc_now_iso()),
                    ),
                )
            ensure_system_admin_marker(connection)

        if "preferences" in sections:
            preferences_section = sections.get("preferences") or {}
            existing_user_ids = {
                row["id"]
                for row in connection.execute("SELECT id FROM users")
            }
            if "access" in sections:
                connection.execute("DELETE FROM user_settings")
            for row in preferences_section.get("userSettings", []):
                user_id = str(row.get("userId") or "").strip()
                if not user_id or user_id not in existing_user_ids:
                    continue
                connection.execute(
                    """
                    INSERT INTO user_settings (user_id, key, value, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(user_id, key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = excluded.updated_at
                    """,
                    (
                        user_id,
                        str(row.get("key") or "").strip(),
                        str(row.get("value") or ""),
                        str(row.get("updatedAt") or utc_now_iso()),
                    ),
                )

        if "discovery" in sections:
            discovery = sections.get("discovery") or {}
            connection.execute("DELETE FROM discovery_nonces")
            connection.execute("DELETE FROM discovery_runs")
            connection.execute("DELETE FROM discovery_results")
            connection.execute("DELETE FROM discovery_agents")
            restored_count = import_discovery_agent_definitions(
                connection,
                discovery.get("agents") if isinstance(discovery.get("agents"), list) else [],
                actor,
            )
            discovery_agents_need_tokens = restored_count
            record_discovery_audit_event(
                connection,
                "agents_restored",
                severity="warn",
                actor=actor,
                message="Discovery agent definitions restored. Tokens were not restored.",
                details={"restored": restored_count, "tokensRestored": False},
            )

    bump_revision("backup-imported", {"entity": "backup"})
    signal_background_scanner(run_scan=True)
    return {
        "status": "ok",
        "requiresReauth": replaced_access,
        "discoveryAgentsNeedTokens": discovery_agents_need_tokens,
    }


def get_session_user(connection: sqlite3.Connection, token: str | None) -> dict | None:
    if not token:
        return None

    cleanup_expired_sessions(connection)
    row = connection.execute(
        """
        SELECT users.*, sessions.token
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
          AND sessions.expires_at > ?
        """,
        (token, utc_now_iso()),
    ).fetchone()
    if row is None or not bool(row["is_active"]):
        return None

    now = utc_now_iso()
    connection.execute(
        "UPDATE sessions SET last_seen_at = ? WHERE token = ?",
        (now, token),
    )
    connection.commit()

    user = user_from_row(row)
    user["accessGroupIds"] = get_user_access_group_ids(connection, user["id"])
    return user


def build_auth_payload(user: dict | None, access_groups: list[dict] | None = None) -> dict:
    if user is None:
        return {
            "authenticated": False,
            "user": None,
            "accessGroups": [],
            "capabilities": {
                "isAdmin": False,
                "canWrite": False,
                "canManageUsers": False,
                "canManageServerSettings": False,
                "canManageAccessGroups": False,
            },
        }

    role = user["role"]
    return {
        "authenticated": True,
        "user": user,
        "accessGroups": access_groups or [],
        "capabilities": {
            "isAdmin": role == ROLE_ADMIN,
            "canWrite": role in {ROLE_ADMIN, ROLE_EDITOR},
            "canManageUsers": role == ROLE_ADMIN,
            "canManageServerSettings": role == ROLE_ADMIN,
            "canManageAccessGroups": role == ROLE_ADMIN,
        },
    }


def is_admin(user: dict | None) -> bool:
    return bool(user) and user.get("role") == ROLE_ADMIN


def can_write(user: dict | None) -> bool:
    return bool(user) and user.get("role") in {ROLE_ADMIN, ROLE_EDITOR}


def can_access_subnet(user: dict | None, subnet: dict) -> bool:
    if user is None:
        return False
    if is_admin(user):
        return True
    access_group_id = subnet.get("accessGroupId", "")
    if not access_group_id:
        return True
    return access_group_id in set(user.get("accessGroupIds", []))


def can_assign_access_group(user: dict | None, access_group_id: str) -> bool:
    if not access_group_id:
        return True
    if user is None:
        return False
    if is_admin(user):
        return True
    return access_group_id in set(user.get("accessGroupIds", []))


def get_subnet_by_id(connection: sqlite3.Connection, subnet_id: str) -> dict | None:
    row = connection.execute("SELECT * FROM subnets WHERE id = ?", (subnet_id,)).fetchone()
    if row is None:
        return None
    return subnet_from_db_row_with_access(row)


def require_accessible_subnet(connection: sqlite3.Connection, user: dict, subnet_id: str) -> dict:
    subnet = get_subnet_by_id(connection, subnet_id)
    if subnet is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Подсеть не найдена.")
    if not can_access_subnet(user, subnet):
        raise RequestError(HTTPStatus.FORBIDDEN, "Нет доступа к выбранной подсети.")
    return subnet


def filter_visible_subnets(subnets: list[dict], user: dict) -> list[dict]:
    return [subnet for subnet in subnets if can_access_subnet(user, subnet)]


def load_user_preferences(connection: sqlite3.Connection, user_id: str) -> dict:
    defaults = {
        "operator": "",
        "accentTheme": "atlas",
        "autoRescanAfterDeviceSave": True,
        "modalBlurEnabled": True,
        "suggestionMode": "compact",
        "language": "en",
        "customSignature": "",
        "customGroupTemplates": [],
        "customDeviceTypes": [],
        "customDeviceSources": [],
        "dashboardStatOrder": [],
        "dashboardWidgetColumns": {},
    }
    rows = connection.execute(
        "SELECT key, value FROM user_settings WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    for row in rows:
        key = row["key"]
        raw_value = row["value"]
        if key in {"autoRescanAfterDeviceSave", "modalBlurEnabled"}:
            defaults[key] = raw_value == "1"
        elif key in {"customGroupTemplates", "customDeviceTypes", "customDeviceSources", "dashboardStatOrder", "dashboardWidgetColumns"}:
            try:
                defaults[key] = json.loads(raw_value)
            except json.JSONDecodeError:
                defaults[key] = {} if key == "dashboardWidgetColumns" else []
        else:
            defaults[key] = raw_value
    return defaults


def save_user_preferences(connection: sqlite3.Connection, user_id: str, payload: dict) -> dict:
    allowed_keys = {
        "operator",
        "accentTheme",
        "autoRescanAfterDeviceSave",
        "modalBlurEnabled",
        "suggestionMode",
        "language",
        "customSignature",
        "customGroupTemplates",
        "customDeviceTypes",
        "customDeviceSources",
        "dashboardStatOrder",
        "dashboardWidgetColumns",
    }
    now = utc_now_iso()
    changed = False

    for key in allowed_keys:
        if key not in payload:
            continue

        value = payload[key]
        if key in {"autoRescanAfterDeviceSave", "modalBlurEnabled"}:
            stored_value = "1" if bool(value) else "0"
        elif key in {"customGroupTemplates", "customDeviceTypes", "customDeviceSources", "dashboardStatOrder"}:
            stored_value = json.dumps(value if isinstance(value, list) else [], ensure_ascii=False)
        elif key == "dashboardWidgetColumns":
            stored_value = json.dumps(value if isinstance(value, dict) else {}, ensure_ascii=False)
        else:
            stored_value = str(value or "").strip()

        connection.execute(
            """
            INSERT INTO user_settings (user_id, key, value, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            """,
            (user_id, key, stored_value, now),
        )
        changed = True

    if changed:
        connection.commit()
        bump_revision("preferences-changed", {"entity": "preferences", "userId": user_id})

    return load_user_preferences(connection, user_id)


def enrich_subnet(subnet: dict, access_groups_map: dict[str, dict]) -> dict:
    access_group_id = subnet.get("accessGroupId", "")
    return {
        **subnet,
        "accessGroupId": access_group_id,
        "accessGroupName": access_groups_map.get(access_group_id, {}).get("name", "") if access_group_id else "",
    }


def subnet_from_db_row_with_access(row: sqlite3.Row) -> dict:
    subnet = subnet_from_row(row)
    subnet["accessGroupId"] = row["access_group_id"] or ""
    return subnet


def load_snapshot(connection: sqlite3.Connection, user: dict) -> dict:
    all_access_groups = list_access_groups(connection)
    access_groups_map = {group["id"]: group for group in all_access_groups}
    subnets_all = [
        subnet_from_db_row_with_access(row)
        for row in connection.execute("SELECT * FROM subnets ORDER BY created_at DESC, rowid DESC")
    ]
    subnets = [enrich_subnet(subnet, access_groups_map) for subnet in filter_visible_subnets(subnets_all, user)]
    visible_subnet_ids = {subnet["id"] for subnet in subnets}
    groups = [
        group_from_row(row)
        for row in connection.execute("SELECT * FROM range_groups ORDER BY created_at DESC, rowid DESC")
        if row["subnet_id"] in visible_subnet_ids
    ]
    devices = [
        device_from_row(row)
        for row in connection.execute("SELECT * FROM devices ORDER BY created_at DESC, rowid DESC")
        if row["subnet_id"] in visible_subnet_ids or (is_admin(user) and not row["subnet_id"])
    ]
    scan_results = [
        scan_result_from_row(row)
        for row in connection.execute(
            "SELECT * FROM ip_scan_results ORDER BY checked_at DESC, ip ASC"
        )
        if row["subnet_id"] in visible_subnet_ids
    ]
    history = [
        history_from_row(row)
        for row in connection.execute(
            "SELECT * FROM ip_history ORDER BY changed_at DESC, id DESC LIMIT ?",
            (HISTORY_LIMIT,),
        )
        if is_admin(user) or any(
            subnet["networkInt"] <= int(ip_to_int_value(row["ip"])) <= subnet["broadcastInt"]
            for subnet in subnets
        )
    ]
    last_scan_row = connection.execute(
        "SELECT MAX(checked_at) AS last_scan_at FROM ip_scan_results"
    ).fetchone()
    settings = load_settings(connection)
    auth_access_groups = all_access_groups if is_admin(user) else [
        group for group in all_access_groups if group["id"] in set(user.get("accessGroupIds", []))
    ]
    preferences = load_user_preferences(connection, user["id"])
    return {
        "subnets": subnets,
        "groups": groups,
        "devices": devices,
        "scanResults": scan_results,
        "history": history,
        "accessGroups": auth_access_groups,
        "preferences": preferences,
        "auth": build_auth_payload(user, auth_access_groups),
        "admin": {
            "users": list_users(connection),
            "accessGroups": all_access_groups,
            "discoveryAgents": list_discovery_agents(connection),
            "discoveryResults": list_discovery_results(connection),
            "discoveryAuditEvents": list_discovery_audit_events(connection),
        } if is_admin(user) else None,
        "meta": {
            "revision": get_current_revision(),
            "lastScanAt": last_scan_row["last_scan_at"] if last_scan_row else None,
            "scanInProgress": SCAN_LOCK.locked(),
            "scanIntervalSeconds": settings["scanIntervalSeconds"],
        },
        "settings": settings,
    }


def get_current_revision() -> int:
    with REVISION_LOCK:
        return CURRENT_REVISION


def bump_revision(event_type: str, payload: dict | None = None) -> None:
    global CURRENT_REVISION
    with REVISION_LOCK:
        CURRENT_REVISION += 1
        revision = CURRENT_REVISION

    broadcast_event(
        {
            "type": event_type,
            "revision": revision,
            "at": utc_now_iso(),
            **(payload or {}),
        }
    )


def signal_background_scanner(*, run_scan: bool) -> None:
    global SCAN_EXECUTION_REQUESTED
    with SCAN_SIGNAL_LOCK:
        if run_scan:
            SCAN_EXECUTION_REQUESTED = True
    SCAN_REQUEST_EVENT.set()


def consume_scan_request_signal() -> bool:
    global SCAN_EXECUTION_REQUESTED
    with SCAN_SIGNAL_LOCK:
        should_run_scan = SCAN_EXECUTION_REQUESTED
        SCAN_EXECUTION_REQUESTED = False
    return should_run_scan


def broadcast_event(event: dict) -> None:
    serialized = json.dumps(event, ensure_ascii=False)
    with SUBSCRIBERS_LOCK:
        subscribers = list(SUBSCRIBERS)

    stale_subscribers: list[queue.Queue[str]] = []
    for subscriber in subscribers:
        try:
            subscriber.put_nowait(serialized)
        except queue.Full:
            stale_subscribers.append(subscriber)

    if stale_subscribers:
        with SUBSCRIBERS_LOCK:
            for subscriber in stale_subscribers:
                SUBSCRIBERS.discard(subscriber)


def resolve_actor(handler: BaseHTTPRequestHandler, payload: dict | None = None, user: dict | None = None) -> str:
    actor = handler.headers.get("X-ATLAS-Actor", "").strip()
    if not actor and payload:
        actor = str(payload.get("actor", "")).strip()
    if actor:
        return actor
    if user:
        return user.get("displayName") or user.get("username") or "system"
    return "system"


def get_request_user(connection: sqlite3.Connection, handler: BaseHTTPRequestHandler) -> dict | None:
    cookies = parse_cookie_header(handler.headers.get("Cookie"))
    token = cookies.get(SESSION_COOKIE_NAME)
    return get_session_user(connection, token)


def require_authenticated_user(connection: sqlite3.Connection, handler: BaseHTTPRequestHandler) -> dict:
    user = get_request_user(connection, handler)
    if user is None:
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Требуется вход в ATLAS.")
    return user


def require_admin_user(connection: sqlite3.Connection, handler: BaseHTTPRequestHandler) -> dict:
    user = require_authenticated_user(connection, handler)
    if not is_admin(user):
        raise RequestError(HTTPStatus.FORBIDDEN, "Недостаточно прав для этого действия.")
    return user


def require_write_user(connection: sqlite3.Connection, handler: BaseHTTPRequestHandler) -> dict:
    user = require_authenticated_user(connection, handler)
    if not can_write(user):
        raise RequestError(HTTPStatus.FORBIDDEN, "Текущая роль не может изменять данные.")
    return user


def normalize_scan_interval_seconds(value: object) -> int:
    try:
        interval = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError("Интервал фонового ping должен быть целым числом.") from error

    if interval < MIN_SCAN_INTERVAL_SECONDS or interval > MAX_SCAN_INTERVAL_SECONDS:
        raise ValueError(
            f"Интервал фонового ping должен быть от {MIN_SCAN_INTERVAL_SECONDS} до {MAX_SCAN_INTERVAL_SECONDS} секунд."
        )

    return interval


def get_setting(connection: sqlite3.Connection, key: str) -> str | None:
    row = connection.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    if row is None:
        return None
    return row["value"]


def set_setting(connection: sqlite3.Connection, key: str, value: str) -> None:
    connection.execute(
        """
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        """,
        (key, value, utc_now_iso()),
    )


def normalize_bool_setting(value: object, *, default: bool = True) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def get_scan_interval_seconds(connection: sqlite3.Connection | None = None) -> int:
    def resolve_interval(active_connection: sqlite3.Connection) -> int:
        raw_value = get_setting(active_connection, "scan_interval_seconds")
        if raw_value is None:
            return DEFAULT_SCAN_INTERVAL_SECONDS

        try:
            return normalize_scan_interval_seconds(raw_value)
        except ValueError:
            return DEFAULT_SCAN_INTERVAL_SECONDS

    if connection is not None:
        return resolve_interval(connection)

    with connect_db() as temporary_connection:
        return resolve_interval(temporary_connection)


def get_default_subnet_scan_enabled(connection: sqlite3.Connection | None = None) -> bool:
    def resolve_default(active_connection: sqlite3.Connection) -> bool:
        return normalize_bool_setting(
            get_setting(active_connection, "default_subnet_scan_enabled"),
            default=True,
        )

    if connection is not None:
        return resolve_default(connection)

    with connect_db() as temporary_connection:
        return resolve_default(temporary_connection)


def normalize_discovery_data_policy(value: object) -> dict:
    policy = dict(DEFAULT_DISCOVERY_DATA_POLICY)
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            value = {}
    if not isinstance(value, dict):
        return policy

    for key, default_value in DEFAULT_DISCOVERY_DATA_POLICY.items():
        if key in value:
            policy[key] = normalize_boolean(value.get(key), default_value)
    if policy["storeRawMetadata"]:
        policy["storeRuntime"] = True
        policy["storeLabels"] = True
        policy["storeNetworkDetails"] = True
        policy["storeInternalIps"] = True
    return policy


def get_discovery_data_policy(connection: sqlite3.Connection | None = None) -> dict:
    def resolve_policy(active_connection: sqlite3.Connection) -> dict:
        return normalize_discovery_data_policy(get_setting(active_connection, "discovery_data_policy"))

    if connection is not None:
        return resolve_policy(connection)

    with connect_db() as temporary_connection:
        return resolve_policy(temporary_connection)


def get_effective_discovery_agent_policy(connection: sqlite3.Connection, agent: dict) -> dict:
    override = agent.get("dataPolicyOverride")
    if isinstance(override, dict):
        return normalize_discovery_data_policy(override)
    return get_discovery_data_policy(connection)


def load_settings(connection: sqlite3.Connection) -> dict:
    return {
        "scanIntervalSeconds": get_scan_interval_seconds(connection),
        "defaultSubnetScanEnabled": get_default_subnet_scan_enabled(connection),
        "discoveryDataPolicy": get_discovery_data_policy(connection),
        "scanTimeoutMs": SCAN_TIMEOUT_MS,
        "scanConcurrency": SCAN_CONCURRENCY,
        "limits": {
            "scanIntervalMin": MIN_SCAN_INTERVAL_SECONDS,
            "scanIntervalMax": MAX_SCAN_INTERVAL_SECONDS,
        },
    }


def update_settings(connection: sqlite3.Connection, payload: dict, actor: str = "system") -> dict:
    supported_keys = {"scanIntervalSeconds", "defaultSubnetScanEnabled", "subnetScanSettings", "discoveryDataPolicy"}
    if not any(key in payload for key in supported_keys):
        raise ValueError("Нет поддерживаемых настроек для обновления.")

    interval = get_scan_interval_seconds(connection)
    if "scanIntervalSeconds" in payload:
        interval = normalize_scan_interval_seconds(payload.get("scanIntervalSeconds"))
        set_setting(connection, "scan_interval_seconds", str(interval))

    default_subnet_scan_enabled = get_default_subnet_scan_enabled(connection)
    if "defaultSubnetScanEnabled" in payload:
        default_subnet_scan_enabled = bool(payload.get("defaultSubnetScanEnabled"))
        set_setting(
            connection,
            "default_subnet_scan_enabled",
            "1" if default_subnet_scan_enabled else "0",
        )

    if "subnetScanSettings" in payload:
        subnet_scan_settings = payload.get("subnetScanSettings")
        if not isinstance(subnet_scan_settings, list):
            raise ValueError("Настройки сканирования подсетей должны быть списком.")
        for item in subnet_scan_settings:
            subnet_id = str((item or {}).get("id") or "").strip()
            if not subnet_id:
                continue
            connection.execute(
                "UPDATE subnets SET scan_enabled = ? WHERE id = ?",
                (1 if bool((item or {}).get("scanEnabled")) else 0, subnet_id),
            )

    if "discoveryDataPolicy" in payload:
        discovery_data_policy = normalize_discovery_data_policy(payload.get("discoveryDataPolicy"))
        set_setting(
            connection,
            "discovery_data_policy",
            json.dumps(discovery_data_policy, ensure_ascii=False, sort_keys=True),
        )
        reapply_default_discovery_data_policy(connection, discovery_data_policy)
        record_discovery_audit_event(
            connection,
            "policy_changed",
            actor=actor,
            message="Discovery data policy changed.",
            details={"policy": discovery_data_policy},
        )

    connection.commit()
    bump_revision(
        "settings-changed",
        {
            "entity": "settings",
            "scanIntervalSeconds": interval,
            "defaultSubnetScanEnabled": default_subnet_scan_enabled,
        },
    )
    signal_background_scanner(run_scan=False)
    return load_settings(connection)


def build_session_payload(connection: sqlite3.Connection, user: dict | None) -> dict:
    bootstrap_user = connection.execute(
        """
        SELECT username, must_change_password
        FROM users
        WHERE username = ? COLLATE NOCASE
        LIMIT 1
        """,
        (DEFAULT_BOOTSTRAP_USERNAME,),
    ).fetchone()
    bootstrap_hint = (
        user is None
        and bootstrap_user is not None
        and bool(bootstrap_user["must_change_password"])
    )
    auth_access_groups = []
    if user is not None:
        available_access_groups = list_access_groups(connection)
        auth_access_groups = (
            available_access_groups
            if is_admin(user)
            else [group for group in available_access_groups if group["id"] in set(user.get("accessGroupIds", []))]
        )
    return {
        **build_auth_payload(user, auth_access_groups),
        "bootstrapLoginHint": {
            "username": DEFAULT_BOOTSTRAP_USERNAME,
            "password": DEFAULT_BOOTSTRAP_PASSWORD,
        } if bootstrap_hint else None,
    }


def login_user(connection: sqlite3.Connection, username: object, password: object) -> tuple[dict, str, str]:
    username_value = sanitize_username(username)
    password_value = str(password or "")
    row = connection.execute(
        "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
        (username_value,),
    ).fetchone()
    if row is None or not bool(row["is_active"]) or not verify_password(password_value, row["password_hash"]):
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Неверный логин или пароль.")

    user = user_from_row(row)
    user["accessGroupIds"] = get_user_access_group_ids(connection, user["id"])
    token, expires_at = create_session(connection, user["id"])
    connection.commit()
    return user, token, expires_at


def logout_session(connection: sqlite3.Connection, token: str | None) -> None:
    if not token:
        return
    connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
    connection.commit()


def change_user_password(
    connection: sqlite3.Connection,
    user: dict,
    current_password: object,
    new_password: object,
) -> dict:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Пользователь не найден.")
    if not verify_password(str(current_password or ""), row["password_hash"]):
        raise RequestError(HTTPStatus.BAD_REQUEST, "Текущий пароль указан неверно.")

    new_password_value = require_non_empty_password(new_password)
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE users
        SET password_hash = ?, must_change_password = 0, updated_at = ?
        WHERE id = ?
        """,
        (hash_password(new_password_value), now, user["id"]),
    )
    connection.commit()
    updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    updated_user = user_from_row(updated_row)
    updated_user["accessGroupIds"] = get_user_access_group_ids(connection, updated_user["id"])
    bump_revision("user-password-changed", {"userId": user["id"]})
    return updated_user


def update_current_user_profile(connection: sqlite3.Connection, user: dict, payload: dict) -> dict:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Пользователь не найден.")

    username = sanitize_username(payload.get("username"))
    display_name = sanitize_display_name(payload.get("displayName"), fallback=username)
    now = utc_now_iso()

    connection.execute(
        """
        UPDATE users
        SET username = ?, display_name = ?, updated_at = ?
        WHERE id = ?
        """,
        (username, display_name, now, user["id"]),
    )
    connection.commit()

    updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    updated_user = user_from_row(updated_row)
    updated_user["accessGroupIds"] = get_user_access_group_ids(connection, updated_user["id"])
    bump_revision("user-profile-changed", {"userId": user["id"]})
    return updated_user


def map_integrity_error(error: sqlite3.IntegrityError) -> str:
    message = str(error).lower()
    if "users.username" in message:
        return "Пользователь с таким именем уже существует."
    if "access_groups.name" in message:
        return "Группа доступа с таким именем уже существует."
    if "devices.ip" in message:
        return "Устройство с таким IP уже существует."
    return "Операция нарушает ограничения данных. Проверьте уникальные поля и связи."


def normalize_boolean(value: object, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on", "enabled"}:
        return True
    if normalized in {"0", "false", "no", "off", "disabled"}:
        return False
    return default


def normalize_discovery_agent_kind(value: object) -> str:
    kind = normalize_slug_value(value, default="host")
    if kind not in DISCOVERY_AGENT_KINDS:
        raise ValueError("Некорректный тип агента.")
    if len(kind) > 40:
        raise ValueError("Тип агента слишком длинный.")
    return kind


def normalize_discovery_create_mode(value: object) -> str:
    mode = normalize_slug_value(value, default="preview_only")
    if mode not in DISCOVERY_CREATE_MODES:
        raise ValueError("Некорректный режим create-on-discovery.")
    return mode


def normalize_allowed_cidrs(value: object) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, str):
        raw_items = value.replace("\n", ",").split(",")
    elif isinstance(value, list):
        raw_items = value
    else:
        raise ValueError("Allowed CIDR должен быть списком или строкой.")

    normalized_cidrs: list[str] = []
    seen: set[str] = set()
    for raw_item in raw_items:
        item = str(raw_item or "").strip()
        if not item:
            continue
        try:
            network = ipaddress.ip_network(item, strict=False)
        except ValueError as error:
            raise ValueError(f"Некорректный allowed CIDR: {item}.") from error
        normalized = str(network)
        if normalized in seen:
            continue
        normalized_cidrs.append(normalized)
        seen.add(normalized)

    if len(normalized_cidrs) > 32:
        raise ValueError("Слишком много allowed CIDR для одного агента.")
    return normalized_cidrs


def normalize_discovery_agent_payload(
    connection: sqlite3.Connection,
    payload: dict,
    *,
    current: dict | None = None,
) -> dict:
    source = current or {}
    name = str(payload.get("name", source.get("name", ""))).strip()
    if not name:
        raise ValueError("Имя агента обязательно.")
    if len(name) > 80:
        raise ValueError("Имя агента слишком длинное.")

    kind = normalize_discovery_agent_kind(payload.get("kind", source.get("kind", "host")))
    enabled = normalize_boolean(payload.get("enabled", source.get("enabled", True)), True)
    allowed_cidrs = normalize_allowed_cidrs(payload.get("allowedCidrs", source.get("allowedCidrs", [])))
    create_mode = normalize_discovery_create_mode(payload.get("createMode", source.get("createMode", "preview_only")))
    linked_host_device_id = str(payload.get("linkedHostDeviceId", source.get("linkedHostDeviceId", "")) or "").strip()
    if linked_host_device_id:
        host_exists = connection.execute(
            "SELECT 1 FROM devices WHERE id = ?",
            (linked_host_device_id,),
        ).fetchone()
        if host_exists is None:
            raise ValueError("Указанный host для агента не найден.")

    return {
        "name": name,
        "kind": kind,
        "enabled": enabled,
        "allowedCidrs": allowed_cidrs,
        "createMode": create_mode,
        "linkedHostDeviceId": linked_host_device_id,
    }


def create_discovery_agent(connection: sqlite3.Connection, payload: dict, actor: str = "system") -> dict:
    agent_payload = normalize_discovery_agent_payload(connection, payload)
    agent_id = create_id()
    shared_token_agent_id = str(payload.get("sharedTokenAgentId") or "").strip()
    token = ""
    token_hash = ""
    if shared_token_agent_id:
        shared_row = connection.execute(
            "SELECT token_hash FROM discovery_agents WHERE id = ?",
            (shared_token_agent_id,),
        ).fetchone()
        if shared_row is None:
            raise ValueError("Агент-источник общего токена не найден.")
        token_hash = shared_row["token_hash"]
    else:
        token = generate_agent_token()
        token_hash = hash_agent_token(token)
    now = utc_now_iso()
    connection.execute(
        """
        INSERT INTO discovery_agents (
            id, name, kind, enabled, token_hash, allowed_cidrs, create_mode,
            linked_host_device_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            agent_id,
            agent_payload["name"],
            agent_payload["kind"],
            1 if agent_payload["enabled"] else 0,
            token_hash,
            json.dumps(agent_payload["allowedCidrs"], ensure_ascii=False),
            agent_payload["createMode"],
            agent_payload["linkedHostDeviceId"],
            now,
            now,
        ),
    )
    record_discovery_audit_event(
        connection,
        "agent_created",
        agent_id=agent_id,
        agent_name=agent_payload["name"],
        actor=actor,
        message="Discovery agent created.",
        details={
            "kind": agent_payload["kind"],
            "enabled": agent_payload["enabled"],
            "createMode": agent_payload["createMode"],
            "sharedTokenAgentId": shared_token_agent_id,
        },
    )
    connection.commit()
    bump_revision("discovery-agent-created", {"agentId": agent_id})
    row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    return {
        "agent": discovery_agent_from_row(row),
        "token": token,
        "sharedTokenAgentId": shared_token_agent_id,
    }


def update_discovery_agent(connection: sqlite3.Connection, agent_id: str, payload: dict, actor: str = "system") -> dict:
    row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Discovery agent не найден.")

    current = discovery_agent_from_row(row)
    agent_payload = normalize_discovery_agent_payload(connection, payload, current=current)
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE discovery_agents
        SET name = ?,
            kind = ?,
            enabled = ?,
            allowed_cidrs = ?,
            create_mode = ?,
            linked_host_device_id = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            agent_payload["name"],
            agent_payload["kind"],
            1 if agent_payload["enabled"] else 0,
            json.dumps(agent_payload["allowedCidrs"], ensure_ascii=False),
            agent_payload["createMode"],
            agent_payload["linkedHostDeviceId"],
            now,
            agent_id,
        ),
    )
    if current["enabled"] != agent_payload["enabled"]:
        record_discovery_audit_event(
            connection,
            "agent_enabled" if agent_payload["enabled"] else "agent_disabled",
            agent_id=agent_id,
            agent_name=agent_payload["name"],
            actor=actor,
            message="Discovery agent enabled." if agent_payload["enabled"] else "Discovery agent disabled.",
            details={
                "previousEnabled": current["enabled"],
                "enabled": agent_payload["enabled"],
            },
        )
    else:
        changed_keys = [
            key for key in ("name", "kind", "allowedCidrs", "createMode", "linkedHostDeviceId")
            if current.get(key) != agent_payload.get(key)
        ]
        if changed_keys:
            record_discovery_audit_event(
                connection,
                "agent_updated",
                agent_id=agent_id,
                agent_name=agent_payload["name"],
                actor=actor,
                message="Discovery agent settings changed.",
                details={"changed": changed_keys},
            )
    connection.commit()
    bump_revision("discovery-agent-updated", {"agentId": agent_id})
    updated_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    return discovery_agent_from_row(updated_row)


def update_discovery_agent_data_policy(
    connection: sqlite3.Connection,
    agent_id: str,
    payload: dict,
    actor: str = "system",
) -> dict:
    row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Discovery agent не найден.")

    use_default = normalize_boolean(payload.get("useDefault"), False)
    data_policy_value = ""
    effective_policy = get_discovery_data_policy(connection)
    if not use_default:
        effective_policy = normalize_discovery_data_policy(payload.get("dataPolicy"))
        data_policy_value = json.dumps(effective_policy, ensure_ascii=False, sort_keys=True)

    now = utc_now_iso()
    connection.execute(
        """
        UPDATE discovery_agents
        SET data_policy = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (data_policy_value, now, agent_id),
    )
    reapply_discovery_data_policy(connection, effective_policy, agent_id=agent_id)
    record_discovery_audit_event(
        connection,
        "agent_policy_changed",
        agent_id=agent_id,
        agent_name=row["name"],
        actor=actor,
        message="Discovery agent data policy changed.",
        details={
            "useDefault": use_default,
            "policy": effective_policy,
        },
    )
    connection.commit()
    bump_revision("discovery-agent-policy-updated", {"agentId": agent_id})
    updated_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    return discovery_agent_from_row(updated_row)


def rotate_discovery_agent_token(connection: sqlite3.Connection, agent_id: str, actor: str = "system") -> dict:
    row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Discovery agent не найден.")

    token = generate_agent_token()
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE discovery_agents
        SET token_hash = ?,
            updated_at = ?,
            last_error = '',
            last_rejected_at = '',
            last_reject_reason = ''
        WHERE id = ?
        """,
        (hash_agent_token(token), now, agent_id),
    )
    record_discovery_audit_event(
        connection,
        "token_rotated",
        agent_id=agent_id,
        agent_name=row["name"],
        actor=actor,
        message="Discovery agent token rotated.",
    )
    connection.commit()
    bump_revision("discovery-agent-token-rotated", {"agentId": agent_id})
    updated_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    return {
        "agent": discovery_agent_from_row(updated_row),
        "token": token,
    }


def revoke_discovery_agent_token(connection: sqlite3.Connection, agent_id: str, actor: str = "system") -> dict:
    row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Discovery agent не найден.")

    invalid_token = generate_agent_token()
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE discovery_agents
        SET token_hash = ?,
            enabled = 0,
            updated_at = ?,
            last_error = '',
            last_rejected_at = '',
            last_reject_reason = ''
        WHERE id = ?
        """,
        (hash_agent_token(invalid_token), now, agent_id),
    )
    record_discovery_audit_event(
        connection,
        "token_revoked",
        severity="warn",
        agent_id=agent_id,
        agent_name=row["name"],
        actor=actor,
        message="Discovery agent token revoked.",
    )
    connection.commit()
    bump_revision("discovery-agent-token-revoked", {"agentId": agent_id})
    updated_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    return {
        "agent": discovery_agent_from_row(updated_row),
        "status": "revoked",
    }


def delete_discovery_agent(
    connection: sqlite3.Connection,
    agent_id: str,
    actor: str = "system",
    *,
    delete_related_records: bool = False,
) -> dict:
    row = connection.execute("SELECT id, name FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Discovery agent не найден.")

    linked_rows = connection.execute(
        """
        SELECT DISTINCT matched_device_id AS device_id
        FROM discovery_results
        WHERE agent_id = ?
          AND matched_device_id != ''
        UNION
        SELECT DISTINCT matched_service_id AS device_id
        FROM discovery_results
        WHERE agent_id = ?
          AND matched_service_id != ''
        """,
        (agent_id, agent_id),
    ).fetchall()
    linked_ids = sorted({linked_row["device_id"] for linked_row in linked_rows if linked_row["device_id"]})
    deleted_related_count = 0
    with connection:
        if delete_related_records and linked_ids:
            placeholders = ",".join("?" for _ in linked_ids)
            linked_devices = connection.execute(
                f"SELECT * FROM devices WHERE id IN ({placeholders})",
                linked_ids,
            ).fetchall()
            for device_row in linked_devices:
                device = device_from_row(device_row)
                record_history(
                    connection,
                    device_id=device["id"],
                    device_name=device["name"],
                    ip=device["ip"],
                    previous_ip=device["ip"],
                    action="released",
                    actor=actor,
                    note=f"Discovery agent deleted: {row['name']}",
                )
            cursor = connection.execute(
                f"DELETE FROM devices WHERE id IN ({placeholders})",
                linked_ids,
            )
            deleted_related_count = cursor.rowcount
        record_discovery_audit_event(
            connection,
            "agent_deleted",
            severity="warn",
            agent_id=agent_id,
            agent_name=row["name"],
            actor=actor,
            message="Discovery agent deleted.",
            details={
                "deleteRelatedRecords": delete_related_records,
                "deletedRelatedRecords": deleted_related_count,
            },
        )
        connection.execute("DELETE FROM discovery_agents WHERE id = ?", (agent_id,))
    bump_revision(
        "discovery-agent-deleted",
        {"agentId": agent_id, "deleteRelatedRecords": delete_related_records, "deletedRelatedRecords": deleted_related_count},
    )
    if deleted_related_count:
        signal_background_scanner(run_scan=True)
    return {
        "status": "deleted",
        "agentId": agent_id,
        "name": row["name"],
        "deletedRelatedRecords": deleted_related_count,
    }


def get_bearer_token(header_value: str | None) -> str:
    raw_value = str(header_value or "").strip()
    prefix = "Bearer "
    if not raw_value.startswith(prefix):
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Discovery agent token required.")
    token = raw_value[len(prefix):].strip()
    if not token:
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Discovery agent token required.")
    return token


def get_request_remote_addr(handler: BaseHTTPRequestHandler) -> str:
    return str(handler.client_address[0] if handler.client_address else "").strip()


def is_remote_addr_allowed(agent: dict, remote_addr: str) -> bool:
    allowed_cidrs = agent.get("allowedCidrs") or []
    if not allowed_cidrs:
        return True

    try:
        remote_ip = ipaddress.ip_address(remote_addr)
    except ValueError:
        return False

    for cidr in allowed_cidrs:
        try:
            if remote_ip in ipaddress.ip_network(str(cidr), strict=False):
                return True
        except ValueError:
            continue
    return False


def reject_discovery_agent_snapshot(
    connection: sqlite3.Connection,
    agent_id: str,
    reason: str,
    remote_addr: str,
) -> None:
    now = utc_now_iso()
    agent_row = connection.execute(
        "SELECT name FROM discovery_agents WHERE id = ?",
        (agent_id,),
    ).fetchone()
    connection.execute(
        """
        UPDATE discovery_agents
        SET last_rejected_at = ?,
            last_reject_reason = ?,
            last_remote_addr = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (now, reason[:500], remote_addr, now, agent_id),
    )
    record_discovery_audit_event(
        connection,
        "snapshot_rejected",
        severity="warn",
        agent_id=agent_id,
        agent_name=agent_row["name"] if agent_row else "",
        actor="agent",
        remote_addr=remote_addr,
        message=reason,
    )
    connection.commit()


def validate_discovery_nonce(connection: sqlite3.Connection, agent_id: str, nonce: str) -> None:
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat(timespec="seconds").replace("+00:00", "Z")
    expires_at = (now + timedelta(seconds=DISCOVERY_NONCE_TTL_SECONDS)).isoformat(timespec="seconds").replace("+00:00", "Z")
    connection.execute("DELETE FROM discovery_nonces WHERE expires_at <= ?", (now_iso,))
    try:
        connection.execute(
            """
            INSERT INTO discovery_nonces (agent_id, nonce, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (agent_id, nonce, now_iso, expires_at),
        )
    except sqlite3.IntegrityError as error:
        raise RequestError(HTTPStatus.CONFLICT, "Discovery snapshot nonce was already used.") from error


def normalize_discovery_item(raw_item: object, fallback_source: str, observed_at: str) -> dict:
    if not isinstance(raw_item, dict):
        raise ValueError("Discovery item должен быть объектом.")

    allowed_keys = {
        "source",
        "sourceId",
        "sourceKind",
        "hostDeviceId",
        "name",
        "status",
        "ports",
        "accessPort",
        "serviceUrl",
        "lastSeenAt",
        "raw",
    }
    unknown_keys = sorted(set(raw_item) - allowed_keys)
    if unknown_keys:
        raise ValueError(f"Discovery item содержит неизвестные поля: {', '.join(unknown_keys[:5])}.")

    source = normalize_slug_value(raw_item.get("source") or fallback_source, default=fallback_source or "agent")
    source_id = normalize_optional_text(raw_item.get("sourceId"), 180, "sourceId")
    source_kind = normalize_slug_value(raw_item.get("sourceKind"), default="service")
    name = normalize_optional_text(raw_item.get("name"), 160, "name")
    if not source_id:
        raise ValueError("Discovery item должен содержать sourceId.")
    if not name:
        raise ValueError("Discovery item должен содержать name.")

    raw_metadata = raw_item.get("raw") if isinstance(raw_item.get("raw"), dict) else {}
    raw_json = canonical_json(raw_metadata)
    if len(raw_json.encode("utf-8")) > DISCOVERY_MAX_RAW_BYTES:
        raise RequestError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "raw metadata discovery item слишком большой.")

    return {
        "source": source,
        "sourceId": source_id,
        "sourceKind": source_kind,
        "hostDeviceId": normalize_optional_text(raw_item.get("hostDeviceId"), 80, "hostDeviceId"),
        "name": name,
        "status": normalize_slug_value(raw_item.get("status"), default=""),
        "ports": normalize_device_ports(raw_item.get("ports")),
        "accessPort": normalize_device_ports(raw_item.get("accessPort")),
        "serviceUrl": normalize_optional_text(raw_item.get("serviceUrl"), 500, "serviceUrl"),
        "lastSeenAt": normalize_optional_text(raw_item.get("lastSeenAt") or observed_at, 40, "lastSeenAt"),
        "raw": raw_json,
    }


def normalize_discovery_snapshot_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Discovery payload должен быть объектом.")

    allowed_payload_keys = {"source", "observedAt", "host", "items", "metadata"}
    unknown_payload_keys = sorted(set(payload) - allowed_payload_keys)
    if unknown_payload_keys:
        raise ValueError(f"Discovery payload содержит неизвестные поля: {', '.join(unknown_payload_keys[:5])}.")

    source = normalize_slug_value(payload.get("source"), default="agent")
    observed_at = normalize_optional_text(payload.get("observedAt"), 40, "observedAt") or utc_now_iso()
    items = payload.get("items")
    if not isinstance(items, list):
        raise ValueError("Discovery payload должен содержать items.")
    if len(items) > DISCOVERY_MAX_ITEMS:
        raise RequestError(
            HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
            f"Discovery payload содержит больше {DISCOVERY_MAX_ITEMS} объектов.",
        )

    host = payload.get("host") if isinstance(payload.get("host"), dict) else {}
    metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
    host_json = canonical_json(host)
    metadata_json = canonical_json(metadata)
    if len(host_json.encode("utf-8")) > DISCOVERY_MAX_RAW_BYTES:
        raise RequestError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "host inventory discovery payload слишком большой.")
    if len(metadata_json.encode("utf-8")) > DISCOVERY_MAX_RAW_BYTES:
        raise RequestError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "metadata discovery payload слишком большой.")

    return {
        "source": source,
        "observedAt": observed_at,
        "host": host_json,
        "metadata": metadata_json,
        "items": [normalize_discovery_item(item, source, observed_at) for item in items],
    }


def discovery_raw_field_names(raw: dict) -> list[str]:
    return sorted(
        str(key or "").strip()[:80]
        for key, value in raw.items()
        if str(key or "").strip() and value not in ("", [], {}, None)
    )


def accepted_discovery_raw_fields(policy: dict) -> set[str] | None:
    if policy.get("storeRawMetadata"):
        return None

    fields = set(DISCOVERY_CORE_RAW_FIELDS)
    if policy.get("storeRuntime"):
        fields.update(DISCOVERY_RUNTIME_RAW_FIELDS)
        fields.update(f"disk{index}" for index in range(1, 17))
    if policy.get("storeLabels"):
        fields.update(DISCOVERY_LABEL_RAW_FIELDS)
    if policy.get("storeNetworkDetails") or policy.get("storeInternalIps"):
        fields.update(DISCOVERY_NETWORK_RAW_FIELDS)
    return fields


def filter_discovery_raw_by_policy(raw: dict, policy: dict) -> dict:
    accepted_fields = accepted_discovery_raw_fields(policy)
    if accepted_fields is None:
        return {
            key: value
            for key, value in raw.items()
            if value not in ("", [], {}, None)
        }
    return {
        key: value
        for key, value in raw.items()
        if key in accepted_fields and value not in ("", [], {}, None)
    }


def apply_discovery_data_policy_to_item(item: dict, policy: dict) -> dict:
    raw = decode_json_object(item.get("raw") or "{}")
    received_fields = discovery_raw_field_names(raw)
    accepted_raw = filter_discovery_raw_by_policy(raw, policy)
    accepted_field_names = discovery_raw_field_names(accepted_raw)
    visible_fields = accepted_field_names if policy.get("showMetadataInPreview") else []
    updated_item = dict(item)
    updated_item["raw"] = canonical_json(accepted_raw)
    updated_item["receivedFields"] = received_fields
    updated_item["acceptedFields"] = accepted_field_names
    updated_item["visibleFields"] = visible_fields
    return updated_item


def reapply_discovery_data_policy(connection: sqlite3.Connection, policy: dict, agent_id: str = "") -> None:
    if agent_id:
        rows = connection.execute(
            "SELECT id, raw FROM discovery_results WHERE agent_id = ?",
            (agent_id,),
        ).fetchall()
    else:
        rows = connection.execute("SELECT id, raw FROM discovery_results").fetchall()
    for row in rows:
        accepted_raw = filter_discovery_raw_by_policy(decode_json_object(row["raw"] or "{}"), policy)
        accepted_fields = discovery_raw_field_names(accepted_raw)
        visible_fields = accepted_fields if policy.get("showMetadataInPreview") else []
        connection.execute(
            """
            UPDATE discovery_results
            SET raw = ?,
                accepted_fields = ?,
                visible_fields = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                canonical_json(accepted_raw),
                json.dumps(accepted_fields, ensure_ascii=False),
                json.dumps(visible_fields, ensure_ascii=False),
                utc_now_iso(),
                row["id"],
            ),
        )


def reapply_default_discovery_data_policy(connection: sqlite3.Connection, policy: dict) -> None:
    rows = connection.execute(
        "SELECT id FROM discovery_agents WHERE TRIM(COALESCE(data_policy, '')) = ''"
    ).fetchall()
    if not rows:
        return
    for row in rows:
        reapply_discovery_data_policy(connection, policy, agent_id=row["id"])


def verify_discovery_timestamp(value: object) -> str:
    timestamp = normalize_optional_text(value, 40, "timestamp")
    if not timestamp:
        raise ValueError("Discovery snapshot должен содержать timestamp.")
    try:
        parsed_timestamp = parse_iso8601(timestamp)
    except ValueError as error:
        raise ValueError("Некорректный timestamp discovery snapshot.") from error
    if parsed_timestamp.tzinfo is None:
        parsed_timestamp = parsed_timestamp.replace(tzinfo=timezone.utc)
    skew = abs((datetime.now(timezone.utc) - parsed_timestamp).total_seconds())
    if skew > DISCOVERY_TIMESTAMP_SKEW_SECONDS:
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Discovery snapshot timestamp is outside allowed window.")
    return timestamp


def normalize_discovery_run_id(value: object) -> str:
    run_id = normalize_optional_text(value, 80, "runId")
    if not run_id:
        return ""
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:")
    if any(character not in allowed_chars for character in run_id):
        raise ValueError("Discovery runId содержит недопустимые символы.")
    return run_id


def normalize_discovery_packet_info(value: object, payload_source: str) -> dict:
    if value is None:
        return {
            "source": payload_source,
            "index": 1,
            "total": 1,
        }
    if not isinstance(value, dict):
        raise ValueError("Discovery packet metadata должен быть объектом.")

    unknown_keys = sorted(set(value) - {"source", "index", "total"})
    if unknown_keys:
        raise ValueError(f"Discovery packet metadata содержит неизвестные поля: {', '.join(unknown_keys[:5])}.")

    packet_source = normalize_slug_value(value.get("source") or payload_source, default=payload_source or "agent")
    if packet_source != payload_source:
        raise ValueError("Discovery packet source не совпадает с payload source.")
    try:
        packet_index = int(value.get("index", 1))
        packet_total = int(value.get("total", 1))
    except (TypeError, ValueError) as error:
        raise ValueError("Discovery packet index/total должны быть числами.") from error
    if packet_index < 1 or packet_total < 1 or packet_index > packet_total:
        raise ValueError("Discovery packet index/total некорректны.")
    if packet_total > DISCOVERY_MAX_PACKETS_PER_RUN:
        raise RequestError(
            HTTPStatus.TOO_MANY_REQUESTS,
            f"Discovery run содержит больше {DISCOVERY_MAX_PACKETS_PER_RUN} packets.",
            headers=[("Retry-After", str(DISCOVERY_RETRY_AFTER_SECONDS))],
        )
    return {
        "source": packet_source,
        "index": packet_index,
        "total": packet_total,
    }


def decode_seen_source_ids(value: str) -> dict[str, set[str]]:
    raw_seen = decode_json_object(value)
    seen: dict[str, set[str]] = {}
    for source, source_ids in raw_seen.items():
        if isinstance(source_ids, list):
            normalized_source = normalize_slug_value(source, default="")
            if normalized_source:
                seen[normalized_source] = {str(source_id) for source_id in source_ids if str(source_id)}
    return seen


def encode_seen_source_ids(seen: dict[str, set[str]]) -> str:
    return json.dumps(
        {source: sorted(source_ids) for source, source_ids in sorted(seen.items())},
        ensure_ascii=False,
    )


def is_discovery_replacement_candidate(item: dict) -> bool:
    source = normalize_slug_value(item.get("source"), default="")
    source_kind = normalize_slug_value(item.get("sourceKind"), default="")
    return source == "docker" and source_kind in {"container", "docker-container"}


def find_superseded_discovery_results(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    item: dict,
) -> list[sqlite3.Row]:
    if not is_discovery_replacement_candidate(item):
        return []
    name = str(item.get("name") or "").strip()
    if not name:
        return []
    return connection.execute(
        """
        SELECT id, source_id, matched_device_id, matched_service_id, state
        FROM discovery_results
        WHERE agent_id = ?
          AND source = ?
          AND source_kind = ?
          AND name = ?
          AND source_id != ?
          AND state != 'ignored'
        ORDER BY updated_at DESC, created_at DESC
        """,
        (
            agent_id,
            item["source"],
            item["sourceKind"],
            name,
            item["sourceId"],
        ),
    ).fetchall()


def transfer_superseded_discovery_results(
    connection: sqlite3.Connection,
    *,
    agent: dict,
    item: dict,
    current_result_id: str,
    superseded_rows: list[sqlite3.Row],
    now: str,
) -> int:
    replaced_count = 0
    for row in superseded_rows:
        matched_ids = [
            (row["matched_device_id"] or "", False),
            (row["matched_service_id"] or "", True),
        ]
        for matched_id, is_service in matched_ids:
            if not matched_id:
                continue
            type_condition = "type = 'service'" if is_service else "type != 'service'"
            connection.execute(
                f"""
                UPDATE devices
                SET source = ?,
                    source_kind = ?,
                    source_id = ?,
                    integration_status = COALESCE(NULLIF(?, ''), integration_status),
                    last_seen_at = COALESCE(NULLIF(?, ''), last_seen_at),
                    updated_at = ?
                WHERE id = ?
                  AND {type_condition}
                """,
                (
                    item["source"],
                    item["sourceKind"],
                    item["sourceId"],
                    item["status"],
                    item["lastSeenAt"],
                    now,
                    matched_id,
                ),
            )
        connection.execute("DELETE FROM discovery_results WHERE id = ?", (row["id"],))
        replaced_count += 1
    if replaced_count:
        record_discovery_audit_event(
            connection,
            "discovery_duplicate_replaced",
            agent_id=agent["id"],
            agent_name=agent.get("name", ""),
            actor="agent",
            message="Superseded discovery result replaced by a newer source identity.",
            details={
                "resultId": current_result_id,
                "source": item["source"],
                "sourceId": item["sourceId"],
                "name": item["name"],
                "replaced": replaced_count,
            },
        )
    return replaced_count


def update_discovery_linked_records(
    connection: sqlite3.Connection,
    *,
    matched_device_id: str = "",
    matched_service_id: str = "",
    status: str = "",
    last_seen_at: str = "",
    ports: str = "",
    access_port: str = "",
    service_url: str = "",
) -> int:
    updated_count = 0
    status_value = normalize_slug_value(status, default="") if status else ""
    linked_updates = [
        (matched_device_id, False),
        (matched_service_id, True),
    ]
    for linked_id, is_service in linked_updates:
        if not linked_id:
            continue
        row = connection.execute(
            "SELECT id, integration_status, integration_status_changed_at FROM devices WHERE id = ?",
            (linked_id,),
        ).fetchone()
        if row is None:
            continue
        status_changed_at = row["integration_status_changed_at"] or ""
        if status_value and status_value != (row["integration_status"] or ""):
            status_changed_at = last_seen_at or utc_now_iso()
        if is_service:
            connection.execute(
                """
                UPDATE devices
                SET integration_status = ?,
                    integration_status_changed_at = ?,
                    last_seen_at = COALESCE(NULLIF(?, ''), last_seen_at),
                    ports = COALESCE(NULLIF(?, ''), ports),
                    service_url = COALESCE(NULLIF(?, ''), service_url)
                WHERE id = ?
                """,
                (status_value, status_changed_at, last_seen_at, ports, service_url, linked_id),
            )
        else:
            connection.execute(
                """
                UPDATE devices
                SET integration_status = ?,
                    integration_status_changed_at = ?,
                    last_seen_at = COALESCE(NULLIF(?, ''), last_seen_at)
                WHERE id = ?
                """,
                (status_value, status_changed_at, last_seen_at, linked_id),
            )
        updated_count += 1
    return updated_count


def mark_missing_discovery_results_stale(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    source: str,
    seen_source_ids: set[str],
    now: str,
) -> int:
    stale_count = 0
    rows = connection.execute(
        """
        SELECT id, source_id, matched_device_id, matched_service_id
        FROM discovery_results
        WHERE agent_id = ?
          AND source = ?
          AND state NOT IN ('ignored', 'stale')
        """,
        (agent_id, source),
    ).fetchall()
    for row in rows:
        if row["source_id"] in seen_source_ids:
            continue
        connection.execute(
            "UPDATE discovery_results SET state = 'stale', updated_at = ? WHERE id = ?",
            (now, row["id"]),
        )
        update_discovery_linked_records(
            connection,
            matched_device_id=row["matched_device_id"] or "",
            matched_service_id=row["matched_service_id"] or "",
            status="source_missing",
        )
        stale_count += 1
    return stale_count


def get_snapshot_active_sources(snapshot: dict) -> set[str]:
    active_sources = {item["source"] for item in snapshot["items"] if item.get("source")}
    try:
        metadata = json.loads(snapshot.get("metadata") or "{}")
    except json.JSONDecodeError:
        metadata = {}
    if not isinstance(metadata, dict):
        return active_sources

    raw_sources = metadata.get("activeSources")
    if isinstance(raw_sources, list):
        for raw_source in raw_sources:
            try:
                active_sources.add(normalize_slug_value(raw_source, default=""))
            except ValueError:
                continue
    return {source for source in active_sources if source}


def normalize_reported_agent_timing(snapshot: dict) -> tuple[int, int]:
    try:
        metadata = json.loads(snapshot.get("metadata") or "{}")
    except json.JSONDecodeError:
        metadata = {}
    if not isinstance(metadata, dict):
        return 0, 0
    timing = metadata.get("agentTiming")
    if not isinstance(timing, dict):
        return 0, 0

    def parse_seconds(key: str, *, minimum: int = 0, maximum: int = 86400) -> int:
        try:
            value = int(timing.get(key) or 0)
        except (TypeError, ValueError):
            return 0
        if value < minimum or value > maximum:
            return 0
        return value

    return (
        parse_seconds("sendIntervalSeconds", minimum=15) or parse_seconds("intervalSeconds", minimum=15),
        parse_seconds("requestTimeoutSeconds", minimum=2),
    )


def save_discovery_snapshot(
    connection: sqlite3.Connection,
    agent: dict,
    snapshot: dict,
    remote_addr: str,
    external_run_id: str = "",
    packet_info: dict | None = None,
) -> dict:
    now = utc_now_iso()
    run_id = create_id()
    updated_count = 0
    stale_count = 0
    created_count = 0
    replaced_count = 0
    item_ids: list[str] = []
    seen_source_ids_by_source: dict[str, set[str]] = {}
    reported_interval_seconds, reported_timeout_seconds = normalize_reported_agent_timing(snapshot)
    discovery_data_policy = get_effective_discovery_agent_policy(connection, agent)
    policy_items = [
        apply_discovery_data_policy_to_item(item, discovery_data_policy)
        for item in snapshot["items"]
    ]
    for item in policy_items:
        seen_source_ids_by_source.setdefault(item["source"], set()).add(item["sourceId"])
    active_sources = get_snapshot_active_sources(snapshot)
    packet_sources = {source for source in active_sources if source}
    if snapshot.get("source"):
        packet_sources.add(snapshot["source"])
    packet_info = packet_info or {"source": snapshot["source"], "index": 1, "total": 1}
    is_final_source_packet = int(packet_info.get("index", 1)) >= int(packet_info.get("total", 1))
    with connection:
        existing_run = None
        if external_run_id:
            existing_run = connection.execute(
                """
                SELECT id, sources, packet_count, seen_source_ids
                FROM discovery_runs
                WHERE agent_id = ? AND external_run_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (agent["id"], external_run_id),
            ).fetchone()

        if existing_run is not None:
            if int(existing_run["packet_count"] or 0) >= DISCOVERY_MAX_PACKETS_PER_RUN:
                raise RequestError(
                    HTTPStatus.TOO_MANY_REQUESTS,
                    f"Discovery run содержит больше {DISCOVERY_MAX_PACKETS_PER_RUN} packets.",
                    headers=[("Retry-After", str(DISCOVERY_RETRY_AFTER_SECONDS))],
                )
            run_id = existing_run["id"]
            packet_sources.update(decode_json_list(existing_run["sources"] or "[]"))
            cumulative_seen_source_ids = decode_seen_source_ids(existing_run["seen_source_ids"] or "{}")
        else:
            cumulative_seen_source_ids = {}
            connection.execute(
                """
                INSERT INTO discovery_runs (
                    id, agent_id, external_run_id, schema, source, sources, status,
                    started_at, finished_at, packet_count, found_count, updated_count,
                    remote_addr, seen_source_ids, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    agent["id"],
                    external_run_id,
                    DISCOVERY_SCHEMA,
                    snapshot["source"],
                    json.dumps(sorted(packet_sources), ensure_ascii=False),
                    "running",
                    now,
                    "",
                    0,
                    0,
                    0,
                    remote_addr,
                    "{}",
                    now,
                ),
            )

        for source, source_ids in seen_source_ids_by_source.items():
            cumulative_seen_source_ids.setdefault(source, set()).update(source_ids)

        for item in policy_items:
            host_device_id = resolve_discovery_host_id_for_item(connection, agent, item)
            auto_matched_device_id = ""
            if item["sourceKind"] == "host" and agent.get("linkedHostDeviceId"):
                auto_matched_device_id = agent.get("linkedHostDeviceId", "")
            if not auto_matched_device_id:
                existing_device_id = find_existing_device_id_for_discovery_item(connection, item)
                if existing_device_id and existing_device_id != host_device_id:
                    auto_matched_device_id = existing_device_id
            superseded_rows = find_superseded_discovery_results(
                connection,
                agent_id=agent["id"],
                item=item,
            )
            inherited_matched_device_id = next((row["matched_device_id"] or "" for row in superseded_rows if row["matched_device_id"]), "")
            inherited_matched_service_id = next((row["matched_service_id"] or "" for row in superseded_rows if row["matched_service_id"]), "")
            existing = connection.execute(
                """
                SELECT id, state, matched_device_id, matched_service_id
                FROM discovery_results
                WHERE agent_id = ? AND source = ? AND source_id = ?
                """,
                (agent["id"], item["source"], item["sourceId"]),
            ).fetchone()
            result_id = existing["id"] if existing else create_id()
            if existing and existing["state"] == "ignored":
                state = "ignored"
            elif existing and (existing["state"] == "matched" or existing["matched_device_id"] or existing["matched_service_id"]):
                state = "matched"
            elif inherited_matched_device_id or inherited_matched_service_id:
                state = "matched"
            elif auto_matched_device_id:
                state = "matched"
            else:
                state = "new"
            connection.execute(
                """
                INSERT INTO discovery_results (
                    id, agent_id, source, source_id, source_kind, host_device_id,
                    name, status, ports, access_port, service_url, last_seen_at,
                    matched_device_id, matched_service_id, state, raw,
                    received_fields, accepted_fields, visible_fields, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(agent_id, source, source_id) DO UPDATE SET
                    source_kind = excluded.source_kind,
                    host_device_id = excluded.host_device_id,
                    name = excluded.name,
                    status = excluded.status,
                    ports = excluded.ports,
                    access_port = excluded.access_port,
                    service_url = excluded.service_url,
                    last_seen_at = excluded.last_seen_at,
                    matched_device_id = CASE
                        WHEN discovery_results.state = 'ignored' THEN discovery_results.matched_device_id
                        WHEN discovery_results.matched_device_id != '' THEN discovery_results.matched_device_id
                        WHEN excluded.matched_device_id != '' THEN excluded.matched_device_id
                        ELSE discovery_results.matched_device_id
                    END,
                    matched_service_id = CASE
                        WHEN discovery_results.state = 'ignored' THEN discovery_results.matched_service_id
                        WHEN discovery_results.matched_service_id != '' THEN discovery_results.matched_service_id
                        WHEN excluded.matched_service_id != '' THEN excluded.matched_service_id
                        ELSE discovery_results.matched_service_id
                    END,
                    state = CASE
                        WHEN discovery_results.state = 'ignored' THEN 'ignored'
                    ELSE excluded.state
                    END,
                    raw = excluded.raw,
                    received_fields = excluded.received_fields,
                    accepted_fields = excluded.accepted_fields,
                    visible_fields = excluded.visible_fields,
                    updated_at = excluded.updated_at
                """,
                (
                    result_id,
                    agent["id"],
                    item["source"],
                    item["sourceId"],
                    item["sourceKind"],
                    host_device_id,
                    item["name"],
                    item["status"],
                    item["ports"],
                    item["accessPort"],
                    item["serviceUrl"],
                    item["lastSeenAt"],
                    auto_matched_device_id or inherited_matched_device_id,
                    inherited_matched_service_id,
                    state,
                    item["raw"],
                    json.dumps(item["receivedFields"], ensure_ascii=False),
                    json.dumps(item["acceptedFields"], ensure_ascii=False),
                    json.dumps(item["visibleFields"], ensure_ascii=False),
                    now,
                    now,
                ),
            )
            current_result = get_discovery_result_row(connection, result_id)
            if superseded_rows:
                replaced_count += transfer_superseded_discovery_results(
                    connection,
                    agent=agent,
                    item=item,
                    current_result_id=result_id,
                    superseded_rows=superseded_rows,
                    now=now,
                )
                current_result = get_discovery_result_row(connection, result_id)
            if current_result["state"] == "matched":
                update_discovery_linked_records(
                    connection,
                    matched_device_id=current_result["matched_device_id"] or "",
                    matched_service_id=current_result["matched_service_id"] or "",
                    status=item["status"],
                    last_seen_at=item["lastSeenAt"],
                    ports=item["ports"],
                    access_port=item["accessPort"],
                    service_url=item["serviceUrl"],
                )
                enrich_linked_record_from_discovery(
                    connection,
                    current_result,
                    target_id=current_result["matched_device_id"] or "",
                    target_type="device",
                )
                enrich_linked_record_from_discovery(
                    connection,
                    current_result,
                    target_id=current_result["matched_service_id"] or "",
                    target_type="service",
                )
            updated_count += 1
            item_ids.append(result_id)

        if is_final_source_packet:
            for source in active_sources:
                stale_count += mark_missing_discovery_results_stale(
                    connection,
                    agent_id=agent["id"],
                    source=source,
                    seen_source_ids=cumulative_seen_source_ids.get(source, set()),
                    now=now,
                )

        connection.execute(
            """
            UPDATE discovery_runs
            SET status = 'completed',
                source = ?,
                sources = ?,
                finished_at = ?,
                packet_count = packet_count + 1,
                found_count = found_count + ?,
                updated_count = updated_count + ?,
                stale_count = stale_count + ?,
                remote_addr = ?,
                seen_source_ids = ?,
                error = ''
            WHERE id = ?
            """,
            (
                snapshot["source"],
                json.dumps(sorted(packet_sources), ensure_ascii=False),
                now,
                len(policy_items),
                updated_count,
                stale_count,
                remote_addr,
                encode_seen_source_ids(cumulative_seen_source_ids),
                run_id,
            ),
        )

        connection.execute(
            """
            UPDATE discovery_agents
            SET last_seen_at = ?,
                reported_interval_seconds = CASE WHEN ? > 0 THEN ? ELSE reported_interval_seconds END,
                reported_timeout_seconds = CASE WHEN ? > 0 THEN ? ELSE reported_timeout_seconds END,
                last_error = '',
                last_remote_addr = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                now,
                reported_interval_seconds,
                reported_interval_seconds,
                reported_timeout_seconds,
                reported_timeout_seconds,
                remote_addr,
                now,
                agent["id"],
            ),
        )

    created_count = auto_create_discovery_records(connection, agent, item_ids)
    if created_count:
        connection.execute(
            "UPDATE discovery_runs SET created_count = created_count + ? WHERE id = ?",
            (created_count, run_id),
        )
        connection.commit()

    record_discovery_audit_event(
        connection,
        "snapshot_accepted",
        agent_id=agent["id"],
        agent_name=agent.get("name", ""),
        actor="agent",
        remote_addr=remote_addr,
        message="Discovery snapshot accepted.",
        details={
            "runId": run_id,
            "agentRunId": external_run_id,
            "source": snapshot["source"],
            "packet": packet_info,
                "received": updated_count,
                "stale": stale_count,
                "created": created_count,
                "replaced": replaced_count,
            },
    )
    connection.commit()
    bump_revision(
        "discovery-snapshot-received",
        {"agentId": agent["id"], "items": updated_count, "stale": stale_count, "created": created_count},
    )
    return {
        "status": "accepted",
        "runId": run_id,
        "agentRunId": external_run_id,
        "agentId": agent["id"],
        "source": snapshot["source"],
        "packet": packet_info,
        "received": updated_count,
        "stale": stale_count,
        "created": created_count,
        "replaced": replaced_count,
        "resultIds": item_ids,
    }


def ingest_discovery_snapshot(
    connection: sqlite3.Connection,
    envelope: dict,
    handler: BaseHTTPRequestHandler,
) -> dict:
    if not isinstance(envelope, dict):
        raise ValueError("Discovery snapshot должен быть объектом.")
    allowed_keys = {"agentId", "schema", "schemaKey", "timestamp", "nonce", "runId", "packet", "payload", "signature"}
    unknown_keys = sorted(set(envelope) - allowed_keys)
    if unknown_keys:
        raise ValueError(f"Discovery snapshot содержит неизвестные поля: {', '.join(unknown_keys[:5])}.")

    remote_addr = get_request_remote_addr(handler)
    agent_id = normalize_optional_text(envelope.get("agentId"), 80, "agentId")
    if not agent_id:
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Discovery agent is unknown.")

    agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    if agent_row is None:
        raise RequestError(HTTPStatus.UNAUTHORIZED, "Discovery agent is unknown.")
    agent = discovery_agent_from_row(agent_row)

    def reject(status: HTTPStatus, reason: str, headers: list[tuple[str, str]] | None = None) -> None:
        reject_discovery_agent_snapshot(connection, agent_id, reason, remote_addr)
        raise RequestError(status, reason, headers=headers)

    if not agent["enabled"]:
        reject(HTTPStatus.FORBIDDEN, "Discovery agent is disabled.")
    if not is_remote_addr_allowed(agent, remote_addr):
        reject(HTTPStatus.FORBIDDEN, "Discovery agent remote address is not allowed.")

    try:
        token = get_bearer_token(handler.headers.get("Authorization"))
    except RequestError as error:
        reject(error.status, error.message, headers=error.headers)
    if not hmac.compare_digest(hash_agent_token(token), agent_row["token_hash"]):
        reject(HTTPStatus.UNAUTHORIZED, "Discovery agent token is invalid.")

    schema = normalize_optional_text(envelope.get("schema"), 80, "schema")
    if schema != DISCOVERY_SCHEMA:
        reject(HTTPStatus.BAD_REQUEST, "Discovery schema is not supported.")
    try:
        timestamp = verify_discovery_timestamp(envelope.get("timestamp"))
    except ValueError as error:
        reject(HTTPStatus.BAD_REQUEST, str(error))
    except RequestError as error:
        reject(error.status, error.message, headers=error.headers)
    nonce = normalize_optional_text(envelope.get("nonce"), 128, "nonce")
    if not nonce:
        reject(HTTPStatus.BAD_REQUEST, "Discovery snapshot nonce is required.")
    try:
        run_id = normalize_discovery_run_id(envelope.get("runId"))
    except ValueError as error:
        reject(HTTPStatus.BAD_REQUEST, str(error))

    expected_schema_key = hmac_sha256_hex(token, f"schema:{schema}")
    if not hmac.compare_digest(normalize_signature_value(envelope.get("schemaKey")), expected_schema_key):
        reject(HTTPStatus.UNAUTHORIZED, "Discovery schemaKey is invalid.")

    payload = envelope.get("payload")
    signature_payload = {
        "schema": schema,
        "timestamp": timestamp,
        "nonce": nonce,
        "payload": payload,
    }
    if run_id:
        signature_payload["runId"] = run_id
    if envelope.get("packet") is not None:
        signature_payload["packet"] = envelope.get("packet")
    expected_signature = hmac_sha256_hex(token, canonical_json(signature_payload))
    if not hmac.compare_digest(normalize_signature_value(envelope.get("signature")), expected_signature):
        reject(HTTPStatus.UNAUTHORIZED, "Discovery signature is invalid.")

    validate_discovery_nonce(connection, agent_id, nonce)
    try:
        snapshot = normalize_discovery_snapshot_payload(payload)
    except ValueError as error:
        reject(HTTPStatus.BAD_REQUEST, str(error))
    except RequestError as error:
        reject(error.status, error.message, headers=error.headers)
    try:
        packet_info = normalize_discovery_packet_info(envelope.get("packet"), snapshot["source"])
    except ValueError as error:
        reject(HTTPStatus.BAD_REQUEST, str(error))
    except RequestError as error:
        reject(error.status, error.message, headers=error.headers)
    return save_discovery_snapshot(
        connection,
        agent,
        snapshot,
        remote_addr,
        external_run_id=run_id,
        packet_info=packet_info,
    )


def update_discovery_result_state(
    connection: sqlite3.Connection,
    result_id: str,
    state: str,
) -> dict:
    if state not in DISCOVERY_RESULT_STATES:
        raise ValueError("Некорректное состояние найденного объекта.")
    now = utc_now_iso()
    cursor = connection.execute(
        "UPDATE discovery_results SET state = ?, updated_at = ? WHERE id = ?",
        (state, now, result_id),
    )
    connection.commit()
    if cursor.rowcount == 0:
        raise RequestError(HTTPStatus.NOT_FOUND, "Найденный объект не найден.")
    bump_revision("discovery-result-updated", {"resultId": result_id, "state": state})
    return get_discovery_result(connection, result_id)


def delete_discovery_result(
    connection: sqlite3.Connection,
    result_id: str,
    actor: str,
) -> dict:
    row = get_discovery_result_row(connection, result_id)
    if row["state"] not in {"stale", "error", "ignored"}:
        raise ValueError("Удалять из preview можно только stale, error или ignored объекты.")
    connection.execute("DELETE FROM discovery_results WHERE id = ?", (result_id,))
    record_discovery_audit_event(
        connection,
        "discovery_result_deleted",
        agent_id=row["agent_id"],
        agent_name=row["agent_name"] or "",
        actor=actor,
        message="Discovery result removed from preview.",
        details={
            "resultId": result_id,
            "source": row["source"],
            "sourceId": row["source_id"],
            "name": row["name"],
            "state": row["state"],
        },
    )
    connection.commit()
    bump_revision("discovery-result-deleted", {"resultId": result_id})
    return {"status": "deleted", "resultId": result_id}


def can_bulk_delete_discovery_linked_record(row: sqlite3.Row, device: sqlite3.Row) -> bool:
    if device["note"] != "Agent":
        return False
    return (
        (device["source"] or "") == (row["source"] or "")
        and (device["source_id"] or "") == (row["source_id"] or "")
    )


def cleanup_stale_discovery_results(
    connection: sqlite3.Connection,
    actor: str,
    *,
    delete_linked_records: bool = True,
) -> dict:
    rows = connection.execute(
        """
        SELECT
            discovery_results.*,
            discovery_agents.name AS agent_name
        FROM discovery_results
        LEFT JOIN discovery_agents ON discovery_agents.id = discovery_results.agent_id
        WHERE discovery_results.state = 'stale'
        ORDER BY discovery_results.updated_at DESC, discovery_results.created_at DESC
        """
    ).fetchall()
    if not rows:
        return {"status": "clean", "deletedResults": 0, "deletedLinkedRecords": 0}

    linked_ids: set[str] = set()
    if delete_linked_records:
        for row in rows:
            for key in ("matched_service_id", "matched_device_id"):
                device_id = row[key] or ""
                if not device_id:
                    continue
                device_row = connection.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
                if device_row is not None and can_bulk_delete_discovery_linked_record(row, device_row):
                    linked_ids.add(device_id)

    deleted_linked_count = 0
    with connection:
        if linked_ids:
            linked_rows = connection.execute(
                f"SELECT * FROM devices WHERE id IN ({','.join('?' for _ in linked_ids)})",
                sorted(linked_ids),
            ).fetchall()
            for device_row in linked_rows:
                device = device_from_row(device_row)
                record_history(
                    connection,
                    device_id=device["id"],
                    device_name=device["name"],
                    ip=device["ip"],
                    previous_ip=device["ip"],
                    action="released",
                    actor=actor,
                    note="Discovery stale cleanup",
                )
            delete_cursor = connection.execute(
                f"DELETE FROM devices WHERE id IN ({','.join('?' for _ in linked_ids)})",
                sorted(linked_ids),
            )
            deleted_linked_count = delete_cursor.rowcount
        result_ids = [row["id"] for row in rows]
        connection.execute(
            f"DELETE FROM discovery_results WHERE id IN ({','.join('?' for _ in result_ids)})",
            result_ids,
        )
        record_discovery_audit_event(
            connection,
            "discovery_stale_cleanup",
            severity="warn",
            actor=actor,
            message="Stale discovery results cleaned in bulk.",
            details={
                "deletedResults": len(result_ids),
                "deletedLinkedRecords": deleted_linked_count,
                "deleteLinkedRecords": delete_linked_records,
            },
        )
    bump_revision(
        "discovery-stale-cleanup",
        {"deletedResults": len(rows), "deletedLinkedRecords": deleted_linked_count},
    )
    signal_background_scanner(run_scan=True)
    return {
        "status": "cleaned",
        "deletedResults": len(rows),
        "deletedLinkedRecords": deleted_linked_count,
    }


def link_discovery_result(
    connection: sqlite3.Connection,
    result_id: str,
    payload: dict,
) -> dict:
    target_id = str(payload.get("targetId") or "").strip()
    target_type = str(payload.get("targetType") or "").strip().lower()
    if target_type not in {"device", "service"}:
        raise ValueError("Нужно выбрать тип связи: device или service.")
    target_row = get_device_row(connection, target_id)
    if target_row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Запись для связи не найдена.")
    target = device_from_row(target_row)
    if target_type == "service" and target["type"] != "service":
        raise ValueError("Для связи с сервисом выбрана не сервисная запись.")
    if target_type == "device" and target["type"] == "service":
        raise ValueError("Для связи с устройством выбрана сервисная запись.")

    row = get_discovery_result_row(connection, result_id)
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE discovery_results
        SET matched_device_id = ?,
            matched_service_id = ?,
            state = 'matched',
            updated_at = ?
        WHERE id = ?
        """,
        (
            target_id if target_type == "device" else row["matched_device_id"],
            target_id if target_type == "service" else row["matched_service_id"],
            now,
            result_id,
        ),
    )
    linked_row = get_discovery_result_row(connection, result_id)
    enrich_linked_record_from_discovery(
        connection,
        linked_row,
        target_id=target_id,
        target_type=target_type,
    )
    if target_type == "device" and normalize_slug_value(row["source_kind"], default="") == "host":
        ensure_agent_linked_host(connection, row["agent_id"], target_id)
    connection.commit()
    bump_revision("discovery-result-linked", {"resultId": result_id, "targetId": target_id})
    return get_discovery_result(connection, result_id)


def first_raw_value(raw: dict, keys: list[str]) -> str:
    for key in keys:
        value = raw.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def enrich_linked_record_from_discovery(
    connection: sqlite3.Connection,
    row: sqlite3.Row,
    *,
    target_id: str,
    target_type: str,
) -> None:
    if not target_id:
        return
    raw = decode_discovery_raw(row)
    source = row["source"] or "agent"
    source_kind = row["source_kind"] or target_type
    source_id = row["source_id"] or ""
    status_value = normalize_slug_value(row["status"], default="") if row["status"] else ""
    last_seen_at = row["last_seen_at"] or ""

    if target_type == "device":
        mac = first_raw_value(raw, ["mac", "macAddress", "mac_address"])
        host_device_id = row["host_device_id"] or row["agent_linked_host_device_id"] or ""
        connection.execute(
            """
            UPDATE devices
            SET mac = CASE WHEN COALESCE(mac, '') = '' THEN ? ELSE mac END,
                host_device_id = CASE
                    WHEN COALESCE(host_device_id, '') = '' AND id != ? THEN ?
                    ELSE host_device_id
                END,
                source = CASE WHEN COALESCE(source, '') = '' THEN ? ELSE source END,
                source_kind = CASE WHEN COALESCE(source_kind, '') = '' THEN ? ELSE source_kind END,
                source_id = CASE WHEN COALESCE(source_id, '') = '' THEN ? ELSE source_id END,
                integration_status = COALESCE(NULLIF(?, ''), integration_status),
                last_seen_at = COALESCE(NULLIF(?, ''), last_seen_at)
            WHERE id = ?
              AND type != 'service'
            """,
            (
                mac,
                host_device_id,
                host_device_id,
                source,
                source_kind,
                source_id,
                status_value,
                last_seen_at,
                target_id,
            ),
        )
        return

    if target_type == "service":
        protocol = first_raw_value(raw, ["protocol", "scheme"])
        host_device_id = row["host_device_id"] or row["agent_linked_host_device_id"] or ""
        connection.execute(
            """
            UPDATE devices
            SET host_device_id = CASE WHEN COALESCE(host_device_id, '') = '' THEN ? ELSE host_device_id END,
                source = CASE WHEN COALESCE(source, '') = '' THEN ? ELSE source END,
                source_kind = CASE WHEN COALESCE(source_kind, '') = '' THEN ? ELSE source_kind END,
                source_id = CASE WHEN COALESCE(source_id, '') = '' THEN ? ELSE source_id END,
                integration_status = COALESCE(NULLIF(?, ''), integration_status),
                protocol = COALESCE(NULLIF(?, ''), protocol),
                service_url = COALESCE(NULLIF(?, ''), service_url),
                access_port = COALESCE(NULLIF(?, ''), access_port),
                ports = COALESCE(NULLIF(?, ''), ports),
                last_seen_at = COALESCE(NULLIF(?, ''), last_seen_at)
            WHERE id = ?
              AND type = 'service'
            """,
            (
                host_device_id,
                source,
                source_kind,
                source_id,
                status_value,
                protocol,
                row["service_url"] or "",
                row["access_port"] or "",
                row["ports"] or "",
                last_seen_at,
                target_id,
            ),
        )


def discovery_device_type(source_kind: str, raw: dict) -> str:
    raw_type = normalize_slug_value(raw.get("type"), default="") if raw.get("type") else ""
    kind = normalize_slug_value(raw_type or source_kind, default="server")
    if kind in {"iot", "sensor", "controller"}:
        return "iot"
    if kind in {"container", "docker-container"}:
        return "container"
    if kind == "service":
        return "server"
    if kind in {"vm", "virtual-machine", "lxc", "proxmox-vm", "proxmox-lxc", "node", "host"}:
        return "server"
    return kind


def is_discovery_template_row(row: sqlite3.Row) -> bool:
    source_kind = normalize_slug_value(row["source_kind"], default="")
    if source_kind == "template":
        return True
    raw = decode_discovery_raw(row)
    return bool(raw.get("template"))


def discovery_result_target_type(row: sqlite3.Row) -> str:
    if is_discovery_template_row(row):
        return "template"
    source = normalize_slug_value(row["source"], default="")
    source_kind = normalize_slug_value(row["source_kind"], default="")
    if source == "docker" or source_kind in {"service", "container", "docker-container", "pod", "workload"}:
        return "service"
    return "device"


def find_existing_record_for_discovery(
    connection: sqlite3.Connection,
    row: sqlite3.Row,
    target_type: str,
) -> dict | None:
    if target_type == "template":
        return None
    type_condition = "type = 'service'" if target_type == "service" else "type != 'service'"
    existing_row = connection.execute(
        f"""
        SELECT *
        FROM devices
        WHERE source = ?
          AND source_id = ?
          AND {type_condition}
        ORDER BY created_at ASC
        LIMIT 1
        """,
        (row["source"], row["source_id"]),
    ).fetchone()
    if existing_row is not None:
        return device_from_row(existing_row)

    if target_type == "device":
        raw = decode_discovery_raw(row)
        ip = first_raw_value(raw, ["primaryIp", "primary_ip", "ip", "address"])
        if ip:
            ip_row = connection.execute(
                "SELECT * FROM devices WHERE ip = ? AND type != 'service' ORDER BY created_at ASC LIMIT 1",
                (ip,),
            ).fetchone()
            if ip_row is not None:
                return device_from_row(ip_row)
    return None


def ensure_agent_linked_host(
    connection: sqlite3.Connection,
    agent_id: str,
    host_device_id: str,
) -> None:
    if not host_device_id:
        return
    row = connection.execute(
        "SELECT linked_host_device_id FROM discovery_agents WHERE id = ?",
        (agent_id,),
    ).fetchone()
    if row is None or row["linked_host_device_id"]:
        return
    connection.execute(
        "UPDATE discovery_agents SET linked_host_device_id = ?, updated_at = ? WHERE id = ?",
        (host_device_id, utc_now_iso(), agent_id),
    )
    connection.commit()


def create_discovery_result_record(
    connection: sqlite3.Connection,
    result_id: str,
    payload: dict,
    actor: str,
) -> dict:
    target_type = str(payload.get("targetType") or "").strip().lower()
    if target_type not in {"device", "service"}:
        raise ValueError("Нужно выбрать, что создать: device или service.")

    row = get_discovery_result_row(connection, result_id)
    if is_discovery_template_row(row):
        raise ValueError("Шаблоны Proxmox не создаются как хосты. Их можно оставить в preview или игнорировать.")
    raw = decode_discovery_raw(row)
    source = row["source"] or "agent"
    source_kind = row["source_kind"] or target_type
    now = utc_now_iso()

    if target_type == "service":
        host_row = resolve_discovery_host_row(connection, row)
        if host_row is None:
            raise ValueError("Для создания сервиса нужно связать результат или агента с хостом.")
        host = device_from_row(host_row)
        protocol = first_raw_value(raw, ["protocol", "scheme"])
        device_payload = normalize_device_payload(
            connection,
            {
                "name": row["name"],
                "ip": host["ip"],
                "type": "service",
                "hostDeviceId": host["id"],
                "source": source,
                "sourceKind": source_kind or "service",
                "sourceId": row["source_id"],
                "integrationStatus": row["status"] or "",
                "protocol": protocol,
                "serviceUrl": row["service_url"] or "",
                "accessPort": "",
                "ports": row["ports"] or "",
                "lastSeenAt": row["last_seen_at"] or now,
                "note": "Agent",
            },
        )
        created = insert_device(connection, device_payload, actor)
        connection.execute(
            """
            UPDATE discovery_results
            SET host_device_id = ?,
                matched_service_id = ?,
                state = 'matched',
                updated_at = ?
            WHERE id = ?
            """,
            (host["id"], created["id"], utc_now_iso(), result_id),
        )
        connection.commit()
        bump_revision("discovery-result-created", {"resultId": result_id, "serviceId": created["id"]})
        return {"result": get_discovery_result(connection, result_id), "record": created}

    ip = first_raw_value(raw, ["primaryIp", "primary_ip", "ip", "address"])
    if not ip:
        raise ValueError("Для создания устройства в discovery metadata должен быть primaryIp или ip.")
    mac = first_raw_value(raw, ["mac", "macAddress", "mac_address"])
    host_row = resolve_discovery_host_row(connection, row)
    device_payload = normalize_device_payload(
        connection,
        {
            "name": row["name"],
            "ip": ip,
            "mac": mac,
            "type": discovery_device_type(source_kind, raw),
            "hostDeviceId": host_row["id"] if host_row is not None else "",
            "source": source,
            "sourceKind": source_kind,
            "sourceId": row["source_id"],
            "integrationStatus": row["status"] or "",
            "serviceUrl": row["service_url"] or "",
            "accessPort": row["access_port"] or "",
            "ports": row["ports"] or "",
            "lastSeenAt": row["last_seen_at"] or now,
            "note": "Agent",
        },
    )
    created = insert_device(connection, device_payload, actor)
    connection.execute(
        """
        UPDATE discovery_results
        SET matched_device_id = ?,
            state = 'matched',
            updated_at = ?
        WHERE id = ?
        """,
        (created["id"], utc_now_iso(), result_id),
    )
    connection.commit()
    bump_revision("discovery-result-created", {"resultId": result_id, "deviceId": created["id"]})
    return {"result": get_discovery_result(connection, result_id), "record": created}


def auto_create_discovery_records(
    connection: sqlite3.Connection,
    agent: dict,
    result_ids: list[str],
) -> int:
    create_mode = agent.get("createMode") or "preview_only"
    if create_mode == "preview_only" or not result_ids:
        return 0

    created_or_linked_count = 0
    rows = [
        get_discovery_result_row(connection, result_id)
        for result_id in result_ids
    ]

    # Create/link devices first so a host can become the parent for services
    # received in the same agent package.
    ordered_rows = sorted(
        rows,
        key=lambda row: 0 if discovery_result_target_type(row) == "device" else 1,
    )

    for row in ordered_rows:
        if row["state"] in {"ignored", "matched", "stale"}:
            continue
        target_type = discovery_result_target_type(row)
        if target_type == "template":
            continue
        if create_mode == "auto_create_services" and target_type != "service":
            continue

        existing = find_existing_record_for_discovery(connection, row, target_type)
        if existing is not None:
            link_discovery_result(
                connection,
                row["id"],
                {"targetType": target_type, "targetId": existing["id"]},
            )
            if target_type == "device" and row["source_kind"] == "host":
                ensure_agent_linked_host(connection, agent["id"], existing["id"])
            created_or_linked_count += 1
            continue

        try:
            created = create_discovery_result_record(
                connection,
                row["id"],
                {"targetType": target_type},
                f"Agent: {agent.get('name') or agent.get('id') or 'unknown'}",
            )
        except (RequestError, ValueError, sqlite3.IntegrityError):
            continue

        record = created.get("record", {})
        if target_type == "device" and row["source_kind"] == "host":
            ensure_agent_linked_host(connection, agent["id"], record.get("id", ""))
        created_or_linked_count += 1
    return created_or_linked_count


def create_access_group(connection: sqlite3.Connection, payload: dict) -> dict:
    name = str(payload.get("name", "")).strip()
    description = str(payload.get("description", "")).strip()
    if not name:
        raise ValueError("Название группы доступа обязательно.")

    now = utc_now_iso()
    access_group = {
        "id": create_id(),
        "name": name,
        "description": description,
        "createdAt": now,
        "updatedAt": now,
    }
    connection.execute(
        """
        INSERT INTO access_groups (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            access_group["id"],
            access_group["name"],
            access_group["description"],
            access_group["createdAt"],
            access_group["updatedAt"],
        ),
    )
    connection.commit()
    bump_revision("access-group-created", {"accessGroupId": access_group["id"]})
    return access_group


def update_access_group(connection: sqlite3.Connection, access_group_id: str, payload: dict) -> dict:
    existing = connection.execute("SELECT * FROM access_groups WHERE id = ?", (access_group_id,)).fetchone()
    if existing is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Группа доступа не найдена.")

    name = str(payload.get("name") or "").strip()
    description = str(payload.get("description") or "").strip()
    if not name:
        raise ValueError("Название группы доступа обязательно.")

    now = utc_now_iso()
    connection.execute(
        """
        UPDATE access_groups
        SET name = ?, description = ?, updated_at = ?
        WHERE id = ?
        """,
        (name, description, now, access_group_id),
    )
    connection.commit()
    bump_revision("access-group-updated", {"accessGroupId": access_group_id})
    updated = connection.execute("SELECT * FROM access_groups WHERE id = ?", (access_group_id,)).fetchone()
    return access_group_from_row(updated)


def delete_access_group(connection: sqlite3.Connection, access_group_id: str) -> None:
    existing = connection.execute("SELECT id FROM access_groups WHERE id = ?", (access_group_id,)).fetchone()
    if existing is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Группа доступа не найдена.")

    with connection:
        connection.execute("UPDATE subnets SET access_group_id = NULL WHERE access_group_id = ?", (access_group_id,))
        connection.execute("DELETE FROM user_access_groups WHERE access_group_id = ?", (access_group_id,))
        connection.execute("DELETE FROM access_groups WHERE id = ?", (access_group_id,))

    bump_revision("access-group-deleted", {"accessGroupId": access_group_id})


def set_user_access_groups(connection: sqlite3.Connection, user_id: str, access_group_ids: list[str]) -> None:
    normalized_ids = []
    seen: set[str] = set()
    known_ids = {
        row["id"]
        for row in connection.execute("SELECT id FROM access_groups")
    }
    for access_group_id in access_group_ids:
        normalized_id = str(access_group_id or "").strip()
        if not normalized_id or normalized_id in seen:
            continue
        if normalized_id not in known_ids:
            raise ValueError("Указана несуществующая группа доступа.")
        normalized_ids.append(normalized_id)
        seen.add(normalized_id)

    connection.execute("DELETE FROM user_access_groups WHERE user_id = ?", (user_id,))
    now = utc_now_iso()
    for access_group_id in normalized_ids:
        connection.execute(
            """
            INSERT INTO user_access_groups (user_id, access_group_id, created_at)
            VALUES (?, ?, ?)
            """,
            (user_id, access_group_id, now),
        )


def create_user(connection: sqlite3.Connection, payload: dict) -> dict:
    username = sanitize_username(payload.get("username"))
    display_name = sanitize_display_name(payload.get("displayName"), fallback=username)
    role = normalize_role(payload.get("role"))
    password = require_non_empty_password(payload.get("password"))
    access_group_ids = payload.get("accessGroupIds") if isinstance(payload.get("accessGroupIds"), list) else []
    now = utc_now_iso()
    user_id = create_id()
    connection.execute(
        """
        INSERT INTO users (
            id, username, display_name, password_hash, role, must_change_password,
            is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            username,
            display_name,
            hash_password(password),
            role,
            1 if bool(payload.get("mustChangePassword", True)) else 0,
            1,
            now,
            now,
        ),
    )
    set_user_access_groups(connection, user_id, access_group_ids)
    connection.commit()
    bump_revision("user-created", {"userId": user_id})
    created_user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user = user_from_row(created_user)
    user["accessGroupIds"] = get_user_access_group_ids(connection, user_id)
    return user


def update_user_by_admin(connection: sqlite3.Connection, acting_user: dict, user_id: str, payload: dict) -> dict:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Пользователь не найден.")

    existing_user = user_from_row(row)
    username = sanitize_username(payload.get("username"))
    display_name = sanitize_display_name(payload.get("displayName"), fallback=username)
    role = normalize_role(payload.get("role"))
    access_group_ids = payload.get("accessGroupIds") if isinstance(payload.get("accessGroupIds"), list) else []
    is_active = bool(payload.get("isActive", existing_user["isActive"]))
    now = utc_now_iso()

    if existing_user["isSystemAdmin"]:
        if not is_active:
            raise RequestError(HTTPStatus.BAD_REQUEST, "Главного администратора нельзя отключить.")
        if role != ROLE_ADMIN:
            raise RequestError(HTTPStatus.BAD_REQUEST, "Главный администратор должен сохранять роль Admin.")

    if str(acting_user.get("id") or "") == user_id and not is_active:
        raise RequestError(HTTPStatus.BAD_REQUEST, "Нельзя отключить текущего пользователя.")

    connection.execute(
        """
        UPDATE users
        SET username = ?, display_name = ?, role = ?, is_active = ?, updated_at = ?
        WHERE id = ?
        """,
        (username, display_name, role, 1 if is_active else 0, now, user_id),
    )
    set_user_access_groups(connection, user_id, access_group_ids)
    if not is_active:
        connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    connection.commit()
    bump_revision("user-updated", {"userId": user_id})
    updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user = user_from_row(updated_row)
    user["accessGroupIds"] = get_user_access_group_ids(connection, user_id)
    return user


def reset_user_password_by_admin(connection: sqlite3.Connection, user_id: str, new_password: object) -> dict:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Пользователь не найден.")

    password = require_non_empty_password(new_password)
    now = utc_now_iso()
    connection.execute(
        """
        UPDATE users
        SET password_hash = ?, must_change_password = 1, updated_at = ?
        WHERE id = ?
        """,
        (hash_password(password), now, user_id),
    )
    connection.commit()
    bump_revision("user-password-reset", {"userId": user_id})
    updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user = user_from_row(updated_row)
    user["accessGroupIds"] = get_user_access_group_ids(connection, user_id)
    return user


def delete_user_by_admin(connection: sqlite3.Connection, acting_user: dict, user_id: str) -> None:
    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Пользователь не найден.")
    target_user = user_from_row(row)
    if str(acting_user.get("id") or "") == user_id:
        raise RequestError(HTTPStatus.BAD_REQUEST, "Нельзя удалить текущего пользователя.")
    if target_user["isSystemAdmin"]:
        raise RequestError(HTTPStatus.BAD_REQUEST, "Главного администратора нельзя удалить.")

    with connection:
        connection.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM user_access_groups WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM users WHERE id = ?", (user_id,))

    bump_revision("user-deleted", {"userId": user_id})


def record_history(
    connection: sqlite3.Connection,
    *,
    device_id: str,
    device_name: str,
    ip: str,
    previous_ip: str,
    action: str,
    actor: str,
    note: str = "",
    changed_at: str | None = None,
    history_id: int | None = None,
) -> None:
    connection.execute(
        """
        INSERT INTO ip_history (
            id, device_id, device_name, ip, previous_ip, action, actor, changed_at, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            history_id,
            device_id or None,
            device_name,
            ip,
            previous_ip,
            action,
            actor,
            changed_at or utc_now_iso(),
            note,
        ),
    )


def insert_subnet(connection: sqlite3.Connection, subnet: dict) -> dict:
    connection.execute(
        """
        INSERT INTO subnets (
            id, name, cidr, network, network_int, broadcast, broadcast_int,
            mask_bits, range_start, range_end, range_start_int, range_end_int,
            pool_size, usable_hosts, scan_enabled, access_group_id, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            subnet["id"],
            subnet["name"],
            subnet["cidr"],
            subnet["network"],
            subnet["networkInt"],
            subnet["broadcast"],
            subnet["broadcastInt"],
            subnet["maskBits"],
            subnet["rangeStart"],
            subnet["rangeEnd"],
            subnet["rangeStartInt"],
            subnet["rangeEndInt"],
            subnet["poolSize"],
            subnet["usableHosts"],
            1 if subnet.get("scanEnabled", True) else 0,
            subnet.get("accessGroupId") or None,
            subnet.get("note", ""),
            subnet["createdAt"],
        ),
    )
    connection.commit()
    bump_revision("state-changed", {"entity": "subnet"})
    signal_background_scanner(run_scan=True)
    return subnet


def insert_group(connection: sqlite3.Connection, group: dict) -> dict:
    connection.execute(
        """
        INSERT INTO range_groups (
            id, subnet_id, name, range_start, range_end, range_start_int,
            range_end_int, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            group["id"],
            group["subnetId"],
            group["name"],
            group["rangeStart"],
            group["rangeEnd"],
            group["rangeStartInt"],
            group["rangeEndInt"],
            group.get("note", ""),
            group["createdAt"],
        ),
    )
    connection.commit()
    bump_revision("state-changed", {"entity": "group"})
    return group


def insert_device(connection: sqlite3.Connection, device: dict, actor: str) -> dict:
    connection.execute(
        """
        INSERT INTO devices (
            id, name, ip, mac, type, subnet_id, host_device_id, source,
            source_kind, source_id, integration_status, integration_status_changed_at,
            protocol, service_url, access_port, ports, last_seen_at,
            note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            device["id"],
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
            device.get("hostDeviceId", ""),
            device.get("source", ""),
            device.get("sourceKind", ""),
            device.get("sourceId", ""),
            device.get("integrationStatus", ""),
            device.get("integrationStatusChangedAt", "") or (device.get("lastSeenAt", "") if device.get("integrationStatus", "") else ""),
            device.get("protocol", ""),
            device.get("serviceUrl", ""),
            device.get("accessPort", ""),
            device.get("ports", ""),
            device.get("lastSeenAt", ""),
            device.get("note", ""),
            device["createdAt"],
        ),
    )
    record_history(
        connection,
        device_id=device["id"],
        device_name=device["name"],
        ip=device["ip"],
        previous_ip="",
        action="assigned",
        actor=actor,
        note=device.get("note", ""),
        changed_at=device["createdAt"],
    )
    connection.commit()
    bump_revision("state-changed", {"entity": "device"})
    signal_background_scanner(run_scan=True)
    return {
        **device,
        "subnetId": device.get("subnetId", ""),
        "mac": device.get("mac", ""),
        "hostDeviceId": device.get("hostDeviceId", ""),
        "source": device.get("source", ""),
        "sourceKind": device.get("sourceKind", ""),
        "sourceId": device.get("sourceId", ""),
        "integrationStatus": device.get("integrationStatus", ""),
        "integrationStatusChangedAt": device.get("integrationStatusChangedAt", "") or (device.get("lastSeenAt", "") if device.get("integrationStatus", "") else ""),
        "protocol": device.get("protocol", ""),
        "serviceUrl": device.get("serviceUrl", ""),
        "accessPort": device.get("accessPort", ""),
        "ports": device.get("ports", ""),
        "lastSeenAt": device.get("lastSeenAt", ""),
    }


def update_subnet(connection: sqlite3.Connection, subnet_id: str, subnet: dict) -> dict:
    cursor = connection.execute(
        """
        UPDATE subnets
        SET name = ?, cidr = ?, network = ?, network_int = ?, broadcast = ?, broadcast_int = ?,
            mask_bits = ?, range_start = ?, range_end = ?, range_start_int = ?, range_end_int = ?,
            pool_size = ?, usable_hosts = ?, scan_enabled = ?, access_group_id = ?, note = ?
        WHERE id = ?
        """,
        (
            subnet["name"],
            subnet["cidr"],
            subnet["network"],
            subnet["networkInt"],
            subnet["broadcast"],
            subnet["broadcastInt"],
            subnet["maskBits"],
            subnet["rangeStart"],
            subnet["rangeEnd"],
            subnet["rangeStartInt"],
            subnet["rangeEndInt"],
            subnet["poolSize"],
            subnet["usableHosts"],
            1 if subnet.get("scanEnabled", True) else 0,
            subnet.get("accessGroupId") or None,
            subnet.get("note", ""),
            subnet_id,
        ),
    )
    connection.commit()
    if cursor.rowcount == 0:
        raise RequestError(HTTPStatus.NOT_FOUND, "Подсеть не найдена.")
    bump_revision("state-changed", {"entity": "subnet"})
    signal_background_scanner(run_scan=True)
    return subnet


def update_group(connection: sqlite3.Connection, group_id: str, group: dict) -> dict:
    cursor = connection.execute(
        """
        UPDATE range_groups
        SET subnet_id = ?, name = ?, range_start = ?, range_end = ?, range_start_int = ?,
            range_end_int = ?, note = ?
        WHERE id = ?
        """,
        (
            group["subnetId"],
            group["name"],
            group["rangeStart"],
            group["rangeEnd"],
            group["rangeStartInt"],
            group["rangeEndInt"],
            group.get("note", ""),
            group_id,
        ),
    )
    connection.commit()
    if cursor.rowcount == 0:
        raise RequestError(HTTPStatus.NOT_FOUND, "Группа не найдена.")
    bump_revision("state-changed", {"entity": "group"})
    return group


def update_device(connection: sqlite3.Connection, device_id: str, device: dict, actor: str) -> dict:
    existing_row = connection.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
    if existing_row is None:
        raise RequestError(HTTPStatus.NOT_FOUND, "Устройство не найдено.")

    existing_device = device_from_row(existing_row)
    integration_status_changed_at = device.get("integrationStatusChangedAt", "")
    if device.get("integrationStatus", "") and device.get("integrationStatus", "") != existing_device.get("integrationStatus", ""):
        integration_status_changed_at = device.get("lastSeenAt", "") or utc_now_iso()
    elif not integration_status_changed_at:
        integration_status_changed_at = existing_device.get("integrationStatusChangedAt", "")
    cursor = connection.execute(
        """
        UPDATE devices
        SET name = ?, ip = ?, mac = ?, type = ?, subnet_id = ?, host_device_id = ?,
            source = ?, source_kind = ?, source_id = ?, integration_status = ?, integration_status_changed_at = ?,
            protocol = ?, service_url = ?, access_port = ?, ports = ?, last_seen_at = ?, note = ?
        WHERE id = ?
        """,
        (
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
            device.get("hostDeviceId", ""),
            device.get("source", ""),
            device.get("sourceKind", ""),
            device.get("sourceId", ""),
            device.get("integrationStatus", ""),
            integration_status_changed_at,
            device.get("protocol", ""),
            device.get("serviceUrl", ""),
            device.get("accessPort", ""),
            device.get("ports", ""),
            device.get("lastSeenAt", ""),
            device.get("note", ""),
            device_id,
        ),
    )
    if cursor.rowcount == 0:
        raise RequestError(HTTPStatus.NOT_FOUND, "Устройство не найдено.")

    if existing_device["ip"] != device["ip"]:
        record_history(
            connection,
            device_id=device_id,
            device_name=device["name"],
            ip=device["ip"],
            previous_ip=existing_device["ip"],
            action="ip_changed",
            actor=actor,
            note=device.get("note", ""),
        )
    elif (
        existing_device["name"] != device["name"]
        or existing_device["mac"] != device.get("mac", "")
        or existing_device["type"] != device["type"]
        or existing_device.get("subnetId", "") != device.get("subnetId", "")
        or existing_device.get("hostDeviceId", "") != device.get("hostDeviceId", "")
        or existing_device.get("source", "") != device.get("source", "")
        or existing_device.get("sourceKind", "") != device.get("sourceKind", "")
        or existing_device.get("sourceId", "") != device.get("sourceId", "")
        or existing_device.get("integrationStatus", "") != device.get("integrationStatus", "")
        or existing_device.get("protocol", "") != device.get("protocol", "")
        or existing_device.get("serviceUrl", "") != device.get("serviceUrl", "")
        or existing_device.get("accessPort", "") != device.get("accessPort", "")
        or existing_device.get("ports", "") != device.get("ports", "")
        or existing_device.get("lastSeenAt", "") != device.get("lastSeenAt", "")
        or existing_device["note"] != device.get("note", "")
    ):
        record_history(
            connection,
            device_id=device_id,
            device_name=device["name"],
            ip=device["ip"],
            previous_ip="",
            action="updated",
            actor=actor,
            note=device.get("note", ""),
        )

    connection.commit()
    bump_revision("state-changed", {"entity": "device"})
    signal_background_scanner(run_scan=True)
    return {
        **device,
        "subnetId": device.get("subnetId", ""),
        "mac": device.get("mac", ""),
        "hostDeviceId": device.get("hostDeviceId", ""),
        "source": device.get("source", ""),
        "sourceKind": device.get("sourceKind", ""),
        "sourceId": device.get("sourceId", ""),
        "integrationStatus": device.get("integrationStatus", ""),
        "integrationStatusChangedAt": integration_status_changed_at,
        "protocol": device.get("protocol", ""),
        "serviceUrl": device.get("serviceUrl", ""),
        "accessPort": device.get("accessPort", ""),
        "ports": device.get("ports", ""),
        "lastSeenAt": device.get("lastSeenAt", ""),
    }


def replace_state(connection: sqlite3.Connection, snapshot: dict, actor: str) -> None:
    existing_devices = {
        row["id"]: device_from_row(row)
        for row in connection.execute("SELECT * FROM devices")
    }

    with connection:
        connection.execute("DELETE FROM discovery_nonces")
        connection.execute("DELETE FROM discovery_runs")
        connection.execute("DELETE FROM discovery_results")
        connection.execute("UPDATE discovery_agents SET linked_host_device_id = '', updated_at = ?", (utc_now_iso(),))
        connection.execute("DELETE FROM devices")
        connection.execute("DELETE FROM range_groups")
        connection.execute("DELETE FROM subnets")
        connection.execute("DELETE FROM ip_scan_results")
        connection.execute("DELETE FROM ip_history")

        for subnet in snapshot.get("subnets", []):
            insert_subnet_without_commit(connection, subnet)
        for group in snapshot.get("groups", []):
            insert_group_without_commit(connection, group)
        for device in snapshot.get("devices", []):
            insert_device_without_commit(connection, device)
        for history in snapshot.get("history", []):
            insert_history_without_commit(connection, history)
        for scan_result in snapshot.get("scanResults", []):
            insert_scan_result_without_commit(connection, scan_result)

        imported_devices = {device["id"]: device for device in snapshot.get("devices", [])}
        record_replace_history(connection, existing_devices, imported_devices, actor)

    bump_revision("state-changed", {"entity": "state"})
    signal_background_scanner(run_scan=True)


def record_replace_history(
    connection: sqlite3.Connection,
    previous_devices: dict[str, dict],
    current_devices: dict[str, dict],
    actor: str,
) -> None:
    now = utc_now_iso()

    for device_id, current_device in current_devices.items():
        previous_device = previous_devices.get(device_id)
        if previous_device is None:
            record_history(
                connection,
                device_id=device_id,
                device_name=current_device["name"],
                ip=current_device["ip"],
                previous_ip="",
                action="imported",
                actor=actor,
                note="Импорт состояния",
                changed_at=now,
            )
            continue

        if previous_device["ip"] != current_device["ip"]:
            record_history(
                connection,
                device_id=device_id,
                device_name=current_device["name"],
                ip=current_device["ip"],
                previous_ip=previous_device["ip"],
                action="ip_changed",
                actor=actor,
                note="Импорт состояния",
                changed_at=now,
            )

    for device_id, previous_device in previous_devices.items():
        if device_id not in current_devices:
            record_history(
                connection,
                device_id=device_id,
                device_name=previous_device["name"],
                ip=previous_device["ip"],
                previous_ip=previous_device["ip"],
                action="released",
                actor=actor,
                note="Удалено через импорт состояния",
                changed_at=now,
            )


def insert_subnet_without_commit(connection: sqlite3.Connection, subnet: dict) -> None:
    connection.execute(
        """
        INSERT INTO subnets (
            id, name, cidr, network, network_int, broadcast, broadcast_int,
            mask_bits, range_start, range_end, range_start_int, range_end_int,
            pool_size, usable_hosts, scan_enabled, access_group_id, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            subnet["id"],
            subnet["name"],
            subnet["cidr"],
            subnet["network"],
            subnet["networkInt"],
            subnet["broadcast"],
            subnet["broadcastInt"],
            subnet["maskBits"],
            subnet["rangeStart"],
            subnet["rangeEnd"],
            subnet["rangeStartInt"],
            subnet["rangeEndInt"],
            subnet["poolSize"],
            subnet["usableHosts"],
            1 if subnet.get("scanEnabled", True) else 0,
            subnet.get("accessGroupId") or None,
            subnet.get("note", ""),
            subnet["createdAt"],
        ),
    )


def insert_group_without_commit(connection: sqlite3.Connection, group: dict) -> None:
    connection.execute(
        """
        INSERT INTO range_groups (
            id, subnet_id, name, range_start, range_end, range_start_int,
            range_end_int, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            group["id"],
            group["subnetId"],
            group["name"],
            group["rangeStart"],
            group["rangeEnd"],
            group["rangeStartInt"],
            group["rangeEndInt"],
            group.get("note", ""),
            group["createdAt"],
        ),
    )


def insert_device_without_commit(connection: sqlite3.Connection, device: dict) -> None:
    connection.execute(
        """
        INSERT INTO devices (
            id, name, ip, mac, type, subnet_id, host_device_id, source,
            source_kind, source_id, integration_status, protocol, service_url, access_port, ports, last_seen_at,
            note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            device["id"],
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
            device.get("hostDeviceId", ""),
            device.get("source", ""),
            device.get("sourceKind", ""),
            device.get("sourceId", ""),
            device.get("integrationStatus", ""),
            device.get("protocol", ""),
            device.get("serviceUrl", ""),
            device.get("accessPort", ""),
            device.get("ports", ""),
            device.get("lastSeenAt", ""),
            device.get("note", ""),
            device["createdAt"],
        ),
    )


def insert_history_without_commit(connection: sqlite3.Connection, history: dict) -> None:
    record_history(
        connection,
        device_id=history.get("deviceId", ""),
        device_name=history.get("deviceName", ""),
        ip=history.get("ip", ""),
        previous_ip=history.get("previousIp", ""),
        action=history.get("action", "assigned"),
        actor=history.get("actor", "system"),
        note=history.get("note", ""),
        changed_at=history.get("changedAt"),
        history_id=history.get("id"),
    )


def clear_history(connection: sqlite3.Connection, actor: str) -> None:
    connection.execute("DELETE FROM ip_history")
    record_history(
        connection,
        device_id="",
        device_name="ATLAS",
        ip="",
        previous_ip="",
        action="history_cleared",
        actor=actor,
        note="История очищена администратором.",
    )
    connection.commit()
    bump_revision("history-cleared", {"entity": "history"})


def insert_scan_result_without_commit(connection: sqlite3.Connection, scan_result: dict) -> None:
    connection.execute(
        """
        INSERT INTO ip_scan_results (
            ip, subnet_id, is_reachable, checked_at, source
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            scan_result["ip"],
            scan_result["subnetId"],
            1 if scan_result.get("isReachable") else 0,
            scan_result["checkedAt"],
            scan_result.get("source", "import"),
        ),
    )


def get_subnets_for_scan(
    connection: sqlite3.Connection,
    subnet_id: str | None = None,
    *,
    only_enabled: bool = False,
) -> list[dict]:
    query = "SELECT * FROM subnets"
    params: tuple = ()
    if subnet_id:
        query += " WHERE id = ?"
        params = (subnet_id,)
    elif only_enabled:
        query += " WHERE scan_enabled = 1"

    return [subnet_from_row(row) for row in connection.execute(query, params)]


def get_group_for_scan(connection: sqlite3.Connection, group_id: str) -> dict | None:
    row = connection.execute("SELECT * FROM range_groups WHERE id = ?", (group_id,)).fetchone()
    if row is None:
        return None
    return group_from_row(row)


def build_ping_command(ip: str) -> list[str]:
    system = platform.system().lower()
    if system == "windows":
        return ["ping", "-n", "1", "-w", str(SCAN_TIMEOUT_MS), ip]
    if system == "darwin":
        return ["ping", "-c", "1", "-W", str(SCAN_TIMEOUT_MS), ip]
    return ["ping", "-c", "1", "-W", str(max(1, SCAN_TIMEOUT_MS // 1000)), ip]


def ping_ip(ip: str) -> bool:
    command = build_ping_command(ip)
    result = subprocess.run(
        command,
        capture_output=True,
        check=False,
        timeout=max(4, SCAN_TIMEOUT_MS / 1000 + 3),
    )
    return result.returncode == 0


def int_to_ip(value: int) -> str:
    return ".".join(
        [
            str((value >> 24) & 255),
            str((value >> 16) & 255),
            str((value >> 8) & 255),
            str(value & 255),
        ]
    )


def ip_to_int_value(ip: str) -> int:
    parts = [int(part) for part in str(ip).split(".")]
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) & 0xFFFFFFFF


def perform_scan(
    subnet_id: str | None = None,
    group_id: str | None = None,
    source: str = "user",
    *,
    only_enabled_subnets: bool = False,
) -> dict:
    with SCAN_LOCK:
        with connect_db() as connection:
            targets: list[dict] = []
            if group_id:
                group = get_group_for_scan(connection, group_id)
                if group is not None:
                    targets.append(
                        {
                            "scope": "group",
                            "subnetId": group["subnetId"],
                            "groupId": group["id"],
                            "ipValues": [
                                int_to_ip(ip_int)
                                for ip_int in range(group["rangeStartInt"], group["rangeEndInt"] + 1)
                            ],
                        }
                    )
            else:
                for subnet in get_subnets_for_scan(
                    connection,
                    subnet_id,
                    only_enabled=only_enabled_subnets and not subnet_id,
                ):
                    targets.append(
                        {
                            "scope": "subnet",
                            "subnetId": subnet["id"],
                            "groupId": None,
                            "ipValues": [
                                int_to_ip(ip_int)
                                for ip_int in range(subnet["rangeStartInt"], subnet["rangeEndInt"] + 1)
                            ],
                        }
                    )

        if not targets:
            summary = {
                "scannedSubnets": 0 if not group_id else None,
                "scannedGroups": 0 if group_id else None,
                "scannedIps": 0,
                "reachableIps": 0,
                "lastScanAt": None,
            }
            bump_revision("scan-completed", summary)
            return summary

        now = utc_now_iso()
        scanned_ips = 0
        reachable_ips = 0

        for target in targets:
            ip_values = target["ipValues"]

            if ip_values:
                with concurrent.futures.ThreadPoolExecutor(
                    max_workers=min(SCAN_CONCURRENCY, len(ip_values))
                ) as executor:
                    ping_results = list(executor.map(ping_ip, ip_values))
            else:
                ping_results = []

            rows_to_write = []
            for ip, is_reachable in zip(ip_values, ping_results):
                scanned_ips += 1
                reachable_ips += 1 if is_reachable else 0
                rows_to_write.append(
                    (
                        ip,
                        target["subnetId"],
                        1 if is_reachable else 0,
                        now,
                        source,
                    )
                )

            with connect_db() as connection:
                subnet_exists = connection.execute(
                    "SELECT 1 FROM subnets WHERE id = ?",
                    (target["subnetId"],),
                ).fetchone()
                if subnet_exists is None:
                    continue

                if target["scope"] == "subnet":
                    connection.execute("DELETE FROM ip_scan_results WHERE subnet_id = ?", (target["subnetId"],))

                for row in rows_to_write:
                    connection.execute(
                        """
                        INSERT INTO ip_scan_results (
                            ip, subnet_id, is_reachable, checked_at, source
                        ) VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(ip) DO UPDATE SET
                            subnet_id = excluded.subnet_id,
                            is_reachable = excluded.is_reachable,
                            checked_at = excluded.checked_at,
                            source = excluded.source
                        """,
                        row,
                    )

                connection.commit()

    summary = {
        "scannedSubnets": len(targets) if not group_id else None,
        "scannedGroups": len(targets) if group_id else None,
        "scannedIps": scanned_ips,
        "reachableIps": reachable_ips,
        "lastScanAt": now,
        "groupId": group_id,
        "subnetId": subnet_id,
    }
    bump_revision("scan-completed", summary)
    return summary


class BackgroundScanner(threading.Thread):
    def __init__(self) -> None:
        super().__init__(daemon=True, name="atlas-background-scanner")

    def run(self) -> None:
        while not STOP_EVENT.is_set():
            interval = get_scan_interval_seconds()
            triggered = SCAN_REQUEST_EVENT.wait(timeout=interval)
            SCAN_REQUEST_EVENT.clear()

            if STOP_EVENT.is_set():
                return

            if triggered:
                should_run_scan = consume_scan_request_signal()
                if not should_run_scan:
                    continue
            else:
                should_run_scan = True

            try:
                if should_run_scan:
                    perform_scan(source="background", only_enabled_subnets=True)
            except FileNotFoundError:
                print("Ping command not found; background scanning disabled.")
                return
            except Exception as error:  # noqa: BLE001
                if triggered:
                    print(f"Background scan failed: {error}")


class ATLASRequestHandler(BaseHTTPRequestHandler):
    server_version = "ATLAS/0.3"

    def handle(self) -> None:
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/api/auth/session":
                with connect_db() as connection:
                    user = get_request_user(connection, self)
                    self.send_json(HTTPStatus.OK, build_session_payload(connection, user))
                return

            if parsed.path == "/api/state":
                with connect_db() as connection:
                    user = require_authenticated_user(connection, self)
                    self.send_json(HTTPStatus.OK, load_snapshot(connection, user))
                return

            if parsed.path == "/api/admin/discovery/agents":
                with connect_db() as connection:
                    require_admin_user(connection, self)
                    self.send_json(HTTPStatus.OK, {"agents": list_discovery_agents(connection)})
                return

            if parsed.path == "/api/stream":
                self.handle_sse_stream()
                return

            if parsed.path == "/health":
                self.send_json(HTTPStatus.OK, {"status": "ok"})
                return

            self.serve_static(parsed.path)
        except RequestError as error:
            self.send_json(error.status, {"error": error.message}, headers=error.headers)
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body(
                max_bytes=DISCOVERY_MAX_BODY_BYTES if parsed.path == "/api/discovery/snapshot" else None
            )
            with connect_db() as connection:
                if parsed.path == "/api/discovery/snapshot":
                    self.send_json(
                        HTTPStatus.ACCEPTED,
                        ingest_discovery_snapshot(connection, payload, self),
                    )
                    return
                if parsed.path == "/api/auth/login":
                    user, token, expires_at = login_user(
                        connection,
                        payload.get("username"),
                        payload.get("password"),
                    )
                    self.send_json(
                        HTTPStatus.OK,
                        build_session_payload(connection, user),
                        headers=[("Set-Cookie", self.build_session_cookie(token, expires_at))],
                    )
                    return
                if parsed.path == "/api/auth/logout":
                    cookies = parse_cookie_header(self.headers.get("Cookie"))
                    logout_session(connection, cookies.get(SESSION_COOKIE_NAME))
                    self.send_json(
                        HTTPStatus.OK,
                        {"status": "logged-out"},
                        headers=[("Set-Cookie", self.build_clear_session_cookie())],
                    )
                    return
                if parsed.path == "/api/auth/change-password":
                    user = require_authenticated_user(connection, self)
                    updated_user = change_user_password(
                        connection,
                        user,
                        payload.get("currentPassword"),
                        payload.get("newPassword"),
                    )
                    self.send_json(HTTPStatus.OK, build_session_payload(connection, updated_user))
                    return
                if parsed.path == "/api/admin/access-groups":
                    require_admin_user(connection, self)
                    self.send_json(HTTPStatus.CREATED, create_access_group(connection, payload))
                    return
                if parsed.path == "/api/admin/users":
                    require_admin_user(connection, self)
                    self.send_json(HTTPStatus.CREATED, create_user(connection, payload))
                    return
                if parsed.path == "/api/admin/discovery/agents":
                    admin_user = require_admin_user(connection, self)
                    self.send_json(
                        HTTPStatus.CREATED,
                        create_discovery_agent(connection, payload, resolve_actor(self, payload, admin_user)),
                    )
                    return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 6
                    and parsed.path.startswith("/api/admin/discovery/agents/")
                    and parsed.path.endswith("/rotate-token")
                ):
                    admin_user = require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    self.send_json(
                        HTTPStatus.OK,
                        rotate_discovery_agent_token(connection, parts[4], resolve_actor(self, payload, admin_user)),
                    )
                    return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 6
                    and parsed.path.startswith("/api/admin/discovery/agents/")
                    and parsed.path.endswith("/revoke-token")
                ):
                    admin_user = require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    self.send_json(
                        HTTPStatus.OK,
                        revoke_discovery_agent_token(connection, parts[4], resolve_actor(self, payload, admin_user)),
                    )
                    return
                if parsed.path == "/api/admin/discovery/results/cleanup-stale":
                    admin_user = require_admin_user(connection, self)
                    self.send_json(
                        HTTPStatus.OK,
                        cleanup_stale_discovery_results(
                            connection,
                            resolve_actor(self, payload, admin_user),
                            delete_linked_records=bool(payload.get("deleteLinkedRecords", True)),
                        ),
                    )
                    return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 6
                    and parsed.path.startswith("/api/admin/discovery/results/")
                ):
                    admin_user = require_admin_user(connection, self)
                    actor = resolve_actor(self, payload, admin_user)
                    parts = [part for part in parsed.path.split("/") if part]
                    result_id = parts[4]
                    action = parts[5]
                    if action == "ignore":
                        self.send_json(HTTPStatus.OK, update_discovery_result_state(connection, result_id, "ignored"))
                        return
                    if action == "restore":
                        self.send_json(HTTPStatus.OK, update_discovery_result_state(connection, result_id, "new"))
                        return
                    if action == "resolve":
                        self.send_json(HTTPStatus.OK, update_discovery_result_state(connection, result_id, "ignored"))
                        return
                    if action == "delete":
                        self.send_json(HTTPStatus.OK, delete_discovery_result(connection, result_id, actor))
                        return
                    if action == "link":
                        self.send_json(HTTPStatus.OK, link_discovery_result(connection, result_id, payload))
                        return
                    if action == "create":
                        self.send_json(
                            HTTPStatus.CREATED,
                            create_discovery_result_record(connection, result_id, payload, actor),
                        )
                        return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 5
                    and parsed.path.startswith("/api/admin/users/")
                    and parsed.path.endswith("/reset-password")
                ):
                    require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    self.send_json(
                        HTTPStatus.OK,
                        reset_user_password_by_admin(connection, parts[3], payload.get("newPassword")),
                    )
                    return
                if parsed.path == "/api/admin/backup/export":
                    require_admin_user(connection, self)
                    self.send_json(HTTPStatus.OK, export_backup(connection, payload.get("include")))
                    return
                if parsed.path == "/api/admin/backup/import":
                    require_admin_user(connection, self)
                    actor = resolve_actor(self, payload, require_authenticated_user(connection, self))
                    self.send_json(HTTPStatus.OK, import_backup(connection, payload.get("backup") or {}, actor))
                    return

                user = require_write_user(connection, self)
                actor = resolve_actor(self, payload, user)
                if parsed.path == "/api/subnets":
                    subnet_payload = normalize_subnet_payload(
                        {
                            **payload,
                            "scanEnabled": payload.get(
                                "scanEnabled",
                                get_default_subnet_scan_enabled(connection),
                            ),
                        }
                    )
                    access_group_id = subnet_payload["accessGroupId"]
                    if access_group_id and not can_assign_access_group(user, access_group_id):
                        raise RequestError(HTTPStatus.FORBIDDEN, "Нет прав для назначения этой группы доступа.")
                    self.send_json(HTTPStatus.CREATED, insert_subnet(connection, subnet_payload))
                    return
                if parsed.path == "/api/groups":
                    group_payload = normalize_group_payload(connection, payload)
                    require_accessible_subnet(connection, user, group_payload["subnetId"])
                    self.send_json(HTTPStatus.CREATED, insert_group(connection, group_payload))
                    return
                if parsed.path == "/api/devices":
                    device_payload = normalize_device_payload(connection, payload)
                    subnet_id = str(device_payload.get("subnetId") or "").strip()
                    if subnet_id:
                        require_accessible_subnet(connection, user, subnet_id)
                    self.send_json(HTTPStatus.CREATED, insert_device(connection, device_payload, actor))
                    return
                if parsed.path == "/api/scan":
                    subnet_id = str(payload.get("subnetId") or "").strip()
                    group_id = str(payload.get("groupId") or "").strip()
                    if subnet_id:
                        require_accessible_subnet(connection, user, subnet_id)
                    if group_id:
                        group = get_group_for_scan(connection, group_id)
                        if group is None:
                            raise RequestError(HTTPStatus.NOT_FOUND, "Группа не найдена.")
                        require_accessible_subnet(connection, user, group["subnetId"])
                    summary = perform_scan(
                        subnet_id or None,
                        group_id or None,
                        source="user",
                        only_enabled_subnets=not subnet_id and not group_id,
                    )
                    self.send_json(HTTPStatus.OK, summary)
                    return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message}, headers=error.headers)
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": map_integrity_error(error)})
        except FileNotFoundError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Команда ping не найдена на сервере."})
        except subprocess.TimeoutExpired:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ping превысил таймаут на сервере."})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()
            with connect_db() as connection:
                if parsed.path == "/api/settings":
                    admin_user = require_admin_user(connection, self)
                    self.send_json(HTTPStatus.OK, update_settings(connection, payload, resolve_actor(self, payload, admin_user)))
                    return
                if parsed.path == "/api/preferences":
                    user = require_authenticated_user(connection, self)
                    self.send_json(
                        HTTPStatus.OK,
                        save_user_preferences(connection, user["id"], payload),
                    )
                    return
                if parsed.path == "/api/auth/profile":
                    user = require_authenticated_user(connection, self)
                    updated_user = update_current_user_profile(connection, user, payload)
                    self.send_json(HTTPStatus.OK, build_session_payload(connection, updated_user))
                    return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 6
                    and parsed.path.startswith("/api/admin/discovery/agents/")
                    and parsed.path.endswith("/data-policy")
                ):
                    admin_user = require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    self.send_json(
                        HTTPStatus.OK,
                        update_discovery_agent_data_policy(
                            connection,
                            parts[4],
                            payload,
                            resolve_actor(self, payload, admin_user),
                        ),
                    )
                    return
                if (
                    len([part for part in parsed.path.split("/") if part]) == 5
                    and parsed.path.startswith("/api/admin/discovery/agents/")
                ):
                    admin_user = require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    self.send_json(
                        HTTPStatus.OK,
                        update_discovery_agent(connection, parts[4], payload, resolve_actor(self, payload, admin_user)),
                    )
                    return
                if len([part for part in parsed.path.split("/") if part]) == 4 and parsed.path.startswith("/api/admin/"):
                    admin_user = require_admin_user(connection, self)
                    parts = [part for part in parsed.path.split("/") if part]
                    entity_id = parts[3]
                    if parts[2] == "access-groups":
                        self.send_json(HTTPStatus.OK, update_access_group(connection, entity_id, payload))
                        return
                    if parts[2] == "users":
                        self.send_json(HTTPStatus.OK, update_user_by_admin(connection, admin_user, entity_id, payload))
                        return
                if len([part for part in parsed.path.split("/") if part]) == 3 and parsed.path.startswith("/api/"):
                    user = require_write_user(connection, self)
                    actor = resolve_actor(self, payload, user)
                    parts = [part for part in parsed.path.split("/") if part]
                    entity_id = parts[2]
                    if parts[1] == "subnets":
                        current_subnet = require_accessible_subnet(connection, user, entity_id)
                        subnet_payload = normalize_subnet_payload(
                            {
                                **current_subnet,
                                **payload,
                                "id": entity_id,
                                "createdAt": current_subnet["createdAt"],
                            }
                        )
                        access_group_id = subnet_payload["accessGroupId"]
                        if access_group_id and not can_assign_access_group(user, access_group_id):
                            raise RequestError(HTTPStatus.FORBIDDEN, "Нет прав для назначения этой группы доступа.")
                        self.send_json(HTTPStatus.OK, update_subnet(connection, entity_id, subnet_payload))
                        return
                    if parts[1] == "groups":
                        current_group = get_group_for_scan(connection, entity_id)
                        if current_group is None:
                            raise RequestError(HTTPStatus.NOT_FOUND, "Группа не найдена.")
                        require_accessible_subnet(connection, user, current_group["subnetId"])
                        group_payload = normalize_group_payload(
                            connection,
                            {**current_group, **payload, "id": entity_id, "createdAt": current_group["createdAt"]},
                            existing_id=entity_id,
                            created_at=current_group["createdAt"],
                        )
                        require_accessible_subnet(connection, user, group_payload["subnetId"])
                        self.send_json(HTTPStatus.OK, update_group(connection, entity_id, group_payload))
                        return
                    if parts[1] == "devices":
                        existing_row = connection.execute("SELECT * FROM devices WHERE id = ?", (entity_id,)).fetchone()
                        if existing_row is None:
                            raise RequestError(HTTPStatus.NOT_FOUND, "Устройство не найдено.")
                        current_device = device_from_row(existing_row)
                        if current_device["subnetId"]:
                            require_accessible_subnet(connection, user, current_device["subnetId"])
                        device_payload = normalize_device_payload(
                            connection,
                            {**current_device, **payload, "id": entity_id, "createdAt": current_device["createdAt"]},
                            existing_id=entity_id,
                            created_at=current_device["createdAt"],
                        )
                        if device_payload["subnetId"]:
                            require_accessible_subnet(connection, user, device_payload["subnetId"])
                        self.send_json(HTTPStatus.OK, update_device(connection, entity_id, device_payload, actor))
                        return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message}, headers=error.headers)
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": map_integrity_error(error)})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path != "/api/state":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
            return

        try:
            payload = self.read_json_body()
            with connect_db() as connection:
                user = require_admin_user(connection, self)
                actor = resolve_actor(self, payload, user)
                replace_state(connection, payload, actor)
                self.send_json(HTTPStatus.OK, load_snapshot(connection, user))
        except RequestError as error:
            self.send_json(error.status, {"error": error.message}, headers=error.headers)
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": map_integrity_error(error)})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        parts = [part for part in parsed.path.split("/") if part]

        try:
            with connect_db() as connection:
                if parsed.path == "/api/state":
                    user = require_admin_user(connection, self)
                    actor = resolve_actor(self, user=user)
                    with connection:
                        connection.execute("DELETE FROM discovery_nonces")
                        connection.execute("DELETE FROM discovery_runs")
                        connection.execute("DELETE FROM discovery_results")
                        connection.execute("UPDATE discovery_agents SET linked_host_device_id = '', updated_at = ?", (utc_now_iso(),))
                        connection.execute("DELETE FROM devices")
                        connection.execute("DELETE FROM range_groups")
                        connection.execute("DELETE FROM subnets")
                        connection.execute("DELETE FROM ip_scan_results")
                        connection.execute("DELETE FROM ip_history")
                    bump_revision("state-changed", {"entity": "state"})
                    self.send_json(HTTPStatus.OK, {"status": "cleared"})
                    return

                if len(parts) == 3 and parts[0] == "api":
                    user = require_write_user(connection, self)
                    actor = resolve_actor(self, user=user)
                    if parts[1] == "subnets":
                        require_accessible_subnet(connection, user, parts[2])
                        cursor = connection.execute("DELETE FROM subnets WHERE id = ?", (parts[2],))
                        connection.commit()
                        if cursor.rowcount == 0:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                        else:
                            bump_revision("state-changed", {"entity": "subnet"})
                            signal_background_scanner(run_scan=True)
                            self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

                    if parts[1] == "groups":
                        group = get_group_for_scan(connection, parts[2])
                        if group is None:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                            return
                        require_accessible_subnet(connection, user, group["subnetId"])
                        cursor = connection.execute("DELETE FROM range_groups WHERE id = ?", (parts[2],))
                        connection.commit()
                        if cursor.rowcount == 0:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                        else:
                            bump_revision("state-changed", {"entity": "group"})
                            self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

                    if parts[1] == "devices":
                        row = connection.execute("SELECT * FROM devices WHERE id = ?", (parts[2],)).fetchone()
                        if row is None:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                            return

                        device = device_from_row(row)
                        if device["subnetId"]:
                            require_accessible_subnet(connection, user, device["subnetId"])
                        with connection:
                            connection.execute("DELETE FROM devices WHERE id = ?", (parts[2],))
                            record_history(
                                connection,
                                device_id=device["id"],
                                device_name=device["name"],
                                ip=device["ip"],
                                previous_ip=device["ip"],
                                action="released",
                                actor=actor,
                                note="Удалено вручную",
                            )

                        bump_revision("state-changed", {"entity": "device"})
                        signal_background_scanner(run_scan=True)
                        self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

                if len(parts) == 4 and parts[0] == "api" and parts[1] == "admin":
                    user = require_admin_user(connection, self)
                    if parts[2] == "access-groups":
                        delete_access_group(connection, parts[3])
                        self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return
                    if parts[2] == "users":
                        delete_user_by_admin(connection, user, parts[3])
                        self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

                if (
                    len(parts) == 5
                    and parts[0] == "api"
                    and parts[1] == "admin"
                    and parts[2] == "discovery"
                    and parts[3] == "agents"
                ):
                    admin_user = require_admin_user(connection, self)
                    query = parse_qs(parsed.query)
                    delete_related = (query.get("mode") or [""])[0] == "with_related"
                    self.send_json(
                        HTTPStatus.OK,
                        delete_discovery_agent(
                            connection,
                            parts[4],
                            resolve_actor(self, user=admin_user),
                            delete_related_records=delete_related,
                        ),
                    )
                    return

                if parsed.path == "/api/admin/history":
                    user = require_admin_user(connection, self)
                    clear_history(connection, resolve_actor(self, user=user))
                    self.send_json(HTTPStatus.OK, {"status": "cleared"})
                    return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message}, headers=error.headers)
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": map_integrity_error(error)})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def handle_sse_stream(self) -> None:
        with connect_db() as connection:
            try:
                require_authenticated_user(connection, self)
            except RequestError as error:
                self.send_json(error.status, {"error": error.message}, headers=error.headers)
                return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        subscriber: queue.Queue[str] = queue.Queue(maxsize=32)
        with SUBSCRIBERS_LOCK:
            SUBSCRIBERS.add(subscriber)

        initial_event = json.dumps(
            {"type": "hello", "revision": get_current_revision(), "at": utc_now_iso()},
            ensure_ascii=False,
        )

        try:
            self.wfile.write(f"data: {initial_event}\n\n".encode("utf-8"))
            self.wfile.flush()

            while True:
                try:
                    message = subscriber.get(timeout=20)
                    self.wfile.write(f"data: {message}\n\n".encode("utf-8"))
                except queue.Empty:
                    self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with SUBSCRIBERS_LOCK:
                SUBSCRIBERS.discard(subscriber)

    def serve_static(self, raw_path: str) -> None:
        request_path = raw_path or "/"
        if request_path == "/":
            target = ROOT_DIR / "index.html"
        else:
            relative_path = request_path.lstrip("/")
            if relative_path not in STATIC_FILES:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Файл не найден."})
                return
            target = ROOT_DIR / relative_path

        if not target.exists() or not target.is_file():
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Файл не найден."})
            return

        content_type, _ = mimetypes.guess_type(target.name)
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(data)

    def read_json_body(self, *, max_bytes: int | None = None) -> dict:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise RequestError(HTTPStatus.BAD_REQUEST, "Content-Length is invalid.") from error
        if content_length <= 0:
            return {}
        if max_bytes is not None and content_length > max_bytes:
            raise RequestError(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                f"JSON payload is too large. Limit is {max_bytes} bytes.",
            )

        raw_body = self.rfile.read(content_length)
        if max_bytes is not None and len(raw_body) > max_bytes:
            raise RequestError(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                f"JSON payload is too large. Limit is {max_bytes} bytes.",
            )
        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("Некорректный JSON.") from error

    def send_json(
        self,
        status: HTTPStatus,
        payload: dict,
        *,
        headers: list[tuple[str, str]] | None = None,
    ) -> None:
        response = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        for header_name, header_value in headers or []:
            self.send_header(header_name, header_value)
        self.end_headers()
        self.wfile.write(response)

    def build_session_cookie(self, token: str, expires_at: str) -> str:
        expires_http = parse_iso8601(expires_at).strftime("%a, %d %b %Y %H:%M:%S GMT")
        return (
            f"{SESSION_COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; "
            f"Max-Age={SESSION_TTL_SECONDS}; Expires={expires_http}"
        )

    def build_clear_session_cookie(self) -> str:
        return (
            f"{SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; "
            "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        )

    def log_message(self, format: str, *args) -> None:
        return


def main() -> None:
    ensure_db()
    background_scanner = BackgroundScanner()
    background_scanner.start()
    server = ThreadingHTTPServer((HOST, PORT), ATLASRequestHandler)
    print(f"ATLAS server is running on http://{HOST}:{PORT}")
    print(f"SQLite DB: {DB_PATH}")
    try:
        signal_background_scanner(run_scan=True)
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        STOP_EVENT.set()
        signal_background_scanner(run_scan=False)
        server.server_close()


if __name__ == "__main__":
    main()
