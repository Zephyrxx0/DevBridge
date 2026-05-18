from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from api.db.graph_store import GraphStoreManager


class FakeRow:
    def __init__(self, mapping: dict):
        self._mapping = mapping


class FakeResult:
    def __init__(self, rows: list[dict]):
        self._rows = [FakeRow(r) for r in rows]

    def fetchone(self):
        return self._rows[0] if self._rows else None


class FakeConnection:
    def __init__(self):
        self.graphs: dict[str, dict] = {}

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        params = params or {}

        if "INSERT INTO repo_graph" in sql:
            repo_id = params["repo_id"]
            self.graphs[repo_id] = {
                "repo_id": UUID(repo_id),
                "nodes": json.loads(params["nodes"]),
                "edges": json.loads(params["edges"]),
                "updated_at": datetime.now(timezone.utc),
            }
            return FakeResult([])

        if "SELECT repo_id, nodes, edges, updated_at" in sql:
            row = self.graphs.get(params["repo_id"])
            return FakeResult([row] if row else [])

        raise AssertionError(f"Unexpected SQL in fake DB: {sql}")

    async def commit(self):
        return None


class FakeEngineContext:
    def __init__(self, conn: FakeConnection):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeEngine:
    def __init__(self, conn: FakeConnection):
        self.conn = conn

    def connect(self):
        return FakeEngineContext(self.conn)


@pytest.mark.asyncio
async def test_save_graph_creates_record(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr("api.db.graph_store.get_engine", lambda: FakeEngine(conn))

    manager = GraphStoreManager()
    repo_id = uuid4()
    nodes = [{"id": "a.py", "kind": "file"}]
    edges = [{"from": "a.py", "to": "b.py", "type": "IMPORTS"}]

    await manager.save_graph(repo_id, nodes, edges)

    stored = conn.graphs[str(repo_id)]
    assert stored["nodes"] == nodes
    assert stored["edges"] == edges


@pytest.mark.asyncio
async def test_save_graph_overwrites_existing_record(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr("api.db.graph_store.get_engine", lambda: FakeEngine(conn))

    manager = GraphStoreManager()
    repo_id = uuid4()

    await manager.save_graph(repo_id, [{"id": "v1"}], [{"from": "v1", "to": "x"}])
    await manager.save_graph(repo_id, [{"id": "v2"}], [{"from": "v2", "to": "y"}])

    stored = conn.graphs[str(repo_id)]
    assert stored["nodes"] == [{"id": "v2"}]
    assert stored["edges"] == [{"from": "v2", "to": "y"}]


@pytest.mark.asyncio
async def test_get_graph_retrieves_nodes_and_edges(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr("api.db.graph_store.get_engine", lambda: FakeEngine(conn))

    manager = GraphStoreManager()
    repo_id = uuid4()
    nodes = [{"id": "node-1", "path": "api/main.py"}]
    edges = [{"from": "node-1", "to": "node-2", "type": "CALLS"}]
    await manager.save_graph(repo_id, nodes, edges)

    graph = await manager.get_graph(repo_id)

    assert graph is not None
    assert graph.repo_id == repo_id
    assert graph.nodes == nodes
    assert graph.edges == edges
