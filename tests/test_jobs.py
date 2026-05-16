from __future__ import annotations

import asyncio
import os
import time
from pathlib import Path
from types import SimpleNamespace

import pytest

from api.core.config import Settings
from api.core.scheduler import SchedulerManager
from api.db.session import normalize_sync_url
from api.jobs import base as jobs_base
from api.jobs.cleanup import cleanup_job
from api.jobs.metrics import collect_daily_metrics
from api.jobs.sync import sync_github_and_docs_job
from api.reports.generator import generate_weekly_report
from api.reports.hub import ReportsHub


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


@pytest.mark.asyncio
async def test_sync_job_github_and_docs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("api.jobs.sync.get_engine", lambda: None)
    with pytest.raises(RuntimeError):
        await sync_github_and_docs_job()


@pytest.mark.asyncio
async def test_cleanup_job_gcs_and_local(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    stale = tmp_path / "stale"
    stale.mkdir(parents=True)
    old = time.time() - (9 * 24 * 3600)
    os.utime(stale, (old, old))

    monkeypatch.setattr("api.jobs.cleanup.settings", SimpleNamespace(repo_cache_dir=str(tmp_path), gcs_bucket_name=None))
    class LockConn:
        async def scalar(self, *_args, **_kwargs):
            return True
    class LockCtx:
        async def __aenter__(self):
            return LockConn()
        async def __aexit__(self, *_exc):
            return False
    class LockEngine:
        def begin(self):
            return LockCtx()
    monkeypatch.setattr(jobs_base, "get_engine", lambda: LockEngine())
    monkeypatch.setattr(jobs_base, "_insert_job_history", lambda **_kwargs: asyncio.sleep(0, result="hist"))
    monkeypatch.setattr(jobs_base, "_finalize_job_history", lambda *_args, **_kwargs: asyncio.sleep(0))

    result = await cleanup_job()
    assert result["local_deleted"] >= 1


@pytest.mark.asyncio
async def test_metrics_collection(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeConn:
        async def scalar(self, stmt, _params=None):
            query = str(stmt)
            if "FROM questions" in query:
                return 3
            return 7

    class FakeCtx:
        async def __aenter__(self):
            return FakeConn()

        async def __aexit__(self, *_exc):
            return False

    class FakeEngine:
        def begin(self):
            return FakeCtx()
        def connect(self):
            return FakeCtx()

    monkeypatch.setattr("api.jobs.metrics.get_engine", lambda: FakeEngine())
    monkeypatch.setattr(jobs_base, "get_engine", lambda: FakeEngine())
    monkeypatch.setattr(jobs_base, "_insert_job_history", lambda **_kwargs: asyncio.sleep(0, result="hist"))
    monkeypatch.setattr(jobs_base, "_finalize_job_history", lambda *_args, **_kwargs: asyncio.sleep(0))
    result = await collect_daily_metrics()
    assert result == {"questions_24h": 3, "chat_messages_24h": 7}


def test_reports_hub_storage(tmp_path: Path) -> None:
    hub = ReportsHub(str(tmp_path))
    hub.save("daily.md", "hello")
    hub.save("weekly.json", {"ok": True})

    listed = hub.list_reports()
    names = {item["filename"] for item in listed}
    assert {"daily.md", "weekly.json"}.issubset(names)
    assert hub.get_report("daily.md") == "hello"


@pytest.mark.asyncio
async def test_weekly_report_generation(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeResult:
        def fetchall(self):
            return [SimpleNamespace(_mapping={"day": "2026-05-10", "cnt": 4})]

    class FakeConn:
        async def execute(self, *_args, **_kwargs):
            return FakeResult()

    class FakeCtx:
        async def __aenter__(self):
            return FakeConn()

        async def __aexit__(self, *_exc):
            return False

    class FakeEngine:
        def connect(self):
            return FakeCtx()

    monkeypatch.setattr("api.reports.generator.get_engine", lambda: FakeEngine())
    monkeypatch.setattr("api.reports.generator._summarize_with_gemma", lambda _prompt: asyncio.sleep(0, result="summary"))

    report = await generate_weekly_report()
    assert "# Weekly Intelligence Report" in report
    assert "summary" in report
