from __future__ import annotations

import sqlite3
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server  # noqa: E402
from tests.test_topology import ADMIN_USER, add_agent, add_device, add_discovery_result, add_subnet, connect_memory_db  # noqa: E402


def set_agent_host_and_mode(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    host_device_id: str,
    create_mode: str = "auto_create_services",
) -> None:
    connection.execute(
        """
        UPDATE discovery_agents
        SET linked_host_device_id = ?,
            create_mode = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (host_device_id, create_mode, server.utc_now_iso(), agent_id),
    )
    connection.commit()


def save_docker_snapshot(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    source_id: str,
    name: str = "web",
) -> dict:
    agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    assert agent_row is not None
    snapshot = server.normalize_discovery_snapshot_payload({
        "source": "docker",
        "observedAt": server.utc_now_iso(),
        "host": {},
        "metadata": {
            "activeSources": ["docker"],
            "agentTiming": {
                "sendIntervalSeconds": 60,
                "requestTimeoutSeconds": 20,
            },
        },
        "items": [
            {
                "source": "docker",
                "sourceId": source_id,
                "sourceKind": "container",
                "name": name,
                "status": "running",
                "ports": "80/tcp",
                "accessPort": "8080/tcp",
                "serviceUrl": "",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {
                    "containerId": source_id.rsplit(":", 1)[-1],
                    "image": "nginx:latest",
                },
            },
        ],
    })
    return server.save_discovery_snapshot(
        connection,
        server.discovery_agent_from_row(agent_row),
        snapshot,
        "127.0.0.1",
    )


def save_host_and_docker_snapshot(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    hostname: str = "u24-d2",
    ip: str = "10.10.0.24",
) -> dict:
    agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    assert agent_row is not None
    snapshot = server.normalize_discovery_snapshot_payload({
        "source": "agent",
        "observedAt": server.utc_now_iso(),
        "host": {},
        "metadata": {
            "activeSources": ["host", "docker"],
            "agentTiming": {
                "sendIntervalSeconds": 60,
                "requestTimeoutSeconds": 20,
            },
        },
        "items": [
            {
                "source": "host",
                "sourceId": "host:u24-d2",
                "sourceKind": "host",
                "name": hostname,
                "status": "running",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {
                    "hostname": hostname,
                    "primaryIp": ip,
                    "mac": "AA:BB:CC:DD:EE:24",
                },
            },
            {
                "source": "docker",
                "sourceId": "docker:name:nginx",
                "sourceKind": "container",
                "name": "nginx",
                "status": "running",
                "ports": "80/tcp",
                "accessPort": "8080/tcp",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {"containerId": "nginx1", "image": "nginx:latest"},
            },
            {
                "source": "docker",
                "sourceId": "docker:name:redis",
                "sourceKind": "container",
                "name": "redis",
                "status": "running",
                "ports": "6379/tcp",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {"containerId": "redis1", "image": "redis:latest"},
            },
        ],
    })
    return server.save_discovery_snapshot(
        connection,
        server.discovery_agent_from_row(agent_row),
        snapshot,
        "127.0.0.1",
    )


def save_split_host_and_docker_snapshots(
    connection: sqlite3.Connection,
    *,
    agent_id: str,
    hostname: str = "u24-d2",
    ip: str = "10.10.0.24",
) -> None:
    agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    assert agent_row is not None
    host_snapshot = server.normalize_discovery_snapshot_payload({
        "source": "host",
        "observedAt": server.utc_now_iso(),
        "host": {},
        "metadata": {
            "activeSources": ["host"],
            "agentTiming": {
                "sendIntervalSeconds": 60,
                "requestTimeoutSeconds": 20,
            },
        },
        "items": [
            {
                "source": "host",
                "sourceId": "host:u24-d2",
                "sourceKind": "host",
                "name": hostname,
                "status": "running",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {
                    "hostname": hostname,
                    "primaryIp": ip,
                    "mac": "AA:BB:CC:DD:EE:24",
                },
            },
        ],
    })
    server.save_discovery_snapshot(
        connection,
        server.discovery_agent_from_row(agent_row),
        host_snapshot,
        "127.0.0.1",
    )

    agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = ?", (agent_id,)).fetchone()
    assert agent_row is not None
    docker_snapshot = server.normalize_discovery_snapshot_payload({
        "source": "docker",
        "observedAt": server.utc_now_iso(),
        "host": {},
        "metadata": {
            "activeSources": ["docker"],
            "agentTiming": {
                "sendIntervalSeconds": 60,
                "requestTimeoutSeconds": 20,
            },
        },
        "items": [
            {
                "source": "docker",
                "sourceId": "docker:name:nginx",
                "sourceKind": "container",
                "name": "nginx",
                "status": "running",
                "ports": "80/tcp",
                "accessPort": "8080/tcp",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {"containerId": "nginx1", "image": "nginx:latest"},
            },
            {
                "source": "docker",
                "sourceId": "docker:name:redis",
                "sourceKind": "container",
                "name": "redis",
                "status": "running",
                "ports": "6379/tcp",
                "lastSeenAt": server.utc_now_iso(),
                "raw": {"containerId": "redis1", "image": "redis:latest"},
            },
        ],
    })
    server.save_discovery_snapshot(
        connection,
        server.discovery_agent_from_row(agent_row),
        docker_snapshot,
        "127.0.0.1",
    )


class DiscoveryIntegrityTest(unittest.TestCase):
    def test_agent_tokens_are_only_returned_on_create_or_rotate(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)

        created = server.create_discovery_agent(
            connection,
            {"name": "secure-agent", "kind": "host", "enabled": True},
            actor="test",
        )
        snapshot = server.load_snapshot(connection, ADMIN_USER)
        listed_agent = next(
            agent
            for agent in snapshot["admin"]["discoveryAgents"]
            if agent["id"] == created["agent"]["id"]
        )

        self.assertTrue(str(created["token"]).startswith("atlas_agent_"))
        self.assertNotIn("token", created["agent"])
        self.assertNotIn("tokenHash", created["agent"])
        self.assertNotIn("token_hash", created["agent"])
        self.assertNotIn("token", listed_agent)
        self.assertNotIn("tokenHash", listed_agent)
        self.assertNotIn("token_hash", listed_agent)

        rotated = server.rotate_discovery_agent_token(connection, created["agent"]["id"], actor="test")
        rotated_agent = rotated["agent"]

        self.assertTrue(str(rotated["token"]).startswith("atlas_agent_"))
        self.assertNotEqual(rotated["token"], created["token"])
        self.assertNotIn("token", rotated_agent)
        self.assertNotIn("tokenHash", rotated_agent)
        self.assertNotIn("token_hash", rotated_agent)

    def test_first_host_snapshot_attaches_docker_services_to_created_host(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        add_agent(connection)
        connection.execute(
            "UPDATE discovery_agents SET create_mode = ? WHERE id = ?",
            ("auto_create_devices_and_services", "agent-1"),
        )
        connection.commit()

        save_host_and_docker_snapshot(connection, agent_id="agent-1")

        host_row = connection.execute("SELECT * FROM devices WHERE type != 'service' AND name = 'u24-d2'").fetchone()
        self.assertIsNotNone(host_row)
        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' ORDER BY name ASC"
        ).fetchall()
        service_history_rows = connection.execute(
            """
            SELECT *
            FROM ip_history
            WHERE actor LIKE 'Agent:%'
              AND device_name IN ('nginx', 'redis')
            """
        ).fetchall()

        self.assertEqual(host_row["subnet_id"], subnet["id"])
        self.assertEqual([row["name"] for row in services], ["nginx", "redis"])
        self.assertTrue(all(row["host_device_id"] == host_row["id"] for row in services))
        self.assertEqual(len(service_history_rows), 0)

    def test_split_host_and_docker_packets_auto_create_host_and_services(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        add_agent(connection, name="u24-d2")
        connection.execute(
            "UPDATE discovery_agents SET create_mode = ? WHERE id = ?",
            ("auto_create_devices_and_services", "agent-1"),
        )
        connection.commit()

        save_split_host_and_docker_snapshots(connection, agent_id="agent-1")

        host_row = connection.execute("SELECT * FROM devices WHERE type != 'service' AND name = 'u24-d2'").fetchone()
        agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = 'agent-1'").fetchone()
        services = connection.execute("SELECT * FROM devices WHERE type = 'service' ORDER BY name ASC").fetchall()
        docker_results = connection.execute(
            "SELECT * FROM discovery_results WHERE source = 'docker' ORDER BY name ASC"
        ).fetchall()

        self.assertIsNotNone(host_row)
        self.assertEqual(host_row["subnet_id"], subnet["id"])
        self.assertEqual(agent_row["linked_host_device_id"], host_row["id"])
        self.assertEqual([row["name"] for row in services], ["nginx", "redis"])
        self.assertTrue(all(row["host_device_id"] == host_row["id"] for row in services))
        self.assertTrue(all(row["host_device_id"] == host_row["id"] for row in docker_results))

    def test_auto_create_services_uses_existing_matched_host_as_parent(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-u24-d2", name="u24-d2", ip="10.10.0.24", subnetId=subnet["id"])
        add_agent(connection, name="u24-d2")
        connection.execute(
            "UPDATE discovery_agents SET create_mode = ? WHERE id = ?",
            ("auto_create_services", "agent-1"),
        )
        connection.commit()

        save_host_and_docker_snapshot(connection, agent_id="agent-1")

        agent_row = connection.execute("SELECT * FROM discovery_agents WHERE id = 'agent-1'").fetchone()
        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' ORDER BY name ASC"
        ).fetchall()
        docker_results = connection.execute(
            "SELECT * FROM discovery_results WHERE source = 'docker' ORDER BY name ASC"
        ).fetchall()

        self.assertEqual(agent_row["linked_host_device_id"], host["id"])
        self.assertEqual([row["name"] for row in services], ["nginx", "redis"])
        self.assertTrue(all(row["host_device_id"] == host["id"] for row in services))
        self.assertTrue(all(row["host_device_id"] == host["id"] for row in docker_results))

    def test_state_load_repairs_unbound_docker_results_from_matched_host(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-u24-d2", name="u24-d2", ip="10.10.0.24", subnetId=subnet["id"])
        add_agent(connection, name="u24-d2")
        add_discovery_result(
            connection,
            result_id="result-host",
            source="host",
            source_id="host:u24-d2",
            source_kind="host",
            name="u24-d2",
            raw={"primaryIp": "10.10.0.24"},
            matched_device_id=host["id"],
            state="matched",
        )
        add_discovery_result(
            connection,
            result_id="result-docker",
            source="docker",
            source_id="docker:name:nginx",
            source_kind="container",
            name="nginx",
            raw={"containerId": "nginx1", "image": "nginx:latest"},
        )

        snapshot = server.load_snapshot(connection, ADMIN_USER)

        docker_row = connection.execute("SELECT * FROM discovery_results WHERE id = 'result-docker'").fetchone()
        docker_result = next(
            result
            for result in snapshot["admin"]["discoveryResults"]
            if result["id"] == "result-docker"
        )

        self.assertEqual(docker_row["host_device_id"], host["id"])
        self.assertEqual(docker_result["hostDeviceId"], host["id"])
        self.assertEqual(docker_result["hostName"], "u24-d2")

    def test_docker_container_update_reuses_service_by_host_and_name(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-1", name="docker-host", ip="10.10.0.10", subnetId=subnet["id"])
        service = add_device(
            connection,
            id="service-web-old",
            name="web",
            ip=host["ip"],
            type="service",
            hostDeviceId=host["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:id:old",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection)
        set_agent_host_and_mode(connection, agent_id="agent-1", host_device_id=host["id"])

        save_docker_snapshot(connection, agent_id="agent-1", source_id="docker:id:new")

        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' AND host_device_id = ? AND lower(name) = 'web'",
            (host["id"],),
        ).fetchall()
        result = connection.execute(
            "SELECT * FROM discovery_results WHERE agent_id = 'agent-1' AND source_id = 'docker:id:new'"
        ).fetchone()

        self.assertEqual(len(services), 1)
        self.assertEqual(services[0]["id"], service["id"])
        self.assertEqual(services[0]["source_id"], "docker:id:new")
        self.assertIsNotNone(result)
        self.assertEqual(result["matched_service_id"], service["id"])

    def test_same_docker_service_name_is_kept_per_host(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host_1 = add_device(connection, id="host-1", name="u24-d1", ip="10.10.0.11", subnetId=subnet["id"])
        host_2 = add_device(connection, id="host-2", name="u24-d2", ip="10.10.0.12", subnetId=subnet["id"])
        add_agent(connection, "agent-1", name="u24-d1")
        add_agent(connection, "agent-2", name="u24-d2")
        set_agent_host_and_mode(connection, agent_id="agent-1", host_device_id=host_1["id"])
        set_agent_host_and_mode(connection, agent_id="agent-2", host_device_id=host_2["id"])

        save_docker_snapshot(connection, agent_id="agent-1", source_id="docker:name:portainer", name="portainer")
        save_docker_snapshot(connection, agent_id="agent-2", source_id="docker:name:portainer", name="portainer")

        services = connection.execute(
            """
            SELECT *
            FROM devices
            WHERE type = 'service'
              AND lower(name) = 'portainer'
            ORDER BY host_device_id ASC
            """
        ).fetchall()
        service_hosts = {row["host_device_id"] for row in services}

        self.assertEqual(len(services), 2)
        self.assertEqual(service_hosts, {host_1["id"], host_2["id"]})

    def test_mismatched_docker_service_match_is_repaired_per_host(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host_1 = add_device(connection, id="host-1", name="u24-d1", ip="10.10.0.11", subnetId=subnet["id"])
        host_2 = add_device(connection, id="host-2", name="u24-d2", ip="10.10.0.12", subnetId=subnet["id"])
        service_1 = add_device(
            connection,
            id="service-portainer-host-1",
            name="portainer",
            ip=host_1["ip"],
            type="service",
            hostDeviceId=host_1["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:name:portainer",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection, "agent-2", name="u24-d2")
        set_agent_host_and_mode(connection, agent_id="agent-2", host_device_id=host_2["id"])
        add_discovery_result(
            connection,
            result_id="result-portainer-host-2",
            agent_id="agent-2",
            source="docker",
            source_id="docker:name:portainer",
            source_kind="container",
            name="portainer",
            raw={"containerId": "portainer2"},
            matched_service_id=service_1["id"],
            state="matched",
        )

        save_docker_snapshot(connection, agent_id="agent-2", source_id="docker:name:portainer", name="portainer")

        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' AND lower(name) = 'portainer'"
        ).fetchall()
        repaired_result = connection.execute(
            "SELECT * FROM discovery_results WHERE id = 'result-portainer-host-2'"
        ).fetchone()

        self.assertEqual(len(services), 2)
        self.assertNotEqual(repaired_result["matched_service_id"], service_1["id"])
        self.assertIn(repaired_result["matched_service_id"], {row["id"] for row in services})
        self.assertEqual(
            next(row for row in services if row["id"] == repaired_result["matched_service_id"])["host_device_id"],
            host_2["id"],
        )

    def test_docker_auto_replace_does_not_steal_same_name_from_other_host(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host_1 = add_device(connection, id="host-1", name="u24-d1", ip="10.10.0.11", subnetId=subnet["id"])
        host_2 = add_device(connection, id="host-2", name="u24-d2", ip="10.10.0.12", subnetId=subnet["id"])
        service_1 = add_device(
            connection,
            id="service-portainer-host-1",
            name="portainer",
            ip=host_1["ip"],
            type="service",
            hostDeviceId=host_1["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:id:old-host-1",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection, "agent-1", name="docker-agent")
        set_agent_host_and_mode(connection, agent_id="agent-1", host_device_id=host_2["id"])
        add_discovery_result(
            connection,
            result_id="result-portainer-host-1",
            agent_id="agent-1",
            source="docker",
            source_id="docker:id:old-host-1",
            source_kind="container",
            name="portainer",
            raw={"containerId": "old-host-1"},
            matched_service_id=service_1["id"],
            state="matched",
        )

        save_docker_snapshot(connection, agent_id="agent-1", source_id="docker:id:new-host-2", name="portainer")

        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' AND lower(name) = 'portainer'"
        ).fetchall()
        old_result = connection.execute("SELECT * FROM discovery_results WHERE id = 'result-portainer-host-1'").fetchone()
        new_result = connection.execute(
            "SELECT * FROM discovery_results WHERE source_id = 'docker:id:new-host-2'"
        ).fetchone()

        self.assertEqual(len(services), 2)
        self.assertIsNotNone(old_result)
        self.assertEqual(old_result["matched_service_id"], service_1["id"])
        self.assertNotEqual(new_result["matched_service_id"], service_1["id"])
        self.assertEqual(
            next(row for row in services if row["id"] == new_result["matched_service_id"])["host_device_id"],
            host_2["id"],
        )

    def test_docker_container_auto_replace_can_be_disabled(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-1", name="docker-host", ip="10.10.0.10", subnetId=subnet["id"])
        add_device(
            connection,
            id="service-web-old",
            name="web",
            ip=host["ip"],
            type="service",
            hostDeviceId=host["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:id:old",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection)
        set_agent_host_and_mode(connection, agent_id="agent-1", host_device_id=host["id"])
        server.update_settings(
            connection,
            {"discoveryReplacementPolicy": {"autoReplaceDockerContainers": False}},
            actor="test",
        )

        save_docker_snapshot(connection, agent_id="agent-1", source_id="docker:id:new")

        services = connection.execute(
            "SELECT * FROM devices WHERE type = 'service' AND host_device_id = ? AND lower(name) = 'web'",
            (host["id"],),
        ).fetchall()
        source_ids = {row["source_id"] for row in services}

        self.assertEqual(len(services), 2)
        self.assertEqual(source_ids, {"docker:id:old", "docker:id:new"})

    def test_docker_container_update_removes_superseded_duplicate_service(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        host = add_device(connection, id="host-1", name="docker-host", ip="10.10.0.10", subnetId=subnet["id"])
        old_service = add_device(
            connection,
            id="service-web-old",
            name="web",
            ip=host["ip"],
            type="service",
            hostDeviceId=host["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:id:old",
            note="Agent",
            subnetId=subnet["id"],
        )
        new_service = add_device(
            connection,
            id="service-web-new",
            name="web",
            ip=host["ip"],
            type="service",
            hostDeviceId=host["id"],
            source="docker",
            sourceKind="container",
            sourceId="docker:id:new",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection)
        set_agent_host_and_mode(connection, agent_id="agent-1", host_device_id=host["id"])
        add_discovery_result(
            connection,
            result_id="result-old",
            source="docker",
            source_id="docker:id:old",
            source_kind="container",
            name="web",
            raw={"containerId": "old"},
            matched_service_id=old_service["id"],
            state="matched",
        )
        add_discovery_result(
            connection,
            result_id="result-new",
            source="docker",
            source_id="docker:id:new",
            source_kind="container",
            name="web",
            raw={"containerId": "new"},
            matched_service_id=new_service["id"],
            state="matched",
        )

        save_docker_snapshot(connection, agent_id="agent-1", source_id="docker:id:new")

        service_ids = {
            row["id"]
            for row in connection.execute(
                "SELECT id FROM devices WHERE type = 'service' AND host_device_id = ? AND lower(name) = 'web'",
                (host["id"],),
            )
        }
        old_result = connection.execute("SELECT id FROM discovery_results WHERE id = 'result-old'").fetchone()

        self.assertEqual(service_ids, {new_service["id"]})
        self.assertIsNone(old_result)

    def test_deleting_agent_protects_records_still_referenced_by_proxmox(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        vm = add_device(
            connection,
            id="vm-host",
            name="u24",
            ip="10.10.0.101",
            source="host",
            sourceKind="host",
            sourceId="host:vm",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection, "vm-agent", name="VM Agent")
        add_agent(connection, "pve-agent", name="Proxmox")
        add_discovery_result(
            connection,
            result_id="result-vm-agent",
            agent_id="vm-agent",
            source="host",
            source_id="host:vm",
            source_kind="host",
            name="u24",
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
            name="u24",
            raw={"node": "pve", "vmid": "101", "ips": ["10.10.0.101"]},
            matched_device_id=vm["id"],
            state="matched",
        )

        result = server.delete_discovery_agent(
            connection,
            "vm-agent",
            actor="test",
            delete_related_records=True,
        )

        vm_row = connection.execute("SELECT * FROM devices WHERE id = ?", (vm["id"],)).fetchone()
        pve_result = connection.execute("SELECT * FROM discovery_results WHERE id = 'result-pve-vm'").fetchone()

        self.assertEqual(result["deletedRelatedRecords"], 0)
        self.assertEqual(result["protectedRelatedRecords"], 1)
        self.assertIsNotNone(vm_row)
        self.assertIsNotNone(pve_result)

    def test_orphaned_proxmox_vm_match_is_recreated_on_state_load(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        subnet = add_subnet(connection)
        vm = add_device(
            connection,
            id="vm-host",
            name="u24-d2",
            ip="10.10.0.24",
            source="host",
            sourceKind="host",
            sourceId="host:u24-d2",
            note="Agent",
            subnetId=subnet["id"],
        )
        add_agent(connection, "pve-agent", name="Proxmox")
        add_discovery_result(
            connection,
            result_id="result-pve-vm",
            agent_id="pve-agent",
            source="proxmox",
            source_id="proxmox:pve:102",
            source_kind="vm",
            name="u24-d2",
            raw={
                "node": "pve",
                "vmid": "102",
                "primaryIp": "10.10.0.24",
                "ips": ["10.10.0.24"],
                "mac": "AA:BB:CC:DD:EE:24",
                "os": "Ubuntu",
            },
            matched_device_id=vm["id"],
            state="matched",
        )
        connection.execute("DELETE FROM devices WHERE id = ?", (vm["id"],))
        connection.commit()

        server.load_snapshot(connection, ADMIN_USER)

        recreated = connection.execute(
            "SELECT * FROM devices WHERE source = 'proxmox' AND source_id = 'proxmox:pve:102'"
        ).fetchone()
        result = connection.execute("SELECT * FROM discovery_results WHERE id = 'result-pve-vm'").fetchone()
        audit = connection.execute(
            "SELECT * FROM discovery_audit_events WHERE event_type = 'discovery_orphan_recovered'"
        ).fetchone()

        self.assertIsNotNone(recreated)
        self.assertEqual(recreated["name"], "u24-d2")
        self.assertEqual(recreated["ip"], "10.10.0.24")
        self.assertEqual(recreated["type"], "server")
        self.assertEqual(result["matched_device_id"], recreated["id"])
        self.assertIsNotNone(audit)

    def test_stale_cleanup_removes_audit_events_for_deleted_results(self) -> None:
        connection = connect_memory_db()
        self.addCleanup(connection.close)
        add_agent(connection, "agent-1", name="u24-d1")
        add_agent(connection, "agent-2", name="u24-d2")
        add_discovery_result(
            connection,
            result_id="stale-result",
            agent_id="agent-1",
            source="docker",
            source_id="docker:host:one:name:portainer",
            source_kind="container",
            name="portainer",
            raw={"containerId": "old"},
            state="stale",
        )
        server.record_discovery_audit_event(
            connection,
            "discovery_duplicate_replaced",
            agent_id="agent-1",
            agent_name="u24-d1",
            details={
                "resultId": "stale-result",
                "source": "docker",
                "sourceId": "docker:host:one:name:portainer",
            },
        )
        server.record_discovery_audit_event(
            connection,
            "discovery_result_deleted",
            agent_id="agent-1",
            agent_name="u24-d1",
            details={"source": "docker", "sourceId": "docker:host:one:name:portainer"},
        )
        server.record_discovery_audit_event(
            connection,
            "discovery_duplicate_replaced",
            agent_id="agent-2",
            agent_name="u24-d2",
            details={"source": "docker", "sourceId": "docker:host:one:name:portainer"},
        )
        connection.commit()

        result = server.cleanup_stale_discovery_results(connection, actor="test")
        remaining_events = connection.execute(
            "SELECT event_type, agent_id FROM discovery_audit_events ORDER BY id ASC"
        ).fetchall()

        self.assertEqual(result["deletedResults"], 1)
        self.assertEqual(result["deletedAuditEvents"], 2)
        self.assertEqual([row["event_type"] for row in remaining_events], [
            "discovery_duplicate_replaced",
            "discovery_stale_cleanup",
        ])
        self.assertEqual(remaining_events[0]["agent_id"], "agent-2")


if __name__ == "__main__":
    unittest.main()
