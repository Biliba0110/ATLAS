#!/usr/bin/env python3
from __future__ import annotations

import concurrent.futures
import json
import mimetypes
import os
import platform
import queue
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
SCAN_INTERVAL_SECONDS = int(os.environ.get("ATLAS_SCAN_INTERVAL", "90"))
SCAN_TIMEOUT_MS = int(os.environ.get("ATLAS_SCAN_TIMEOUT_MS", "1000"))
SCAN_CONCURRENCY = max(1, int(os.environ.get("ATLAS_SCAN_CONCURRENCY", "32")))
HISTORY_LIMIT = int(os.environ.get("ATLAS_HISTORY_LIMIT", "200"))

STATIC_FILES = {
    "index.html",
    "styles.css",
    "app.js",
    "group-suggestion-templates.json",
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

CREATE INDEX IF NOT EXISTS idx_subnets_network_int ON subnets(network_int);
CREATE INDEX IF NOT EXISTS idx_groups_subnet_id ON range_groups(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_subnet_id ON devices(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_scan_subnet_id ON ip_scan_results(subnet_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON ip_history(changed_at DESC);
"""

SUBSCRIBERS: set[queue.Queue[str]] = set()
SUBSCRIBERS_LOCK = threading.Lock()
SCAN_LOCK = threading.Lock()
SCAN_REQUEST_EVENT = threading.Event()
STOP_EVENT = threading.Event()
REVISION_LOCK = threading.Lock()
CURRENT_REVISION = 0


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.executescript(SCHEMA)
        connection.commit()


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


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


def load_snapshot(connection: sqlite3.Connection) -> dict:
    subnets = [
        subnet_from_row(row)
        for row in connection.execute("SELECT * FROM subnets ORDER BY created_at DESC, rowid DESC")
    ]
    groups = [
        group_from_row(row)
        for row in connection.execute("SELECT * FROM range_groups ORDER BY created_at DESC, rowid DESC")
    ]
    devices = [
        device_from_row(row)
        for row in connection.execute("SELECT * FROM devices ORDER BY created_at DESC, rowid DESC")
    ]
    scan_results = [
        scan_result_from_row(row)
        for row in connection.execute(
            "SELECT * FROM ip_scan_results ORDER BY checked_at DESC, ip ASC"
        )
    ]
    history = [
        history_from_row(row)
        for row in connection.execute(
            "SELECT * FROM ip_history ORDER BY changed_at DESC, id DESC LIMIT ?",
            (HISTORY_LIMIT,),
        )
    ]
    last_scan_row = connection.execute(
        "SELECT MAX(checked_at) AS last_scan_at FROM ip_scan_results"
    ).fetchone()
    return {
        "subnets": subnets,
        "groups": groups,
        "devices": devices,
        "scanResults": scan_results,
        "history": history,
        "meta": {
            "revision": get_current_revision(),
            "lastScanAt": last_scan_row["last_scan_at"] if last_scan_row else None,
            "scanInProgress": SCAN_LOCK.locked(),
            "scanIntervalSeconds": SCAN_INTERVAL_SECONDS,
        },
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


def resolve_actor(handler: BaseHTTPRequestHandler, payload: dict | None = None) -> str:
    actor = handler.headers.get("X-ATLAS-Actor", "").strip()
    if not actor and payload:
        actor = str(payload.get("actor", "")).strip()
    return actor or "system"


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
            pool_size, usable_hosts, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            subnet.get("note", ""),
            subnet["createdAt"],
        ),
    )
    connection.commit()
    bump_revision("state-changed", {"entity": "subnet"})
    SCAN_REQUEST_EVENT.set()
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
    SCAN_REQUEST_EVENT.set()
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
    SCAN_REQUEST_EVENT.set()


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
            pool_size, usable_hosts, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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


def get_subnets_for_scan(connection: sqlite3.Connection, subnet_id: str | None = None) -> list[dict]:
    query = "SELECT * FROM subnets"
    params: tuple = ()
    if subnet_id:
        query += " WHERE id = ?"
        params = (subnet_id,)

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


def perform_scan(
    subnet_id: str | None = None,
    group_id: str | None = None,
    source: str = "manual",
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
                for subnet in get_subnets_for_scan(connection, subnet_id):
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
                if target["scope"] == "subnet":
                    connection.execute("DELETE FROM ip_scan_results WHERE subnet_id = ?", (target["subnetId"],))

                if ip_values:
                    with concurrent.futures.ThreadPoolExecutor(
                        max_workers=min(SCAN_CONCURRENCY, len(ip_values))
                    ) as executor:
                        ping_results = list(executor.map(ping_ip, ip_values))
                else:
                    ping_results = []

                for ip, is_reachable in zip(ip_values, ping_results):
                    scanned_ips += 1
                    reachable_ips += 1 if is_reachable else 0
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
                        (
                            ip,
                            target["subnetId"],
                            1 if is_reachable else 0,
                            now,
                            source,
                        ),
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
            triggered = SCAN_REQUEST_EVENT.wait(timeout=SCAN_INTERVAL_SECONDS)
            SCAN_REQUEST_EVENT.clear()

            if STOP_EVENT.is_set():
                return

            try:
                perform_scan(source="background")
            except FileNotFoundError:
                print("Ping command not found; background scanning disabled.")
                return
            except Exception as error:  # noqa: BLE001
                if triggered:
                    print(f"Background scan failed: {error}")


class ATLASRequestHandler(BaseHTTPRequestHandler):
    server_version = "ATLAS/0.4"

    def handle(self) -> None:
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/state":
            with connect_db() as connection:
                self.send_json(HTTPStatus.OK, load_snapshot(connection))
            return

        if parsed.path == "/api/stream":
            self.handle_sse_stream()
            return

        if parsed.path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok"})
            return

        self.serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()
            actor = resolve_actor(self, payload)
            with connect_db() as connection:
                if parsed.path == "/api/subnets":
                    self.send_json(HTTPStatus.CREATED, insert_subnet(connection, payload))
                    return
                if parsed.path == "/api/groups":
                    self.send_json(HTTPStatus.CREATED, insert_group(connection, payload))
                    return
                if parsed.path == "/api/devices":
                    self.send_json(HTTPStatus.CREATED, insert_device(connection, payload, actor))
                    return
                if parsed.path == "/api/scan":
                    summary = perform_scan(
                        payload.get("subnetId"),
                        payload.get("groupId"),
                        source="manual",
                    )
                    self.send_json(HTTPStatus.OK, summary)
                    return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"Ошибка базы данных: {error}"})
        except FileNotFoundError:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Команда ping не найдена на сервере."})
        except subprocess.TimeoutExpired:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Ping превысил таймаут на сервере."})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path != "/api/state":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
            return

        try:
            payload = self.read_json_body()
            actor = resolve_actor(self, payload)
            with connect_db() as connection:
                replace_state(connection, payload, actor)
                self.send_json(HTTPStatus.OK, load_snapshot(connection))
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"Ошибка базы данных: {error}"})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        parts = [part for part in parsed.path.split("/") if part]

        try:
            actor = resolve_actor(self)
            with connect_db() as connection:
                if parsed.path == "/api/state":
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
                    if parts[1] == "subnets":
                        cursor = connection.execute("DELETE FROM subnets WHERE id = ?", (parts[2],))
                        connection.commit()
                        if cursor.rowcount == 0:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                        else:
                            bump_revision("state-changed", {"entity": "subnet"})
                            SCAN_REQUEST_EVENT.set()
                            self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

                    if parts[1] == "groups":
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
                        SCAN_REQUEST_EVENT.set()
                        self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"Ошибка базы данных: {error}"})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def handle_sse_stream(self) -> None:
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

    def send_json(self, status: HTTPStatus, payload: dict) -> None:
        response = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

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
        SCAN_REQUEST_EVENT.set()
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        STOP_EVENT.set()
        SCAN_REQUEST_EVENT.set()
        server.server_close()


if __name__ == "__main__":
    main()
