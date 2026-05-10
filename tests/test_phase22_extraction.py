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
async def test_discover_symbols_maps_python_and_typescript_exports():
    repo_id = "11111111-1111-1111-1111-111111111111"
    rows = [
        {
            "file_path": "backend/service.py",
            "content": "class Service:\n    pass\n\ndef do_work():\n    return 1\n",
            "language": "py",
        },
        {
            "file_path": "frontend/actions.ts",
            "content": "export function runTask() { return true }\nexport class Client {}\n",
            "language": "ts",
        },
    ]
    repo_row = {"id": repo_id, "name": "owner/repo", "github_url": "https://github.com/owner/repo"}
    builder = GraphBuilder(repo_id=repo_id, engine=FakeEngine(FakeConn(rows, repo_row)))

    symbol_map = await builder.discover_symbols()

    assert symbol_map["Service"] == "backend/service.py"
    assert symbol_map["do_work"] == "backend/service.py"
    assert symbol_map["runTask"] == "frontend/actions.ts"
    assert symbol_map["Client"] == "frontend/actions.ts"
