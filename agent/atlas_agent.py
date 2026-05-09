#!/usr/bin/env python3
"""ATLAS discovery agent MVP.

Collects local host metadata and pushes signed discovery snapshots to ATLAS.
The agent uses outbound HTTPS by default and has no third-party dependencies.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import http.client
import ipaddress
import json
import os
import platform
import random
import socket
import ssl
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib import request
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse


SCHEMA = "atlas.discovery.snapshot.v1"
AGENT_VERSION = "0.3-mvp"
DEFAULT_MAX_ITEMS_PER_PACKET = 450
DEFAULT_MAX_PACKET_BYTES = 480 * 1024
DEFAULT_MAX_PACKETS_PER_SOURCE = 32
DEFAULT_BACKOFF_INITIAL_SECONDS = 30
DEFAULT_BACKOFF_MAX_SECONDS = 900
DEFAULT_BACKOFF_JITTER = 0.2
DEFAULT_REQUEST_TIMEOUT_SECONDS = 20
MIN_MAX_ITEMS_PER_PACKET = 1
MIN_MAX_PACKET_BYTES = 64 * 1024
DEFAULT_CONFIG_PATH = Path(__file__).with_name("atlas-agent.json")
DEFAULT_DOCKER_SOCKETS = [
    "/var/run/docker.sock",
    str(Path.home() / ".docker" / "run" / "docker.sock"),
]
KUBERNETES_SERVICE_ACCOUNT_DIR = Path("/var/run/secrets/kubernetes.io/serviceaccount")


class AgentRequestError(RuntimeError):
    def __init__(self, message: str, *, retry_after: int | None = None, status: int | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after
        self.status = status


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def hmac_sha256_hex(secret: str, message: str) -> str:
    return hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def read_json_file(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError as error:
        raise SystemExit(f"Config file not found: {path}") from error
    except json.JSONDecodeError as error:
        raise SystemExit(f"Config file is not valid JSON: {path}: {error}") from error
    if not isinstance(data, dict):
        raise SystemExit("Config root must be a JSON object.")
    return data


def require_text(config: dict[str, Any], key: str) -> str:
    value = str(config.get(key) or "").strip()
    if not value:
        raise SystemExit(f"Config value '{key}' is required.")
    return value


def limit_text(value: Any, limit: int = 500) -> str:
    text = str(value or "").strip()
    if len(text) > limit:
        return text[:limit]
    return text


def normalize_enabled_collectors(config: dict[str, Any]) -> list[str]:
    raw_collectors = config.get("enabled_collectors", ["host"])
    if isinstance(raw_collectors, str):
        raw_collectors = [item.strip() for item in raw_collectors.split(",")]
    if not isinstance(raw_collectors, list):
        raise SystemExit("Config value 'enabled_collectors' must be a list or comma-separated string.")

    collectors: list[str] = []
    for raw_collector in raw_collectors:
        collector = str(raw_collector or "").strip().lower()
        if not collector:
            continue
        if collector not in {"host", "docker", "kubernetes", "proxmox"}:
            raise SystemExit(f"Unsupported collector: {collector}")
        if collector not in collectors:
            collectors.append(collector)
    return collectors or ["host"]


def normalize_interval(value: Any) -> int:
    try:
        interval = int(value)
    except (TypeError, ValueError) as error:
        raise SystemExit("Config value 'interval' must be an integer.") from error
    if interval < 15:
        raise SystemExit("Config value 'interval' must be at least 15 seconds.")
    return interval


def normalize_request_timeout(value: Any) -> int:
    try:
        timeout = int(value)
    except (TypeError, ValueError) as error:
        raise SystemExit("Config value 'timeout' must be an integer.") from error
    if timeout < 2:
        raise SystemExit("Config value 'timeout' must be at least 2 seconds.")
    return timeout


def normalize_float(value: Any, default: float, *, minimum: float, maximum: float, key: str) -> float:
    try:
        number = float(value if value is not None else default)
    except (TypeError, ValueError) as error:
        raise SystemExit(f"Config value '{key}' must be a number.") from error
    if number < minimum or number > maximum:
        raise SystemExit(f"Config value '{key}' must be between {minimum} and {maximum}.")
    return number


def normalize_positive_int(value: Any, default: int, *, minimum: int, key: str) -> int:
    try:
        number = int(value if value is not None else default)
    except (TypeError, ValueError) as error:
        raise SystemExit(f"Config value '{key}' must be an integer.") from error
    if number < minimum:
        raise SystemExit(f"Config value '{key}' must be at least {minimum}.")
    return number


def validate_atlas_url(config: dict[str, Any]) -> str:
    atlas_url = require_text(config, "atlas_url").rstrip("/")
    parsed = urlparse(atlas_url)
    allow_insecure_http = bool(config.get("allow_insecure_http", False))
    if parsed.scheme != "https" and not (parsed.scheme == "http" and allow_insecure_http):
        raise SystemExit("atlas_url must use https. Set allow_insecure_http=true only for local testing.")
    if not parsed.netloc:
        raise SystemExit("atlas_url must include host and optional port.")
    return atlas_url


def parse_retry_after(value: Any) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        seconds = int(text)
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(text)
        except (TypeError, ValueError):
            return None
        if retry_at.tzinfo is None:
            retry_at = retry_at.replace(tzinfo=timezone.utc)
        return max(0, int((retry_at - datetime.now(timezone.utc)).total_seconds()))
    return max(0, seconds)


def backoff_delay_seconds(
    config: dict[str, Any],
    *,
    interval: int,
    failures: int,
    retry_after: int | None = None,
) -> int:
    initial = normalize_positive_int(
        config.get("backoff_initial_seconds"),
        DEFAULT_BACKOFF_INITIAL_SECONDS,
        minimum=1,
        key="backoff_initial_seconds",
    )
    maximum = normalize_positive_int(
        config.get("backoff_max_seconds"),
        DEFAULT_BACKOFF_MAX_SECONDS,
        minimum=initial,
        key="backoff_max_seconds",
    )
    jitter = normalize_float(
        config.get("backoff_jitter"),
        DEFAULT_BACKOFF_JITTER,
        minimum=0.0,
        maximum=1.0,
        key="backoff_jitter",
    )
    failure_count = max(1, int(failures or 1))
    exponential = initial * (2 ** min(failure_count - 1, 10))
    delay = min(max(interval, exponential), maximum)
    if retry_after is not None:
        delay = min(max(delay, retry_after), maximum)
        return max(1, int(delay * (1 + random.uniform(0, jitter))))
    jitter_factor = 1 + random.uniform(-jitter, jitter)
    return max(1, int(delay * jitter_factor))


def read_machine_identity() -> str:
    candidates = [
        Path("/etc/machine-id"),
        Path("/var/lib/dbus/machine-id"),
    ]
    for path in candidates:
        try:
            value = path.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if value:
            return value
    return f"{platform.node()}:{uuid.getnode()}"


def stable_host_id() -> str:
    digest = hashlib.sha256(read_machine_identity().encode("utf-8")).hexdigest()
    return digest[:16]


def format_mac(node: int) -> str:
    return ":".join(f"{(node >> offset) & 0xff:02X}" for offset in range(40, -1, -8))


def is_usable_ipv4(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return ip.version == 4 and not ip.is_loopback and not ip.is_link_local and not ip.is_multicast


def first_usable_ipv4(values: list[str]) -> str:
    for value in values:
        candidate = value.strip()
        if is_usable_ipv4(candidate):
            return candidate
    return ""


def run_command(command: list[str]) -> str:
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=2, check=False)
    except (OSError, subprocess.SubprocessError):
        return ""
    if completed.returncode != 0:
        return ""
    return completed.stdout.strip()


def get_primary_ip_from_system() -> str:
    system = platform.system().lower()
    if system == "darwin":
        for interface in ["en0", "en1", "en2", "eth0"]:
            output = run_command(["ipconfig", "getifaddr", interface])
            if is_usable_ipv4(output):
                return output

    output = run_command(["hostname", "-I"])
    if output:
        ip = first_usable_ipv4(output.split())
        if ip:
            return ip

    output = run_command(["ip", "-o", "-4", "addr", "show", "scope", "global"])
    if output:
        values: list[str] = []
        for line in output.splitlines():
            parts = line.split()
            if "inet" not in parts:
                continue
            inet_index = parts.index("inet")
            if inet_index + 1 < len(parts):
                values.append(parts[inet_index + 1].split("/", 1)[0])
        ip = first_usable_ipv4(values)
        if ip:
            return ip

    output = run_command(["ifconfig"])
    if output:
        values = []
        for line in output.splitlines():
            parts = line.strip().split()
            if len(parts) >= 2 and parts[0] == "inet":
                values.append(parts[1])
        ip = first_usable_ipv4(values)
        if ip:
            return ip

    output = run_command(["ipconfig"])
    if output:
        values = []
        for line in output.splitlines():
            if "IPv4" not in line:
                continue
            values.append(line.rsplit(":", 1)[-1].strip())
        ip = first_usable_ipv4(values)
        if ip:
            return ip

    return ""


def get_primary_ip() -> str:
    hostname = socket.gethostname()
    try:
        candidates = socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_DGRAM)
    except socket.gaierror:
        candidates = []
    for candidate in candidates:
        ip = str(candidate[4][0])
        if ip and not ip.startswith("127."):
            return ip

    system_ip = get_primary_ip_from_system()
    if system_ip:
        return system_ip

    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("192.0.2.1", 9))
        ip = str(probe.getsockname()[0])
        return "" if ip.startswith("127.") else ip
    except OSError:
        return ""
    finally:
        probe.close()


def collect_host_inventory(source_name: str, observed_at: str) -> dict[str, Any]:
    hostname = socket.gethostname()
    fqdn = socket.getfqdn()
    primary_ip = get_primary_ip()
    mac = format_mac(uuid.getnode())
    host_id = stable_host_id()
    system = {
        "hostname": hostname,
        "fqdn": fqdn,
        "primaryIp": primary_ip,
        "mac": mac,
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "agentVersion": AGENT_VERSION,
    }
    raw = {key: value for key, value in system.items() if value}
    return {
        "host": raw,
        "item": {
            "source": source_name,
            "sourceId": f"host:{host_id}",
            "sourceKind": "host",
            "hostDeviceId": "",
            "name": hostname or fqdn or f"host-{host_id}",
            "status": "running",
            "ports": "",
            "accessPort": "",
            "serviceUrl": "",
            "lastSeenAt": observed_at,
            "raw": raw,
        },
    }


class UnixSocketHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path: str, timeout: int = 10) -> None:
        super().__init__("localhost", timeout=timeout)
        self.socket_path = socket_path

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.socket_path)


def docker_socket_from_config(config: dict[str, Any]) -> str:
    docker_socket = str(config.get("docker_socket") or "").strip()
    if docker_socket:
        return docker_socket.removeprefix("unix://")
    docker_host = str(config.get("docker_host") or "").strip()
    if docker_host.startswith("unix://"):
        return docker_host.removeprefix("unix://")
    for socket_path in DEFAULT_DOCKER_SOCKETS:
        if Path(socket_path).exists():
            return socket_path
    return ""


def docker_request(config: dict[str, Any], path: str) -> Any:
    timeout = int(config.get("docker_timeout", config.get("timeout", 10)))
    docker_host = str(config.get("docker_host") or "").strip()
    docker_socket = docker_socket_from_config(config)

    if docker_socket:
        connection = UnixSocketHTTPConnection(docker_socket, timeout=timeout)
        try:
            connection.request("GET", path)
            response = connection.getresponse()
            body = response.read().decode("utf-8", errors="replace")
        finally:
            connection.close()
    elif docker_host.startswith("http://") or docker_host.startswith("https://"):
        endpoint = docker_host.rstrip("/") + path
        with request.urlopen(endpoint, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            status = response.status
        if status >= 400:
            raise RuntimeError(f"Docker API returned HTTP {status}: {body}")
        return json.loads(body or "{}")
    else:
        raise RuntimeError("Docker socket was not found. Set docker_socket or docker_host explicitly.")

    if response.status >= 400:
        raise RuntimeError(f"Docker API returned HTTP {response.status}: {body}")
    return json.loads(body or "{}")


def trim_dict(raw: dict[str, Any], *, max_items: int = 50, max_value_length: int = 200) -> dict[str, str]:
    result: dict[str, str] = {}
    for index, key in enumerate(sorted(raw)):
        if index >= max_items:
            break
        value = raw.get(key)
        if value is None:
            continue
        result[limit_text(key, 120)] = limit_text(value, max_value_length)
    return result


def docker_status(state: str) -> str:
    normalized = str(state or "").strip().lower()
    if normalized in {"running", "restarting"}:
        return "running"
    if normalized in {"exited", "created", "paused", "removing"}:
        return "stopped"
    if normalized in {"dead"}:
        return "offline"
    return "unknown" if normalized else ""


def format_docker_port(port_key: str) -> str:
    return str(port_key or "").replace("/", "/").strip()


def extract_docker_ports(inspect_data: dict[str, Any]) -> tuple[str, str]:
    exposed_ports = set()
    published_ports = []

    config_ports = inspect_data.get("Config", {}).get("ExposedPorts")
    if isinstance(config_ports, dict):
        exposed_ports.update(format_docker_port(key) for key in config_ports)

    network_ports = inspect_data.get("NetworkSettings", {}).get("Ports")
    if isinstance(network_ports, dict):
        for port_key, bindings in network_ports.items():
            if port_key:
                exposed_ports.add(format_docker_port(port_key))
            if not isinstance(bindings, list):
                continue
            for binding in bindings:
                if not isinstance(binding, dict):
                    continue
                host_port = str(binding.get("HostPort") or "").strip()
                if host_port:
                    protocol = str(port_key or "").split("/", 1)[-1] if "/" in str(port_key) else "tcp"
                    published_ports.append(f"{host_port}/{protocol}")

    ports = ", ".join(sorted(port for port in exposed_ports if port))
    access_port = published_ports[0] if published_ports else ""
    return ports, access_port


def extract_docker_networks(inspect_data: dict[str, Any]) -> list[dict[str, str]]:
    networks = inspect_data.get("NetworkSettings", {}).get("Networks")
    if not isinstance(networks, dict):
        return []
    result = []
    for name, data in sorted(networks.items()):
        if not isinstance(data, dict):
            continue
        result.append({
            "name": limit_text(name, 120),
            "ip": limit_text(data.get("IPAddress"), 80),
            "mac": limit_text(data.get("MacAddress"), 80),
            "networkId": limit_text(data.get("NetworkID"), 80),
        })
    return result


def docker_container_name(container: dict[str, Any], inspect_data: dict[str, Any]) -> str:
    inspect_name = str(inspect_data.get("Name") or "").strip().lstrip("/")
    if inspect_name:
        return inspect_name
    names = container.get("Names")
    if isinstance(names, list) and names:
        return str(names[0]).strip().lstrip("/")
    return str(container.get("Id") or "container")[:12]


def docker_item_from_container(container: dict[str, Any], inspect_data: dict[str, Any], observed_at: str) -> dict[str, Any]:
    container_id = str(container.get("Id") or inspect_data.get("Id") or "").strip()
    ports, access_port = extract_docker_ports(inspect_data)
    labels = trim_dict(inspect_data.get("Config", {}).get("Labels") or {})
    networks = extract_docker_networks(inspect_data)
    raw = {
        "containerId": container_id[:12],
        "image": limit_text(inspect_data.get("Config", {}).get("Image") or container.get("Image"), 300),
        "statusText": limit_text(container.get("Status"), 300),
        "dockerState": limit_text(inspect_data.get("State", {}).get("Status"), 80),
        "created": limit_text(inspect_data.get("Created") or container.get("Created"), 80),
        "startedAt": limit_text(inspect_data.get("State", {}).get("StartedAt"), 80),
        "finishedAt": limit_text(inspect_data.get("State", {}).get("FinishedAt"), 80),
        "labels": labels,
        "networks": networks,
    }
    raw = {
        key: value
        for key, value in raw.items()
        if value != "" and value != [] and value != {}
    }
    return {
        "source": "docker",
        "sourceId": f"docker:{container_id}",
        "sourceKind": "container",
        "hostDeviceId": "",
        "name": docker_container_name(container, inspect_data),
        "status": docker_status(inspect_data.get("State", {}).get("Status") or container.get("State")),
        "ports": ports,
        "accessPort": access_port,
        "serviceUrl": "",
        "lastSeenAt": observed_at,
        "raw": raw,
    }


def collect_docker_inventory(config: dict[str, Any], observed_at: str) -> dict[str, Any]:
    version = docker_request(config, "/version")
    query = urlencode({"all": "1"})
    containers = docker_request(config, f"/containers/json?{query}")
    if not isinstance(containers, list):
        raise RuntimeError("Docker API returned unexpected containers payload.")

    items = []
    for container in containers:
        if not isinstance(container, dict):
            continue
        container_id = str(container.get("Id") or "").strip()
        if not container_id:
            continue
        inspect_data = docker_request(config, f"/containers/{quote(container_id, safe='')}/json")
        if not isinstance(inspect_data, dict):
            continue
        items.append(docker_item_from_container(container, inspect_data, observed_at))

    return {
        "source": "docker",
        "metadata": {
            "dockerVersion": limit_text(version.get("Version"), 80) if isinstance(version, dict) else "",
            "dockerApiVersion": limit_text(version.get("ApiVersion"), 80) if isinstance(version, dict) else "",
            "containerCount": len(items),
        },
        "items": items,
    }


def read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def kubernetes_api_url_from_config(config: dict[str, Any]) -> str:
    api_url = str(config.get("kubernetes_api_url") or "").strip().rstrip("/")
    if api_url:
        parsed = urlparse(api_url)
        if parsed.scheme == "https":
            return api_url
        if parsed.scheme == "http" and bool(config.get("kubernetes_allow_insecure_http", False)):
            return api_url
        raise RuntimeError("kubernetes_api_url must use https unless kubernetes_allow_insecure_http=true.")

    host = os.environ.get("KUBERNETES_SERVICE_HOST", "").strip()
    port = os.environ.get("KUBERNETES_SERVICE_PORT", "443").strip()
    if host:
        return f"https://{host}:{port or '443'}"
    raise RuntimeError("Kubernetes API URL was not found. Set kubernetes_api_url or run in-cluster.")


def kubernetes_token_from_config(config: dict[str, Any]) -> str:
    token = str(config.get("kubernetes_token") or "").strip()
    if token:
        return token
    token_file = str(config.get("kubernetes_token_file") or "").strip()
    if token_file:
        token = read_text_file(Path(token_file))
        if token:
            return token
    token = read_text_file(KUBERNETES_SERVICE_ACCOUNT_DIR / "token")
    if token:
        return token
    raise RuntimeError("Kubernetes token was not found. Set kubernetes_token or kubernetes_token_file.")


def kubernetes_ssl_context(config: dict[str, Any]) -> ssl.SSLContext | None:
    verify_tls = bool(config.get("kubernetes_verify_tls", config.get("verify_tls", True)))
    if not verify_tls:
        return ssl._create_unverified_context()  # noqa: SLF001
    ca_file = str(config.get("kubernetes_ca_cert") or "").strip()
    if not ca_file:
        service_account_ca = KUBERNETES_SERVICE_ACCOUNT_DIR / "ca.crt"
        if service_account_ca.exists():
            ca_file = str(service_account_ca)
    if ca_file:
        return ssl.create_default_context(cafile=ca_file)
    return None


def kubernetes_request(config: dict[str, Any], path: str) -> Any:
    api_url = kubernetes_api_url_from_config(config)
    token = kubernetes_token_from_config(config)
    endpoint = f"{api_url}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": f"ATLAS-Agent/{AGENT_VERSION}",
    }
    http_request = request.Request(endpoint, headers=headers, method="GET")
    context = kubernetes_ssl_context(config)
    try:
        with request.urlopen(http_request, timeout=int(config.get("kubernetes_timeout", config.get("timeout", 20))), context=context) as response:
            body = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Kubernetes API returned HTTP {error.code}: {body}") from error
    return json.loads(body or "{}")


def kubernetes_namespaces(config: dict[str, Any]) -> list[str] | None:
    if bool(config.get("kubernetes_all_namespaces", False)):
        return None
    raw_namespaces = config.get("kubernetes_namespaces")
    if isinstance(raw_namespaces, str):
        namespaces = [item.strip() for item in raw_namespaces.split(",") if item.strip()]
    elif isinstance(raw_namespaces, list):
        namespaces = [str(item or "").strip() for item in raw_namespaces if str(item or "").strip()]
    else:
        namespaces = []
    if any(namespace in {"*", "all", "all-namespaces"} for namespace in namespaces):
        return None
    if namespaces:
        return namespaces

    namespace = read_text_file(KUBERNETES_SERVICE_ACCOUNT_DIR / "namespace")
    return [namespace or "default"]


def kubernetes_list(config: dict[str, Any], resource: str) -> list[dict[str, Any]]:
    namespaces = kubernetes_namespaces(config)
    query = urlencode({"limit": str(int(config.get("kubernetes_limit", 500)))})
    items: list[dict[str, Any]] = []
    if namespaces is None:
        payload = kubernetes_request(config, f"/api/v1/{resource}?{query}")
        raw_items = payload.get("items") if isinstance(payload, dict) else []
        return [item for item in raw_items if isinstance(item, dict)] if isinstance(raw_items, list) else []
    for namespace in namespaces:
        payload = kubernetes_request(config, f"/api/v1/namespaces/{quote(namespace, safe='')}/{resource}?{query}")
        raw_items = payload.get("items") if isinstance(payload, dict) else []
        if isinstance(raw_items, list):
            items.extend(item for item in raw_items if isinstance(item, dict))
    return items


def kubernetes_object_meta(obj: dict[str, Any]) -> dict[str, Any]:
    metadata = obj.get("metadata") if isinstance(obj.get("metadata"), dict) else {}
    return metadata


def kubernetes_namespace_name(obj: dict[str, Any]) -> tuple[str, str]:
    metadata = kubernetes_object_meta(obj)
    namespace = limit_text(metadata.get("namespace") or "default", 120)
    name = limit_text(metadata.get("name") or "unknown", 160)
    return namespace, name


def kubernetes_status(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "running" or normalized == "active":
        return "running"
    if normalized in {"succeeded", "completed"}:
        return "stopped"
    if normalized in {"failed", "error"}:
        return "offline"
    return "unknown" if normalized else ""


def kubernetes_owner_refs(metadata: dict[str, Any]) -> list[dict[str, str]]:
    owners = metadata.get("ownerReferences")
    if not isinstance(owners, list):
        return []
    result = []
    for owner in owners[:5]:
        if not isinstance(owner, dict):
            continue
        result.append({
            "kind": limit_text(owner.get("kind"), 80),
            "name": limit_text(owner.get("name"), 160),
            "uid": limit_text(owner.get("uid"), 80),
        })
    return result


def kubernetes_pod_ports(pod: dict[str, Any]) -> str:
    ports = set()
    spec = pod.get("spec") if isinstance(pod.get("spec"), dict) else {}
    containers = spec.get("containers") if isinstance(spec.get("containers"), list) else []
    for container in containers:
        if not isinstance(container, dict):
            continue
        raw_ports = container.get("ports") if isinstance(container.get("ports"), list) else []
        for port in raw_ports:
            if not isinstance(port, dict):
                continue
            container_port = str(port.get("containerPort") or "").strip()
            if not container_port:
                continue
            protocol = str(port.get("protocol") or "TCP").lower()
            ports.add(f"{container_port}/{protocol}")
    return ", ".join(sorted(ports))


def kubernetes_pod_item(pod: dict[str, Any], observed_at: str) -> dict[str, Any]:
    metadata = kubernetes_object_meta(pod)
    spec = pod.get("spec") if isinstance(pod.get("spec"), dict) else {}
    status = pod.get("status") if isinstance(pod.get("status"), dict) else {}
    namespace, name = kubernetes_namespace_name(pod)
    uid = limit_text(metadata.get("uid") or name, 120)
    containers = spec.get("containers") if isinstance(spec.get("containers"), list) else []
    images = [
        limit_text(container.get("image"), 300)
        for container in containers
        if isinstance(container, dict) and container.get("image")
    ]
    container_statuses = status.get("containerStatuses") if isinstance(status.get("containerStatuses"), list) else []
    raw = {
        "namespace": namespace,
        "uid": uid,
        "nodeName": limit_text(spec.get("nodeName"), 160),
        "podIP": limit_text(status.get("podIP"), 80),
        "hostIP": limit_text(status.get("hostIP"), 80),
        "phase": limit_text(status.get("phase"), 80),
        "labels": trim_dict(metadata.get("labels") or {}),
        "owners": kubernetes_owner_refs(metadata),
        "images": images[:20],
        "containersReady": sum(1 for entry in container_statuses if isinstance(entry, dict) and entry.get("ready")),
        "restartCount": sum(int(entry.get("restartCount") or 0) for entry in container_statuses if isinstance(entry, dict)),
        "startedAt": limit_text(status.get("startTime"), 80),
    }
    raw = {key: value for key, value in raw.items() if value != "" and value != [] and value != {}}
    return {
        "source": "kubernetes",
        "sourceId": f"kubernetes:{namespace}:pod:{uid}",
        "sourceKind": "pod",
        "hostDeviceId": "",
        "name": f"{namespace}/{name}",
        "status": kubernetes_status(status.get("phase")),
        "ports": kubernetes_pod_ports(pod),
        "accessPort": "",
        "serviceUrl": "",
        "lastSeenAt": observed_at,
        "raw": raw,
    }


def kubernetes_service_ports(service: dict[str, Any]) -> tuple[str, str]:
    spec = service.get("spec") if isinstance(service.get("spec"), dict) else {}
    raw_ports = spec.get("ports") if isinstance(spec.get("ports"), list) else []
    ports = []
    node_ports = []
    for port in raw_ports:
        if not isinstance(port, dict):
            continue
        service_port = str(port.get("port") or "").strip()
        if not service_port:
            continue
        protocol = str(port.get("protocol") or "TCP").lower()
        ports.append(f"{service_port}/{protocol}")
        node_port = str(port.get("nodePort") or "").strip()
        if node_port:
            node_ports.append(f"{node_port}/{protocol}")
    return ", ".join(sorted(set(ports))), (node_ports[0] if node_ports else (ports[0] if ports else ""))


def kubernetes_service_item(service: dict[str, Any], observed_at: str) -> dict[str, Any]:
    metadata = kubernetes_object_meta(service)
    spec = service.get("spec") if isinstance(service.get("spec"), dict) else {}
    status = service.get("status") if isinstance(service.get("status"), dict) else {}
    namespace, name = kubernetes_namespace_name(service)
    uid = limit_text(metadata.get("uid") or name, 120)
    ports, access_port = kubernetes_service_ports(service)
    load_balancer = status.get("loadBalancer") if isinstance(status.get("loadBalancer"), dict) else {}
    raw = {
        "namespace": namespace,
        "uid": uid,
        "type": limit_text(spec.get("type"), 80),
        "clusterIP": limit_text(spec.get("clusterIP"), 80),
        "externalIPs": [limit_text(item, 80) for item in spec.get("externalIPs", [])[:20]] if isinstance(spec.get("externalIPs"), list) else [],
        "loadBalancer": load_balancer,
        "selector": trim_dict(spec.get("selector") or {}),
        "labels": trim_dict(metadata.get("labels") or {}),
    }
    raw = {key: value for key, value in raw.items() if value != "" and value != [] and value != {}}
    return {
        "source": "kubernetes",
        "sourceId": f"kubernetes:{namespace}:service:{uid}",
        "sourceKind": "service",
        "hostDeviceId": "",
        "name": f"{namespace}/{name}",
        "status": "running",
        "ports": ports,
        "accessPort": access_port,
        "serviceUrl": "",
        "lastSeenAt": observed_at,
        "raw": raw,
    }


def collect_kubernetes_inventory(config: dict[str, Any], observed_at: str) -> dict[str, Any]:
    version = kubernetes_request(config, "/version")
    pods = kubernetes_list(config, "pods")
    services = kubernetes_list(config, "services")
    items = [
        *(kubernetes_pod_item(pod, observed_at) for pod in pods),
        *(kubernetes_service_item(service, observed_at) for service in services),
    ]
    return {
        "source": "kubernetes",
        "metadata": {
            "kubernetesGitVersion": limit_text(version.get("gitVersion"), 80) if isinstance(version, dict) else "",
            "namespaceScope": "all" if kubernetes_namespaces(config) is None else ",".join(kubernetes_namespaces(config) or []),
            "podCount": len(pods),
            "serviceCount": len(services),
        },
        "items": items,
    }


def proxmox_api_url_from_config(config: dict[str, Any]) -> str:
    api_url = str(config.get("proxmox_api_url") or "").strip().rstrip("/")
    if not api_url:
        raise RuntimeError("proxmox_api_url is required for the Proxmox collector.")
    parsed = urlparse(api_url)
    if parsed.scheme == "https":
        return api_url
    if parsed.scheme == "http" and bool(config.get("proxmox_allow_insecure_http", False)):
        return api_url
    raise RuntimeError("proxmox_api_url must use https unless proxmox_allow_insecure_http=true.")


def proxmox_token_from_config(config: dict[str, Any]) -> str:
    token_id = str(config.get("proxmox_token_id") or "").strip()
    token_secret = str(config.get("proxmox_token_secret") or "").strip()
    if not token_id or not token_secret:
        raise RuntimeError("proxmox_token_id and proxmox_token_secret are required.")
    return f"PVEAPIToken={token_id}={token_secret}"


def proxmox_ssl_context(config: dict[str, Any]) -> ssl.SSLContext | None:
    verify_tls = bool(config.get("proxmox_verify_tls", config.get("verify_tls", True)))
    if not verify_tls:
        return ssl._create_unverified_context()  # noqa: SLF001
    ca_file = str(config.get("proxmox_ca_cert") or "").strip()
    if ca_file:
        return ssl.create_default_context(cafile=ca_file)
    return None


def proxmox_request(config: dict[str, Any], path: str) -> Any:
    api_url = proxmox_api_url_from_config(config)
    endpoint_path = path if path.startswith("/api2/json/") else f"/api2/json{path}"
    endpoint = f"{api_url}{endpoint_path}"
    headers = {
        "Authorization": proxmox_token_from_config(config),
        "Accept": "application/json",
        "User-Agent": f"ATLAS-Agent/{AGENT_VERSION}",
    }
    http_request = request.Request(endpoint, headers=headers, method="GET")
    context = proxmox_ssl_context(config)
    try:
        with request.urlopen(http_request, timeout=int(config.get("proxmox_timeout", config.get("timeout", 20))), context=context) as response:
            body = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Proxmox API returned HTTP {error.code}: {body}") from error
    except URLError as error:
        raise RuntimeError(f"Could not reach Proxmox API: {error}") from error

    payload = json.loads(body or "{}")
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def proxmox_node_filter(config: dict[str, Any]) -> set[str]:
    raw_nodes = config.get("proxmox_nodes")
    if isinstance(raw_nodes, str):
        nodes = [item.strip() for item in raw_nodes.split(",")]
    elif isinstance(raw_nodes, list):
        nodes = [str(item or "").strip() for item in raw_nodes]
    else:
        nodes = []
    return {node for node in nodes if node}


def proxmox_status(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "running":
        return "running"
    if normalized in {"stopped", "paused", "suspended"}:
        return "stopped"
    if normalized in {"error", "failed"}:
        return "offline"
    return "unknown" if normalized else ""


def proxmox_source_kind(raw_type: str) -> str:
    normalized = str(raw_type or "").strip().lower()
    if normalized == "qemu":
        return "vm"
    if normalized == "lxc":
        return "lxc"
    return normalized or "vm"


def normalize_discovered_ip(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    lowered = text.lower()
    if lowered in {"dhcp", "manual", "auto", "none", "static"}:
        return ""
    candidate = text.split("/", 1)[0].strip()
    try:
        ip = ipaddress.ip_address(candidate)
    except ValueError:
        return ""
    if ip.is_loopback or ip.is_link_local or ip.is_multicast:
        return ""
    return str(ip)


def append_unique_ip(values: list[str], value: Any) -> None:
    ip = normalize_discovered_ip(value)
    if ip and ip not in values:
        values.append(ip)


def proxmox_extract_ips_from_config_value(value: Any) -> list[str]:
    text = str(value or "").strip()
    if not text:
        return []
    ips: list[str] = []
    for part in text.split(","):
        if "=" not in part:
            continue
        key, raw_value = part.split("=", 1)
        if key.strip().lower() not in {"ip", "ip6"}:
            continue
        append_unique_ip(ips, raw_value)
    return ips


def proxmox_extract_ips_from_config(config_data: Any) -> list[str]:
    if not isinstance(config_data, dict):
        return []
    ips: list[str] = []
    for key, value in sorted(config_data.items()):
        normalized_key = str(key or "").lower()
        if normalized_key.startswith("net") or normalized_key.startswith("ipconfig"):
            for ip in proxmox_extract_ips_from_config_value(value):
                append_unique_ip(ips, ip)
    return ips


def proxmox_extract_guest_agent_ips(data: Any) -> list[str]:
    if not isinstance(data, dict):
        return []
    interfaces = data.get("result")
    if not isinstance(interfaces, list):
        interfaces = data.get("interfaces")
    if not isinstance(interfaces, list):
        return []
    ips: list[str] = []
    for interface in interfaces:
        if not isinstance(interface, dict):
            continue
        addresses = interface.get("ip-addresses") or interface.get("ipAddresses")
        if not isinstance(addresses, list):
            continue
        for address in addresses:
            if not isinstance(address, dict):
                continue
            append_unique_ip(ips, address.get("ip-address") or address.get("ipAddress"))
    return ips


def proxmox_guest_ips(config: dict[str, Any], node: str, vmid: str, source_kind: str) -> list[str]:
    ips: list[str] = []
    encoded_node = quote(node, safe="")
    encoded_vmid = quote(vmid, safe="")

    if source_kind == "vm":
        try:
            agent_data = proxmox_request(
                config,
                f"/nodes/{encoded_node}/qemu/{encoded_vmid}/agent/network-get-interfaces",
            )
            for ip in proxmox_extract_guest_agent_ips(agent_data):
                append_unique_ip(ips, ip)
        except Exception:
            pass

    try:
        config_type = "qemu" if source_kind == "vm" else "lxc"
        config_data = proxmox_request(config, f"/nodes/{encoded_node}/{config_type}/{encoded_vmid}/config")
        for ip in proxmox_extract_ips_from_config(config_data):
            append_unique_ip(ips, ip)
    except Exception:
        pass

    return ips


def proxmox_item_from_resource(config: dict[str, Any], resource: dict[str, Any], observed_at: str) -> dict[str, Any]:
    node = limit_text(resource.get("node"), 120)
    vmid = limit_text(resource.get("vmid"), 80)
    raw_type = limit_text(resource.get("type"), 80)
    source_kind = proxmox_source_kind(raw_type)
    base_name = limit_text(resource.get("name") or resource.get("id") or f"{source_kind}-{vmid}", 140)
    name = limit_text(f"{base_name}/{vmid}" if vmid and not base_name.endswith(f"/{vmid}") else base_name, 160)
    ips = proxmox_guest_ips(config, node, vmid, source_kind) if node and vmid else []
    raw = {
        "node": node,
        "vmid": vmid,
        "type": source_kind,
        "proxmoxType": raw_type,
        "primaryIp": ips[0] if ips else "",
        "ips": ips,
        "statusText": limit_text(resource.get("status"), 80),
        "template": bool(resource.get("template", False)),
        "tags": limit_text(resource.get("tags"), 300),
        "uptime": resource.get("uptime"),
        "cpu": resource.get("cpu"),
        "cpus": resource.get("maxcpu") or resource.get("cpus"),
        "memory": resource.get("mem"),
        "maxMemory": resource.get("maxmem"),
        "disk": resource.get("disk"),
        "maxDisk": resource.get("maxdisk"),
    }
    raw = {key: value for key, value in raw.items() if value != "" and value != [] and value is not None}
    return {
        "source": "proxmox",
        "sourceId": f"proxmox:{node}:{vmid}",
        "sourceKind": source_kind,
        "hostDeviceId": "",
        "name": name,
        "status": proxmox_status(resource.get("status")),
        "ports": "",
        "accessPort": "",
        "serviceUrl": "",
        "lastSeenAt": observed_at,
        "raw": raw,
    }


def collect_proxmox_inventory(config: dict[str, Any], observed_at: str) -> dict[str, Any]:
    version: dict[str, Any] = {}
    try:
        raw_version = proxmox_request(config, "/version")
        version = raw_version if isinstance(raw_version, dict) else {}
    except Exception as error:  # noqa: BLE001
        version = {"error": limit_text(error, 160)}

    resources = proxmox_request(config, "/cluster/resources?type=vm")
    if not isinstance(resources, list):
        raise RuntimeError("Proxmox API returned unexpected resources payload.")

    allowed_nodes = proxmox_node_filter(config)
    items = []
    for resource in resources:
        if not isinstance(resource, dict):
            continue
        raw_type = str(resource.get("type") or "").strip().lower()
        if raw_type not in {"qemu", "lxc"}:
            continue
        node = str(resource.get("node") or "").strip()
        if allowed_nodes and node not in allowed_nodes:
            continue
        item = proxmox_item_from_resource(config, resource, observed_at)
        if item["sourceId"] != "proxmox::":
            items.append(item)

    return {
        "source": "proxmox",
        "metadata": {
            "proxmoxVersion": limit_text(version.get("version"), 80),
            "nodeScope": ",".join(sorted(allowed_nodes)) if allowed_nodes else "all",
            "vmCount": sum(1 for item in items if item["sourceKind"] == "vm"),
            "lxcCount": sum(1 for item in items if item["sourceKind"] == "lxc"),
        },
        "items": items,
    }


def agent_timing_metadata(config: dict[str, Any]) -> dict[str, int]:
    return {
        "sendIntervalSeconds": normalize_interval(config.get("interval", config.get("interval_seconds", 60))),
        "requestTimeoutSeconds": normalize_request_timeout(config.get("timeout", DEFAULT_REQUEST_TIMEOUT_SECONDS)),
    }


def build_source_payload(source: str, collectors: list[str], observed_at: str, config: dict[str, Any]) -> dict[str, Any]:
    source_name = str(source or "agent").strip() or "agent"
    return {
        "source": source_name,
        "observedAt": observed_at,
        "host": {},
        "metadata": {
            "agentVersion": AGENT_VERSION,
            "collectors": collectors,
            "activeSources": [],
            "collectorErrors": {},
            "agentTiming": agent_timing_metadata(config),
        },
        "items": [],
    }


def finalize_source_payload(payload: dict[str, Any]) -> dict[str, Any]:
    metadata = payload.get("metadata")
    if isinstance(metadata, dict) and not metadata.get("collectorErrors"):
        metadata.pop("collectorErrors", None)
    return payload


def build_source_payloads(config: dict[str, Any], observed_at: str) -> list[dict[str, Any]]:
    collectors = normalize_enabled_collectors(config)
    source_name = str(config.get("source_name") or "agent").strip() or "agent"
    payloads: list[dict[str, Any]] = []

    if "host" in collectors:
        payload = build_source_payload("host", collectors, observed_at, config)
        host_inventory = collect_host_inventory("host", observed_at)
        payload["host"] = host_inventory["host"]
        payload["items"].append(host_inventory["item"])
        payload["metadata"]["activeSources"].append("host")
        payload["metadata"]["sourceName"] = source_name
        payloads.append(finalize_source_payload(payload))

    if "docker" in collectors:
        payload = build_source_payload("docker", collectors, observed_at, config)
        try:
            docker_inventory = collect_docker_inventory(config, observed_at)
            payload["items"].extend(docker_inventory["items"])
            payload["metadata"]["docker"] = docker_inventory["metadata"]
            payload["metadata"]["activeSources"].append("docker")
        except Exception as error:  # noqa: BLE001
            payload["metadata"]["collectorErrors"]["docker"] = limit_text(error, 300)
        payloads.append(finalize_source_payload(payload))

    if "kubernetes" in collectors:
        payload = build_source_payload("kubernetes", collectors, observed_at, config)
        try:
            kubernetes_inventory = collect_kubernetes_inventory(config, observed_at)
            payload["items"].extend(kubernetes_inventory["items"])
            payload["metadata"]["kubernetes"] = kubernetes_inventory["metadata"]
            payload["metadata"]["activeSources"].append("kubernetes")
        except Exception as error:  # noqa: BLE001
            payload["metadata"]["collectorErrors"]["kubernetes"] = limit_text(error, 300)
        payloads.append(finalize_source_payload(payload))

    if "proxmox" in collectors:
        payload = build_source_payload("proxmox", collectors, observed_at, config)
        try:
            proxmox_inventory = collect_proxmox_inventory(config, observed_at)
            payload["items"].extend(proxmox_inventory["items"])
            payload["metadata"]["proxmox"] = proxmox_inventory["metadata"]
            payload["metadata"]["activeSources"].append("proxmox")
        except Exception as error:  # noqa: BLE001
            payload["metadata"]["collectorErrors"]["proxmox"] = limit_text(error, 300)
        payloads.append(finalize_source_payload(payload))

    return payloads or [finalize_source_payload(build_source_payload(source_name, collectors, observed_at, config))]


def build_payload(config: dict[str, Any], observed_at: str) -> dict[str, Any]:
    payloads = build_source_payloads(config, observed_at)
    collectors = normalize_enabled_collectors(config)
    source_name = str(config.get("source_name") or "agent").strip() or "agent"
    payload = build_source_payload(source_name, collectors, observed_at, config)
    for source_payload in payloads:
        if source_payload.get("host"):
            payload["host"] = source_payload["host"]
        payload["items"].extend(source_payload.get("items") or [])
        metadata = source_payload.get("metadata") if isinstance(source_payload.get("metadata"), dict) else {}
        for source in metadata.get("activeSources") or []:
            if source not in payload["metadata"]["activeSources"]:
                payload["metadata"]["activeSources"].append(source)
        for key, value in metadata.items():
            if key in {"agentVersion", "collectors", "activeSources", "agentTiming"}:
                continue
            if key == "collectorErrors" and isinstance(value, dict):
                payload["metadata"]["collectorErrors"].update(value)
            else:
                payload["metadata"][key] = value
    return payload


def build_snapshot_packet(config: dict[str, Any], payload: dict[str, Any], timestamp: str, run_id: str) -> dict[str, Any]:
    packet_info = payload.get("_packet")
    if not isinstance(packet_info, dict):
        packet_info = {
            "source": str(payload.get("source") or "agent"),
            "index": 1,
            "total": 1,
        }
    payload_for_wire = {key: value for key, value in payload.items() if key != "_packet"}
    agent_id = require_text(config, "agent_id")
    token = require_text(config, "agent_token")
    nonce = uuid.uuid4().hex
    signature_payload = {
        "schema": SCHEMA,
        "timestamp": timestamp,
        "nonce": nonce,
        "runId": run_id,
        "packet": packet_info,
        "payload": payload_for_wire,
    }
    return {
        "agentId": agent_id,
        "schema": SCHEMA,
        "schemaKey": hmac_sha256_hex(token, f"schema:{SCHEMA}"),
        "timestamp": timestamp,
        "nonce": nonce,
        "runId": run_id,
        "packet": packet_info,
        "payload": payload_for_wire,
        "signature": hmac_sha256_hex(token, canonical_json(signature_payload)),
    }


def clone_payload_with_items(payload: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
    cloned = {
        "source": payload.get("source") or "agent",
        "observedAt": payload.get("observedAt") or utc_now_iso(),
        "host": payload.get("host") if isinstance(payload.get("host"), dict) else {},
        "metadata": payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {},
        "items": items,
    }
    return cloned


def chunk_source_payload(payload: dict[str, Any], max_items: int) -> list[dict[str, Any]]:
    items = payload.get("items") if isinstance(payload.get("items"), list) else []
    if len(items) <= max_items:
        return [clone_payload_with_items(payload, items)]
    chunks = []
    for start in range(0, len(items), max_items):
        chunk_items = items[start:start + max_items]
        chunk = clone_payload_with_items(payload, chunk_items)
        if start > 0:
            chunk["host"] = {}
        chunks.append(chunk)
    return chunks


def prepare_packet_payloads(config: dict[str, Any], timestamp: str, run_id: str) -> list[dict[str, Any]]:
    max_items = normalize_positive_int(
        config.get("max_items_per_packet"),
        DEFAULT_MAX_ITEMS_PER_PACKET,
        minimum=MIN_MAX_ITEMS_PER_PACKET,
        key="max_items_per_packet",
    )
    max_packet_bytes = normalize_positive_int(
        config.get("max_packet_bytes"),
        DEFAULT_MAX_PACKET_BYTES,
        minimum=MIN_MAX_PACKET_BYTES,
        key="max_packet_bytes",
    )
    max_packets_per_source = normalize_positive_int(
        config.get("max_packets_per_source"),
        DEFAULT_MAX_PACKETS_PER_SOURCE,
        minimum=1,
        key="max_packets_per_source",
    )
    prepared_payloads: list[dict[str, Any]] = []
    for source_payload in build_source_payloads(config, timestamp):
        source_chunks = chunk_source_payload(source_payload, max_items)
        if len(source_chunks) > max_packets_per_source:
            raise RuntimeError(
                f"Discovery source {source_payload.get('source') or 'agent'} would produce "
                f"{len(source_chunks)} packets, above max_packets_per_source={max_packets_per_source}."
            )
        total = len(source_chunks)
        for index, chunk in enumerate(source_chunks, start=1):
            chunk["_packet"] = {
                "source": str(chunk.get("source") or "agent"),
                "index": index,
                "total": total,
            }
            packet = build_snapshot_packet(config, chunk, timestamp, run_id)
            packet_size = len(canonical_json(packet).encode("utf-8"))
            if packet_size > max_packet_bytes:
                raise RuntimeError(
                    f"Discovery packet for source {chunk['_packet']['source']} is {packet_size} bytes, "
                    f"above max_packet_bytes={max_packet_bytes}. Lower max_items_per_packet or data policy."
                )
            prepared_payloads.append(chunk)
    return prepared_payloads


def build_snapshots(config: dict[str, Any]) -> list[dict[str, Any]]:
    timestamp = utc_now_iso()
    run_id = uuid.uuid4().hex
    return [
        build_snapshot_packet(config, payload, timestamp, run_id)
        for payload in prepare_packet_payloads(config, timestamp, run_id)
    ]


def build_snapshot(config: dict[str, Any]) -> dict[str, Any]:
    return build_snapshots(config)[0]


def post_snapshot(config: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]:
    atlas_url = validate_atlas_url(config)
    token = require_text(config, "agent_token")
    endpoint = f"{atlas_url}/api/discovery/snapshot"
    body = canonical_json(snapshot).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": f"ATLAS-Agent/{AGENT_VERSION}",
    }
    http_request = request.Request(endpoint, data=body, headers=headers, method="POST")
    context = None
    if not bool(config.get("verify_tls", True)):
        context = ssl._create_unverified_context()  # noqa: SLF001
    try:
        with request.urlopen(http_request, timeout=normalize_request_timeout(config.get("timeout", DEFAULT_REQUEST_TIMEOUT_SECONDS)), context=context) as response:
            response_body = response.read().decode("utf-8")
    except HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        retry_after = parse_retry_after(error.headers.get("Retry-After") if error.headers else "")
        retry_note = f" Retry-After: {retry_after}s." if retry_after is not None else ""
        raise AgentRequestError(
            f"ATLAS rejected snapshot: HTTP {error.code}:{retry_note} {response_body}",
            retry_after=retry_after,
            status=error.code,
        ) from error
    except URLError as error:
        raise AgentRequestError(f"Could not reach ATLAS: {error}") from error
    return json.loads(response_body or "{}")


def run_once(config: dict[str, Any], *, print_payload: bool) -> None:
    snapshots = build_snapshots(config)
    if print_payload:
        print(json.dumps(snapshots, ensure_ascii=False, indent=2, sort_keys=True))
        return

    responses = [post_snapshot(config, snapshot) for snapshot in snapshots]
    received = sum(int(response.get("received", 0)) for response in responses)
    created = sum(int(response.get("created", 0)) for response in responses)
    stale = sum(int(response.get("stale", 0)) for response in responses)
    run_id = responses[0].get("agentRunId") or snapshots[0].get("runId") if responses else ""
    print(
        "Snapshot accepted: "
        f"{len(responses)} packets, "
        f"{received} received, "
        f"{created} created, "
        f"{stale} stale"
        f"{f', run {run_id}' if run_id else ''}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ATLAS discovery agent MVP")
    parser.add_argument("--config", default=os.environ.get("ATLAS_AGENT_CONFIG", str(DEFAULT_CONFIG_PATH)))
    parser.add_argument("--once", action="store_true", help="Send one snapshot and exit.")
    parser.add_argument("--print-payload", action="store_true", help="Print signed snapshot without sending it.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = read_json_file(Path(args.config))
    if args.print_payload:
        run_once(config, print_payload=True)
        return 0
    interval = normalize_interval(config.get("interval", config.get("interval_seconds", 60)))
    failures = 0
    while True:
        try:
            run_once(config, print_payload=False)
            failures = 0
            next_delay = interval
        except Exception as error:  # noqa: BLE001
            failures += 1
            retry_after = error.retry_after if isinstance(error, AgentRequestError) else None
            next_delay = backoff_delay_seconds(
                config,
                interval=interval,
                failures=failures,
                retry_after=retry_after,
            )
            print(f"ATLAS agent error: {error}", file=sys.stderr)
            if not args.once:
                print(f"ATLAS agent retry in {next_delay}s after {failures} failure(s).", file=sys.stderr)
        if args.once:
            break
        time.sleep(next_delay)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
