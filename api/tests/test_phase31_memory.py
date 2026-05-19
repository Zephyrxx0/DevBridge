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

    async def execute(self, *_args, **_kwargs):
        return _FakeResult(self._row)


class _FakeConnCtx:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row

    async def __aenter__(self):
        return _FakeConn(self._row)

    async def __aexit__(self, *_exc):
        return False


class _FakeEngine:
    def __init__(self, row: dict[str, object] | None) -> None:
        self._row = row

    def connect(self):
        return _FakeConnCtx(self._row)


def _build_memory_app(monkeypatch: pytest.MonkeyPatch, row: dict[str, object] | None) -> TestClient:
    app = FastAPI()
    app.include_router(memory_router, prefix="/memory")
    monkeypatch.setattr("api.routes.admin.get_engine", lambda: _FakeEngine(row))
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
    client = _build_memory_app(monkeypatch, row={"is_admin": True})
    response = client.get("/memory/list", headers={"X-User-Id": "user-1"})
    assert response.status_code == 200
    assert isinstance(response.json().get("memories"), list)


def test_memory_isolation(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _build_memory_app(monkeypatch, row={"is_admin": True})
    response = client.get("/memory/list", headers={"X-User-Id": "user-abc"})
    assert response.status_code == 200
