from pathlib import Path
from types import SimpleNamespace
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from api import main


def test_cold_start_lifespan_executes_hindsight_init_once_and_root_ready(monkeypatch) -> None:
    call_order: list[str] = []
    init_calls = {"count": 0}

    async def fake_init_db_pool(connection_string: str) -> None:
        _ = connection_string
        call_order.append("init_db_pool")

    async def fake_close_db_pool() -> None:
        call_order.append("close_db_pool")

    def fake_hindsight_initialize() -> bool:
        init_calls["count"] += 1
        call_order.append("hindsight_initialize")
        return True

    class FakeSchedulerManager:
        def add_job(self, *args, **kwargs) -> None:
            _ = (args, kwargs)

        def start(self) -> None:
            call_order.append("scheduler_start")

        def shutdown(self) -> None:
            call_order.append("scheduler_shutdown")

    monkeypatch.setattr(main, "init_db_pool", fake_init_db_pool)
    monkeypatch.setattr(main, "close_db_pool", fake_close_db_pool)
    monkeypatch.setattr(main.hindsight_db, "initialize", fake_hindsight_initialize)
    monkeypatch.setattr(main, "SchedulerManager", FakeSchedulerManager)
    monkeypatch.setattr(main.FastAPICache, "init", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(supabase_connection_string="postgresql://example"),
    )

    with TestClient(main.app) as client:
        root_response = client.get("/")

    assert root_response.status_code == 200
    assert root_response.json()["status"] == "online"
    assert init_calls["count"] == 1
    assert call_order.index("init_db_pool") < call_order.index("hindsight_initialize")
    assert call_order.index("hindsight_initialize") < call_order.index("scheduler_start")


def test_cold_start_health_db_probe_returns_structured_response(monkeypatch) -> None:
    async def fake_init_db_pool(connection_string: str) -> None:
        _ = connection_string

    async def fake_close_db_pool() -> None:
        return None

    class _ConnContext:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            _ = (exc_type, exc, tb)
            return False

        async def execute(self, sql):
            _ = sql
            return None

    class _FakeEngine:
        def connect(self):
            return _ConnContext()

    class FakeSchedulerManager:
        def add_job(self, *args, **kwargs) -> None:
            _ = (args, kwargs)

        def start(self) -> None:
            return None

        def shutdown(self) -> None:
            return None

    monkeypatch.setattr(main, "init_db_pool", fake_init_db_pool)
    monkeypatch.setattr(main, "close_db_pool", fake_close_db_pool)
    monkeypatch.setattr(main.hindsight_db, "initialize", lambda: True)
    monkeypatch.setattr(main, "SchedulerManager", FakeSchedulerManager)
    monkeypatch.setattr(main.FastAPICache, "init", lambda *args, **kwargs: None)
    monkeypatch.setattr(main, "get_engine", lambda: _FakeEngine())
    monkeypatch.setattr(
        main,
        "settings",
        SimpleNamespace(supabase_connection_string="postgresql://example"),
    )

    with TestClient(main.app) as client:
        health_response = client.get("/health/db")

    assert health_response.status_code == 200
    payload = health_response.json()
    assert payload["ok"] is True
    assert payload["status"] == "connected"
