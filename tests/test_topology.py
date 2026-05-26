from __future__ import annotations

import json
import sqlite3
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server  # noqa: E402


ADMIN_USER = {
    "id": "admin",
    "role": server.ROLE_ADMIN,
    "accessGroupIds": [],
}


VIEWER_USER = {
    "id": "viewer",
    "role": server.ROLE_VIEWER,
    "accessGroupIds": [],
}


def connect_memory_db() -> sqlite3.Connection:
    connection = sqlite3.connect(":memory:")
    server.configure_connection(connection)
    connection.executescript(server.SCHEMA)
    server.ensure_migrations(connection)
    return connection


def add_subnet(connection: sqlite3.Connection, **overrides: object) -> dict:
    payload = {
        "id": overrides.pop("id", "subnet-main"),
        "name": overrides.pop("name", "Main LAN"),
        "cidr": overrides.pop("cidr", "10.10.0.0/24"),
        **overrides,
    }
    subnet = server.normalize_subnet_payload(payload)
    server.insert_subnet_without_commit(connection, subnet)
    connection.commit()
    return subnet


def add_device(connection: sqlite3.Connection, **overrides: object) -> dict:
    payload = {
        "id": overrides.pop("id", "device-1"),
        "name": overrides.pop("name", "host-1"),
        "ip": overrides.pop("ip", "10.10.0.10"),
        "type": overrides.pop("type", "server"),
        **overrides,
    }
    device = server.normalize_device_payload(connection, payload)
    server.insert_device_without_commit(connection, device)
    connection.commit()
    return device


def add_agent(connection: sqlite3.Connection, agent_id: str = "agent-1", *, name: str = "Agent") -> None:
    now = server.utc_now_iso()
    connection.execute(
        """
        INSERT INTO discovery_agents (
            id, name, kind, enabled, token_hash, allowed_cidrs, create_mode,
            linked_host_device_id, data_policy, last_seen_at, reported_interval_seconds,
            reported_timeout_seconds, last_error, last_remote_addr, last_rejected_at,
            last_reject_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            agent_id,
            name,
            "host",
            1,
            "token",
            "[]",
            "preview_only",
            "",
            "",
            now,
            60,
            20,
            "",
            "",
            "",
            "",
            now,
            now,
        ),
    )
    connection.commit()


def add_discovery_result(
    connection: sqlite3.Connection,
    *,
    result_id: str,
    agent_id: str = "agent-1",
    source: str,
    source_id: str,
    source_kind: str,
    name: str,
    raw: dict,
    status: str = "running",
    matched_device_id: str = "",
    matched_service_id: str = "",
    state: str = "new",
) -> None:
    now = server.utc_now_iso()
    connection.execute(
        """
        INSERT INTO discovery_results (
            id, agent_id, source, source_id, source_kind, host_device_id,
            name, status, ports, access_port, service_url, last_seen_at,
            matched_device_id, matched_service_id, state, raw,
            received_fields, accepted_fields, visible_fields, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            result_id,
            agent_id,
            source,
            source_id,
            source_kind,
            "",
            name,
            status,
            "",
            "",
            "",
            now,
            matched_device_id,
            matched_service_id,
            state,
            json.dumps(raw, ensure_ascii=False),
            "[]",
            "[]",
            "[]",
            now,
            now,
        ),
    )
    connection.commit()


def node_by_label(topology: dict, label: str) -> dict:
    return next(node for node in topology["nodes"] if node["label"] == label)


class TopologyBuilderTest(unittest.TestCase):
    def test_main_snapshot_excludes_topology_payload(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        add_subnet(connection)

        snapshot = server.load_snapshot(connection, ADMIN_USER)

        self.assertNotIn("topology", snapshot)

    def test_ipam_subnet_host_and_service_relationships(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-1", name="app-host", ip="10.10.0.10", subnetId=subnet["id"])
        service = add_device(
            connection,
            id="service-1",
            name="web",
            ip=host["ip"],
            type="service",
            hostDeviceId=host["id"],
            source="manual",
            sourceKind="service",
            subnetId=subnet["id"],
        )

        topology = server.load_topology_snapshot(connection, ADMIN_USER)
        link_kinds = {link["kind"] for link in topology["links"]}
        self.assertIn("subnet-member", link_kinds)
        self.assertIn("host-service", link_kinds)
        self.assertEqual(node_by_label(topology, "app-host")["kind"], "host")
        self.assertEqual(node_by_label(topology, "web")["kind"], "service")
        self.assertEqual(node_by_label(topology, "web")["serviceId"], service["id"])

    def test_proxmox_hypervisor_guest_relationship(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        hypervisor = add_device(connection, id="pve", name="pve", ip="10.10.0.2", subnetId=subnet["id"])
        vm = add_device(connection, id="vm-101", name="u24", ip="10.10.0.101", subnetId=subnet["id"])
        add_agent(connection, name="Proxmox")
        add_discovery_result(
            connection,
            result_id="result-hypervisor",
            source="proxmox",
            source_id="proxmox:node:pve",
            source_kind="hypervisor",
            name="pve",
            raw={"node": "pve"},
            matched_device_id=hypervisor["id"],
            state="matched",
        )
        add_discovery_result(
            connection,
            result_id="result-vm",
            source="proxmox",
            source_id="proxmox:pve:101",
            source_kind="vm",
            name="u24",
            raw={"node": "pve", "vmid": "101", "ips": ["10.10.0.101"]},
            matched_device_id=vm["id"],
            state="matched",
        )

        topology = server.load_topology_snapshot(connection, ADMIN_USER)
        self.assertEqual(node_by_label(topology, "pve")["kind"], "hypervisor")
        self.assertEqual(node_by_label(topology, "u24")["kind"], "vm")
        self.assertTrue(any(link["kind"] == "hypervisor-guest" for link in topology["links"]))

    def test_host_agent_up_status_wins_over_proxmox_down(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        vm = add_device(connection, id="vm-101", name="u24-d2", ip="10.10.0.101", subnetId=subnet["id"])
        add_agent(connection, "vm-agent", name="u24-d2")
        add_agent(connection, "pve-agent", name="Proxmox")
        connection.execute("UPDATE discovery_agents SET enabled = 0 WHERE id = ?", ("pve-agent",))
        connection.commit()
        add_discovery_result(
            connection,
            result_id="result-vm-agent",
            agent_id="vm-agent",
            source="host",
            source_id="host:u24-d2",
            source_kind="host",
            name="u24-d2",
            status="running",
            raw={"primaryIp": "10.10.0.101"},
            matched_device_id=vm["id"],
            state="matched",
        )
        add_discovery_result(
            connection,
            result_id="result-pve-vm",
            agent_id="pve-agent",
            source="proxmox",
            source_id="proxmox:pve:101",
            source_kind="vm",
            name="u24-d2",
            status="running",
            raw={"node": "pve", "vmid": "101", "ips": ["10.10.0.101"]},
            matched_device_id=vm["id"],
            state="matched",
        )

        topology = server.load_topology_snapshot(connection, ADMIN_USER)

        self.assertEqual(node_by_label(topology, "u24-d2")["status"], "up")

    def test_kubernetes_service_and_pod_kinds_and_selector_link(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        add_subnet(connection)
        add_agent(connection, name="Kubernetes")
        add_discovery_result(
            connection,
            result_id="result-k8s-service",
            source="kubernetes",
            source_id="kubernetes:default:service:web",
            source_kind="service",
            name="default/web",
            raw={"namespace": "default", "selector": {"app": "web"}, "clusterIP": "10.96.0.10"},
        )
        add_discovery_result(
            connection,
            result_id="result-k8s-pod",
            source="kubernetes",
            source_id="kubernetes:default:pod:web-abc",
            source_kind="pod",
            name="default/web-abc",
            raw={"namespace": "default", "labels": {"app": "web"}, "podIP": "10.244.0.15"},
        )

        topology = server.load_topology_snapshot(connection, ADMIN_USER)
        self.assertEqual(node_by_label(topology, "default/web")["kind"], "kubernetes-service")
        self.assertEqual(node_by_label(topology, "default/web-abc")["kind"], "kubernetes-pod")
        self.assertTrue(any(link["kind"] == "kubernetes-service-workload" for link in topology["links"]))

    def test_iot_sensor_is_linked_to_subnet_by_discovered_ip(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        add_agent(connection, name="IoT")
        add_discovery_result(
            connection,
            result_id="result-iot",
            source="iot",
            source_id="iot:sensor:living-room",
            source_kind="sensor",
            name="living-room-sensor",
            raw={"primaryIp": "10.10.0.80", "deviceClass": "sensor"},
        )

        topology = server.load_topology_snapshot(connection, ADMIN_USER)
        sensor = node_by_label(topology, "living-room-sensor")
        self.assertEqual(sensor["kind"], "iot")
        self.assertTrue(any(
            link["kind"] == "subnet-member"
            and link["source"] == f"subnet:{subnet['id']}"
            and link["target"] == sensor["id"]
            for link in topology["links"]
        ))

    def test_viewer_capabilities_and_restricted_subnet_visibility(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        now = server.utc_now_iso()
        connection.execute(
            "INSERT INTO access_groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            ("group-secret", "Secret", "", now, now),
        )
        public_subnet = add_subnet(connection, id="subnet-public", name="Public", cidr="10.10.0.0/24")
        secret_subnet = add_subnet(
            connection,
            id="subnet-secret",
            name="Secret",
            cidr="10.20.0.0/24",
            accessGroupId="group-secret",
        )
        add_device(connection, id="public-host", name="public-host", ip="10.10.0.10", subnetId=public_subnet["id"])
        add_device(connection, id="secret-host", name="secret-host", ip="10.20.0.10", subnetId=secret_subnet["id"])

        admin_topology = server.load_topology_snapshot(connection, ADMIN_USER)
        viewer_topology = server.load_topology_snapshot(connection, VIEWER_USER)

        self.assertTrue(any(node["label"] == "secret-host" for node in admin_topology["nodes"]))
        self.assertFalse(any(node["label"] == "secret-host" for node in viewer_topology["nodes"]))
        self.assertTrue(admin_topology["capabilities"]["layers"]["kubernetes"])
        self.assertFalse(viewer_topology["capabilities"]["layers"]["kubernetes"])
        self.assertFalse(viewer_topology["capabilities"]["layers"]["proxmox"])


if __name__ == "__main__":
    unittest.main()
