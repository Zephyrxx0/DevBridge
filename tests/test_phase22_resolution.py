from __future__ import annotations

import pytest

from api.ingestion.graph_builder import GraphBuilder


class FakeRow:
    def __init__(self, mapping: dict):
        self._mapping = mapping


class FakeResult:
    def __init__(self, rows: list[dict]):
        self._rows = [FakeRow(r) for r in rows]

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None


class FakeConn:
    def __init__(self, code_rows: list[dict], repo_row: dict):
        self.code_rows = code_rows
        self.repo_row = repo_row

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        if "FROM repositories" in sql:
            return FakeResult([self.repo_row])
        if "FROM code_chunks" in sql:
            return FakeResult(self.code_rows)
        raise AssertionError(f"Unexpected SQL: {sql}")


class FakeConnCtx:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeEngine:
    def __init__(self, conn):
        self.conn = conn

    def connect(self):
        return FakeConnCtx(self.conn)


@pytest.mark.asyncio
async def test_build_graph_outputs_file_and_shadow_nodes_only():
    repo_id = "22222222-2222-2222-2222-222222222222"
    rows = [
        {
            "file_path": "api/a.py",
            "content": "from api.b import helper\nimport fastapi\n\ndef call_it():\n    helper()\n",
            "language": "py",
        },
        {
            "file_path": "api/b.py",
            "content": "def helper():\n    return 1\n",
            "language": "py",
        },
    ]
    repo_row = {"id": repo_id, "name": "owner/repo", "github_url": "https://github.com/owner/repo"}
    builder = GraphBuilder(repo_id=repo_id, engine=FakeEngine(FakeConn(rows, repo_row)))

    nodes, edges = await builder.build_graph()

    node_ids = {n["id"] for n in nodes}
    edge_types = {e["type"] for e in edges}

    assert "api/a.py" in node_ids
    assert "api/b.py" in node_ids
    assert "shadow:fastapi" in node_ids
    assert edge_types.issubset({"IMPORTS", "CALLS"})
    assert all(n["type"] in {"file", "shadow"} for n in nodes)
    assert not any(e["type"] == "DEFINES" for e in edges)

    assert {"from": "api/a.py", "to": "api/b.py", "type": "IMPORTS"} in edges
    assert {"from": "api/a.py", "to": "api/b.py", "type": "CALLS"} in edges
    assert {"from": "api/a.py", "to": "shadow:fastapi", "type": "IMPORTS"} in edges


@pytest.mark.asyncio
async def test_unresolvable_symbols_are_dropped():
    repo_id = "33333333-3333-3333-3333-333333333333"
    rows = [
        {
            "file_path": "api/a.py",
            "content": "def call_it():\n    unknown_symbol()\n",
            "language": "py",
        }
    ]
    repo_row = {"id": repo_id, "name": "owner/repo", "github_url": "https://github.com/owner/repo"}
    builder = GraphBuilder(repo_id=repo_id, engine=FakeEngine(FakeConn(rows, repo_row)))

    nodes, edges = await builder.build_graph()

    assert len(nodes) == 1
    assert edges == []
