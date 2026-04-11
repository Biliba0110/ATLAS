#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = Path(os.environ.get("IPAM_DB_PATH", DATA_DIR / "ipam.db"))
HOST = os.environ.get("IPAM_HOST", "0.0.0.0")
PORT = int(os.environ.get("IPAM_PORT", "4173"))

STATIC_FILES = {
    "index.html",
    "styles.css",
    "app.js",
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

CREATE INDEX IF NOT EXISTS idx_subnets_network_int ON subnets(network_int);
CREATE INDEX IF NOT EXISTS idx_groups_subnet_id ON range_groups(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_subnet_id ON devices(subnet_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
"""


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
    return {
        "subnets": subnets,
        "groups": groups,
        "devices": devices,
    }


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
    return group


def insert_device(connection: sqlite3.Connection, device: dict) -> dict:
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
    connection.commit()
    return {
        **device,
        "subnetId": device.get("subnetId", ""),
        "mac": device.get("mac", ""),
    }


def replace_state(connection: sqlite3.Connection, snapshot: dict) -> None:
    with connection:
        connection.execute("DELETE FROM devices")
        connection.execute("DELETE FROM range_groups")
        connection.execute("DELETE FROM subnets")

        for subnet in snapshot.get("subnets", []):
            insert_subnet_without_commit(connection, subnet)
        for group in snapshot.get("groups", []):
            insert_group_without_commit(connection, group)
        for device in snapshot.get("devices", []):
            insert_device_without_commit(connection, device)


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


class IPAMRequestHandler(BaseHTTPRequestHandler):
    server_version = "HomeLabIPAM/0.3"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/state":
            with connect_db() as connection:
                self.send_json(HTTPStatus.OK, load_snapshot(connection))
            return

        if parsed.path == "/health":
            self.send_json(HTTPStatus.OK, {"status": "ok"})
            return

        self.serve_static(parsed.path)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()
            with connect_db() as connection:
                if parsed.path == "/api/subnets":
                    self.send_json(HTTPStatus.CREATED, insert_subnet(connection, payload))
                    return
                if parsed.path == "/api/groups":
                    self.send_json(HTTPStatus.CREATED, insert_group(connection, payload))
                    return
                if parsed.path == "/api/devices":
                    self.send_json(HTTPStatus.CREATED, insert_device(connection, payload))
                    return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"Ошибка базы данных: {error}"})
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
                replace_state(connection, payload)
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
            with connect_db() as connection:
                if parsed.path == "/api/state":
                    with connection:
                        connection.execute("DELETE FROM devices")
                        connection.execute("DELETE FROM range_groups")
                        connection.execute("DELETE FROM subnets")
                    self.send_json(HTTPStatus.OK, {"status": "cleared"})
                    return

                if len(parts) == 3 and parts[0] == "api":
                    table_name = None
                    if parts[1] == "subnets":
                        table_name = "subnets"
                    elif parts[1] == "groups":
                        table_name = "range_groups"
                    elif parts[1] == "devices":
                        table_name = "devices"

                    if table_name is not None:
                        cursor = connection.execute(f"DELETE FROM {table_name} WHERE id = ?", (parts[2],))
                        connection.commit()
                        if cursor.rowcount == 0:
                            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Запись не найдена."})
                        else:
                            self.send_json(HTTPStatus.OK, {"status": "deleted"})
                        return

            self.send_json(HTTPStatus.NOT_FOUND, {"error": "API endpoint не найден."})
        except sqlite3.IntegrityError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": f"Ошибка базы данных: {error}"})
        except Exception as error:  # noqa: BLE001
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

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
    server = ThreadingHTTPServer((HOST, PORT), IPAMRequestHandler)
    print(f"HomeLab IPAM server is running on http://{HOST}:{PORT}")
    print(f"SQLite DB: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
