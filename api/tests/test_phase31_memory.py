from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from api.routes.memory import router as memory_router


class _FakeResult:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row

    def fetchone(self):
        if self._row is None:
            return None
        return SimpleNamespace(_mapping=self._row)


class _FakeConn:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row
        self.executed: list[tuple[object, dict[str, object]]] = []
        self.committed = False

    async def execute(self, *args, **kwargs):
        if len(args) >= 2 and isinstance(args[1], dict):
            self.executed.append((args[0], args[1]))
        return _FakeResult(self._row)

    async def commit(self):
        self.committed = True


class _FakeConnCtx:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row
        self.conn = _FakeConn(row)

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *_exc):
        return False


class _FakeEngine:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row
        self.last_conn_ctx: _FakeConnCtx | None = None

    def connect(self):
        self.last_conn_ctx = _FakeConnCtx(self._row)
        return self.last_conn_ctx


class _FakeMemoriesAPI:
    def __init__(self, rows: list[dict[str, object]], tracker: dict[str, object]) -> None:
        self._rows = rows
        self._tracker = tracker

    def list(self, *, bank_id: str, limit: int):
        self._tracker["bank_id"] = bank_id
        self._tracker["limit"] = limit
        return self._rows


class _FakeHindsightClient:
    def __init__(self, rows: list[dict[str, object]], tracker: dict[str, object]) -> None:
        self.memories = _FakeMemoriesAPI(rows, tracker)

    async def delete_document(self, *, bank_id: str, document_id: str):
        return None


def _build_memory_app(
    monkeypatch: pytest.MonkeyPatch,
    row: dict[str, object] | None,
    memories: list[dict[str, object]] | None = None,
    tracker: dict[str, object] | None = None,
) -> TestClient:
    app = FastAPI()
    app.include_router(memory_router, prefix="/memory")
    fake_engine = _FakeEngine(row)
    monkeypatch.setattr("api.routes.admin.get_engine", lambda: fake_engine)
    monkeypatch.setattr("api.routes.memory.get_engine", lambda: fake_engine)
    tracker_ref = tracker if tracker is not None else {}
    memories_ref = memories if memories is not None else []
    monkeypatch.setattr(
        "api.routes.memory.hindsight_db._client",
        _FakeHindsightClient(memories_ref, tracker_ref),
    )
    if tracker is not None:
        tracker["engine"] = fake_engine
    return TestClient(app)


def test_list_memories_unauthorized(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _build_memory_app(monkeypatch, row={"is_admin": True})
    response = client.get("/memory/list")
    assert response.status_code == 401


def test_list_memories_forbidden(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _build_memory_app(monkeypatch, row={"is_admin": False})
    response = client.get("/memory/list", headers={"X-User-Id": "user-1"})
    assert response.status_code == 403


def test_list_memories_success(monkeypatch: pytest.MonkeyPatch) -> None:
    tracker: dict[str, object] = {}
    client = _build_memory_app(
        monkeypatch,
        row={"is_admin": True},
        memories=[{"id": "m1", "text": "hello"}],
        tracker=tracker,
    )
    response = client.get("/memory/list", headers={"X-User-Id": "user-1"})
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("memories") == [{"id": "m1", "text": "hello"}]
    assert tracker["limit"] == 100


def test_memory_isolation(monkeypatch: pytest.MonkeyPatch) -> None:
    tracker: dict[str, object] = {}
    client = _build_memory_app(monkeypatch, row={"is_admin": True}, memories=[], tracker=tracker)
    response = client.get("/memory/list", headers={"X-User-Id": "user-abc"})
    assert response.status_code == 200
    assert tracker["bank_id"] == "user-abc"


def test_memory_update_persists_with_bank_isolation(monkeypatch: pytest.MonkeyPatch) -> None:
    tracker: dict[str, object] = {}
    client = _build_memory_app(monkeypatch, row={"is_admin": True}, memories=[], tracker=tracker)
    response = client.put(
        "/memory/m-123",
        headers={"X-User-Id": "user-edit"},
        json={"text": "updated body"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "updated"}

    engine = tracker.get("engine")
    assert isinstance(engine, _FakeEngine)
    assert engine.last_conn_ctx is not None
    executed = engine.last_conn_ctx.conn.executed
    assert len(executed) == 1
    _, params = executed[0]
    assert params["text"] == "updated body"
    assert params["id"] == "m-123"
    assert params["bank_id"] == "user-edit"
    assert engine.last_conn_ctx.conn.committed is True
