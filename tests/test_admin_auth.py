from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.admin import get_reports_hub, router, verify_admin


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


def _build_admin_app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, row: dict[str, object] | None) -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/admin")

    hub_dir = tmp_path / "reports"
    hub_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr("api.routes.admin.get_engine", lambda: _FakeEngine(row))
    app.dependency_overrides[get_reports_hub] = lambda: get_reports_hub().__class__(str(hub_dir))
    return TestClient(app)


def test_verify_admin_rejects_non_admin_users(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    repo_id = str(uuid4())
    client = _build_admin_app(tmp_path, monkeypatch, row={"is_admin": False})

    response = client.get(f"/admin/repo/{repo_id}/reports", headers={"X-User-Id": str(uuid4())})
    assert response.status_code == 403


def test_verify_admin_allows_admin_users(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    repo_id = str(uuid4())
    client = _build_admin_app(tmp_path, monkeypatch, row={"is_admin": True})

    response = client.get(f"/admin/repo/{repo_id}/reports", headers={"X-User-Id": str(uuid4())})
    assert response.status_code == 200


def test_repo_reports_endpoint_returns_markdown_files(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    repo_id = str(uuid4())
    client = _build_admin_app(tmp_path, monkeypatch, row={"is_admin": True})
    reports_dir = tmp_path / "reports"
    (reports_dir / f"daily-{repo_id}-2026-05-16.md").write_text("# ok", encoding="utf-8")
    (reports_dir / "daily-other-repo-2026-05-16.md").write_text("# other", encoding="utf-8")

    response = client.get(f"/admin/repo/{repo_id}/reports", headers={"X-User-Id": str(uuid4())})
    assert response.status_code == 200
    payload = response.json()
    filenames = {item["filename"] for item in payload["reports"]}
    assert filenames == {f"daily-{repo_id}-2026-05-16.md"}
