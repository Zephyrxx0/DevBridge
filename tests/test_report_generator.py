from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from api.jobs import reports as reports_jobs
from api.reports import generator as reports_generator


@pytest.mark.asyncio
async def test_generate_daily_intelligence_report_scopes_by_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    repo_id = str(uuid4())

    class _FakeResult:
        def __init__(self, rows=None, scalar_value: int | None = None) -> None:
            self._rows = rows or []
            self._scalar_value = scalar_value

        def fetchall(self):
            return [SimpleNamespace(_mapping=row) for row in self._rows]

        def scalar_one_or_none(self):
            return self._scalar_value

    class _FakeConn:
        def __init__(self) -> None:
            self.calls: list[tuple[str, dict[str, object]]] = []

        async def execute(self, stmt, params=None):
            query = str(stmt)
            bound = params or {}
            self.calls.append((query, bound))
            if "FROM questions" in query:
                return _FakeResult(rows=[{"question": "Why flaky?", "cnt": 2}])
            return _FakeResult(scalar_value=5)

    class _FakeCtx:
        def __init__(self, conn: _FakeConn) -> None:
            self.conn = conn

        async def __aenter__(self):
            return self.conn

        async def __aexit__(self, *_exc):
            return False

    class _FakeEngine:
        def __init__(self, conn: _FakeConn) -> None:
            self.conn = conn

        def connect(self):
            return _FakeCtx(self.conn)

    conn = _FakeConn()
    monkeypatch.setattr(reports_generator, "get_engine", lambda: _FakeEngine(conn))
    monkeypatch.setattr(reports_generator, "_summarize_with_gemma", lambda _prompt: asyncio.sleep(0, result="summary"))

    report = await reports_generator.generate_daily_intelligence_report(repo_id)

    assert "summary" in report
    assert any(call_params.get("repo_id") == repo_id for _q, call_params in conn.calls)
    assert all("repo_id" in q for q, _params in conn.calls)


@pytest.mark.asyncio
async def test_daily_report_job_runs_for_all_active_repositories(monkeypatch: pytest.MonkeyPatch) -> None:
    repo_ids = [str(uuid4()), str(uuid4())]
    generated: list[str] = []
    saved: list[tuple[str, str]] = []

    class _FakeResult:
        def fetchall(self):
            return [SimpleNamespace(_mapping={"id": rid}) for rid in repo_ids]

    class _FakeConn:
        async def execute(self, *_args, **_kwargs):
            return _FakeResult()

    class _FakeCtx:
        async def __aenter__(self):
            return _FakeConn()

        async def __aexit__(self, *_exc):
            return False

    class _FakeEngine:
        def connect(self):
            return _FakeCtx()

    class _FakeHub:
        def save(self, filename: str, payload: str) -> None:
            saved.append((filename, payload))

    async def _fake_generate(repo_id: str) -> str:
        generated.append(repo_id)
        return f"report for {repo_id}"

    monkeypatch.setattr(reports_jobs, "get_engine", lambda: _FakeEngine())
    monkeypatch.setattr(reports_jobs, "generate_daily_intelligence_report", _fake_generate)
    monkeypatch.setattr(reports_jobs, "_hub", lambda: _FakeHub())

    result = await reports_jobs.run_daily_report_job()

    assert generated == repo_ids
    assert all(filename.startswith("daily-") and filename.endswith(".md") for filename, _ in saved)
    assert all(f"-{rid}-" in filename for (filename, _), rid in zip(saved, repo_ids, strict=True))
    assert result.startswith("generated:")
