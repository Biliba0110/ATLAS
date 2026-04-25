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
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


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

CREATE INDEX IF NOT EXISTS idx_subnets_network_int ON subnets(network_int);
CREATE INDEX IF NOT EXISTS idx_groups_subnet_id ON range_groups(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_subnet_id ON devices(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_scan_subnet_id ON ip_scan_results(subnet_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON ip_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_access_groups_user_id ON user_access_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
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
    def __init__(self, status: HTTPStatus, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


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


def normalize_ip_address(value: object) -> str:
    raw_value = str(value or "").strip()
    if not raw_value:
        raise ValueError("IP-адрес не может быть пустым.")
    try:
        return str(ipaddress.ip_address(raw_value))
    except ValueError as error:
        raise ValueError("Указан некорректный IP-адрес.") from error


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

    if int(range_start_ip) < int(network.network_address) or int(range_end_ip) > int(network.broadcast_address):
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
        "iot": "iot",
    }
    device_type = aliases.get(raw_value, raw_value.replace(" ", "-"))
    if not device_type or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for character in device_type):
        raise ValueError("Тип устройства должен содержать только латинские буквы, цифры, дефис или подчёркивание.")
    return device_type


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
    ip_int = ip_to_int_value(ip)

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

    duplicate_ip = connection.execute(
        "SELECT id, name FROM devices WHERE ip = ? AND id != ? LIMIT 1",
        (ip, device_id),
    ).fetchone()
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


def export_backup(connection: sqlite3.Connection, include: dict | None = None) -> dict:
    include = include or {}
    include_inventory = bool(include.get("inventory", True))
    include_activity = bool(include.get("activity", True))
    include_system = bool(include.get("system", True))
    include_access = bool(include.get("access", True))
    include_preferences = bool(include.get("preferences", True))

    payload = {
        "kind": "atlas-backup",
        "version": "0.2.5",
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

    return payload


def import_backup(connection: sqlite3.Connection, backup: dict, actor: str) -> dict:
    if str(backup.get("kind") or "").strip() != "atlas-backup":
        raise ValueError("Файл не похож на backup ATLAS.")

    sections = backup.get("sections")
    if not isinstance(sections, dict) or not sections:
        raise ValueError("В backup отсутствуют секции для восстановления.")

    replaced_access = False

    with connection:
        if "inventory" in sections:
            inventory = sections.get("inventory") or {}
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

    bump_revision("backup-imported", {"entity": "backup"})
    signal_background_scanner(run_scan=True)
    return {
        "status": "ok",
        "requiresReauth": replaced_access,
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
        "suggestionMode": "compact",
        "language": "ru",
        "customSignature": "",
        "customGroupTemplates": [],
        "customDeviceTypes": [],
    }
    rows = connection.execute(
        "SELECT key, value FROM user_settings WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    for row in rows:
        key = row["key"]
        raw_value = row["value"]
        if key in {"autoRescanAfterDeviceSave"}:
            defaults[key] = raw_value == "1"
        elif key in {"customGroupTemplates", "customDeviceTypes"}:
            try:
                defaults[key] = json.loads(raw_value)
            except json.JSONDecodeError:
                defaults[key] = []
        else:
            defaults[key] = raw_value
    return defaults


def save_user_preferences(connection: sqlite3.Connection, user_id: str, payload: dict) -> dict:
    allowed_keys = {
        "operator",
        "accentTheme",
        "autoRescanAfterDeviceSave",
        "suggestionMode",
        "language",
        "customSignature",
        "customGroupTemplates",
        "customDeviceTypes",
    }
    now = utc_now_iso()
    changed = False

    for key in allowed_keys:
        if key not in payload:
            continue

        value = payload[key]
        if key == "autoRescanAfterDeviceSave":
            stored_value = "1" if bool(value) else "0"
        elif key in {"customGroupTemplates", "customDeviceTypes"}:
            stored_value = json.dumps(value if isinstance(value, list) else [], ensure_ascii=False)
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


def load_settings(connection: sqlite3.Connection) -> dict:
    return {
        "scanIntervalSeconds": get_scan_interval_seconds(connection),
        "defaultSubnetScanEnabled": get_default_subnet_scan_enabled(connection),
        "scanTimeoutMs": SCAN_TIMEOUT_MS,
        "scanConcurrency": SCAN_CONCURRENCY,
        "limits": {
            "scanIntervalMin": MIN_SCAN_INTERVAL_SECONDS,
            "scanIntervalMax": MAX_SCAN_INTERVAL_SECONDS,
        },
    }


def update_settings(connection: sqlite3.Connection, payload: dict) -> dict:
    supported_keys = {"scanIntervalSeconds", "defaultSubnetScanEnabled", "subnetScanSettings"}
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
            id, name, ip, mac, type, subnet_id, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            device["id"],
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
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
    cursor = connection.execute(
        """
        UPDATE devices
        SET name = ?, ip = ?, mac = ?, type = ?, subnet_id = ?, note = ?
        WHERE id = ?
        """,
        (
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
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
    }


def replace_state(connection: sqlite3.Connection, snapshot: dict, actor: str) -> None:
    existing_devices = {
        row["id"]: device_from_row(row)
        for row in connection.execute("SELECT * FROM devices")
    }

    with connection:
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
            id, name, ip, mac, type, subnet_id, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            device["id"],
            device["name"],
            device["ip"],
            device.get("mac", ""),
            device["type"],
            device.get("subnetId") or None,
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
    source: str = "manual",
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
    server_version = "ATLAS/0.2.5"

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

            if parsed.path == "/api/stream":
                self.handle_sse_stream()
                return

            if parsed.path == "/health":
                self.send_json(HTTPStatus.OK, {"status": "ok"})
                return

            self.serve_static(parsed.path)
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()
            with connect_db() as connection:
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
                        source="manual",
                        only_enabled_subnets=not subnet_id and not group_id,
                    )
                    self.send_json(HTTPStatus.OK, summary)
                    return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
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
                    require_admin_user(connection, self)
                    self.send_json(HTTPStatus.OK, update_settings(connection, payload))
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
            self.send_json(error.status, {"error": error.message})
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
            self.send_json(error.status, {"error": error.message})
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

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except RequestError as error:
            self.send_json(error.status, {"error": error.message})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": map_integrity_error(error)})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def handle_sse_stream(self) -> None:
        with connect_db() as connection:
            try:
                require_authenticated_user(connection, self)
            except RequestError as error:
                self.send_json(error.status, {"error": error.message})
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

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            return {}

        raw_body = self.rfile.read(content_length)
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
