from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from api.core.config import Settings
from api.core.scheduler import SchedulerManager
from api.db.session import normalize_sync_url
from api.jobs import base as jobs_base


def test_normalize_sync_url_for_jobstore() -> None:
    raw = "postgresql+asyncpg://postgres:abc%40123@db.example.supabase.co:5432/postgres?sslmode=require"
    out = normalize_sync_url(raw)
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode=require" not in out


@pytest.mark.asyncio
async def test_distributed_lock_concurrency(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeConn:
        def __init__(self, locked: bool) -> None:
            self.locked = locked

        async def scalar(self, *_args, **_kwargs):
            return self.locked

    class FakeTxn:
        def __init__(self, locked: bool) -> None:
            self.conn = FakeConn(locked)

        async def __aenter__(self):
            return self.conn

        async def __aexit__(self, *_exc):
            return False

    class FakeEngine:
        def __init__(self, locked: bool) -> None:
            self.locked = locked

        def begin(self):
            return FakeTxn(self.locked)

    calls = {"count": 0}

    @jobs_base.with_distributed_lock("sync_issues")
    async def guarded() -> str:
        calls["count"] += 1
        return "ok"

    monkeypatch.setattr(jobs_base, "get_engine", lambda: FakeEngine(True))
    assert await guarded() == "ok"
    assert calls["count"] == 1

    monkeypatch.setattr(jobs_base, "get_engine", lambda: FakeEngine(False))
    assert await guarded() is None
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_job_retry_logic(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = {"count": 0}

    async def fake_sleep(_seconds: float) -> None:
        return None

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    @jobs_base.with_retry(max_retries=3, delay=0.01)
    async def flaky() -> str:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("boom")
        return "done"

    assert await flaky() == "done"
    assert attempts["count"] == 3


def test_scheduler_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    settings_obj = Settings(SUPABASE_CONNECTION_STRING="postgresql://u:p@localhost:5432/db")
    monkeypatch.setattr("api.core.scheduler.settings", settings_obj)

    manager = SchedulerManager()
    called = {"started": False}

    class FakeScheduler:
        running = False

        def start(self) -> None:
            called["started"] = True

    manager.scheduler = FakeScheduler()
    manager.start()
    assert called["started"] is True


def test_job_persistence(monkeypatch: pytest.MonkeyPatch) -> None:
    settings_obj = Settings(SUPABASE_CONNECTION_STRING="postgresql://u:p@localhost:5432/db")
    monkeypatch.setattr("api.core.scheduler.settings", settings_obj)

    manager = SchedulerManager()
    fake_job = SimpleNamespace(id="x")

    def fake_add_job(*_args, **kwargs):
        assert kwargs["max_instances"] == 1
        return fake_job

    monkeypatch.setattr(manager.scheduler, "add_job", fake_add_job)
    out = manager.add_job(lambda: None, trigger="interval", seconds=60, id="x")
    assert out.id == "x"
