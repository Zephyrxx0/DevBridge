from pathlib import Path
from types import SimpleNamespace
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
import time
import asyncio

from api import main
from api.db import hindsight as hindsight_module


def _chat_payload() -> dict:
    return {
        "message": "hello",
        "thread_id": "thread-1",
        "repo_id": None,
    }


def test_unauthenticated_chat_rejected(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    async def should_not_run(*args, **kwargs):
        raise AssertionError("graph.ainvoke must not run for unauthenticated requests")

    monkeypatch.setattr(main.graph, "ainvoke", should_not_run)

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        response = client.post("/chat", json=_chat_payload())

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_user_isolation(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    chat_user_ids: list[str] = []
    stream_user_ids: list[str] = []

    async def fake_ainvoke(input_data, config):
        chat_user_ids.append(config["configurable"]["user_id"])
        return {"messages": [SimpleNamespace(content="ok")]}

    async def fake_stream_graph_events(message, thread_id, user_id):
        stream_user_ids.append(user_id)
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": SimpleNamespace(content="chunk")},
        }

    monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)
    monkeypatch.setattr(main, "stream_graph_events", fake_stream_graph_events)

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        headers_a = {"X-Internal-Auth": "test-token", "X-User-Id": "user-a"}
        headers_b = {"X-Internal-Auth": "test-token", "X-User-Id": "user-b"}

        response_a = client.post("/chat", json=_chat_payload(), headers=headers_a)
        response_b = client.post("/chat", json=_chat_payload(), headers=headers_b)

        stream_a = client.post("/chat/stream", json=_chat_payload(), headers=headers_a)
        stream_b = client.post("/chat/stream", json=_chat_payload(), headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert stream_a.status_code == 200
    assert stream_b.status_code == 200

    assert chat_user_ids == ["user-a", "user-b"]
    assert stream_user_ids == ["user-a", "user-b"]


def test_hindsight_initialize_sets_schema_and_returns_true(monkeypatch) -> None:
    manager = hindsight_module.HindsightManager()
    constructed_profiles: list[str] = []

    class FakeHindsightEmbedded:
        def __init__(self, profile: str) -> None:
            constructed_profiles.append(profile)

    monkeypatch.setattr(hindsight_module, "HindsightEmbedded", FakeHindsightEmbedded)
    monkeypatch.setattr(
        hindsight_module,
        "settings",
        SimpleNamespace(
            sync_supabase_connection_string="postgresql://example",
            report_summary_model="gemini-2.5-flash",
            gemini_api_key="test-key",
        ),
    )
    monkeypatch.delenv("HINDSIGHT_API_DATABASE_SCHEMA", raising=False)

    assert manager.initialize() is True
    assert constructed_profiles == ["devbridge"]
    assert hindsight_module.os.environ["HINDSIGHT_API_DATABASE_SCHEMA"] == "hindsight"


def test_hindsight_initialize_returns_false_when_constructor_raises(monkeypatch) -> None:
    manager = hindsight_module.HindsightManager()

    class BoomEmbedded:
        def __init__(self, profile: str) -> None:
            _ = profile
            raise RuntimeError("boom")

    monkeypatch.setattr(hindsight_module, "HindsightEmbedded", BoomEmbedded)
    monkeypatch.setattr(
        hindsight_module,
        "settings",
        SimpleNamespace(
            sync_supabase_connection_string="postgresql://example",
            report_summary_model="gemini-2.5-flash",
            gemini_api_key="test-key",
        ),
    )

    assert manager.initialize() is False


def test_hindsight_initialize_returns_false_when_db_url_missing(monkeypatch) -> None:
    manager = hindsight_module.HindsightManager()

    class FakeHindsightEmbedded:
        def __init__(self, profile: str) -> None:
            _ = profile

    monkeypatch.setattr(hindsight_module, "HindsightEmbedded", FakeHindsightEmbedded)
    monkeypatch.setattr(
        hindsight_module,
        "settings",
        SimpleNamespace(
            sync_supabase_connection_string="",
            report_summary_model="gemini-2.5-flash",
            gemini_api_key="test-key",
        ),
    )

    assert manager.initialize() is False


def test_uat4_recall_hindsight_memory_binding_in_chat_response(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    recall_observations: list[dict] = []

    async def fake_ainvoke(input_data, config):
        _ = input_data
        recall_observations.append(
            {
                "user_id": config["configurable"]["user_id"],
                "hindsight_memory": "prior note: user prefers concise replies",
            }
        )
        return {
            "messages": [SimpleNamespace(content="ok")],
            "hindsight_memory": "prior note: user prefers concise replies",
        }

    monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        headers = {"X-Internal-Auth": "test-token", "X-User-Id": "user-a"}
        response = client.post("/chat", json=_chat_payload(), headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["response"] == "ok"
    assert body["hindsight_memory"] == "prior note: user prefers concise replies"
    assert recall_observations == [
        {
            "user_id": "user-a",
            "hindsight_memory": "prior note: user prefers concise replies",
        }
    ]


def test_uat4_recall_hindsight_memory_user_isolation(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    recalls_by_user = {
        "user-a": "user-a memory",
        "user-b": "user-b memory",
    }
    seen: list[tuple[str, str]] = []

    async def fake_ainvoke(input_data, config):
        _ = input_data
        user_id = config["configurable"]["user_id"]
        recalled = recalls_by_user[user_id]
        seen.append((user_id, recalled))
        return {"messages": [SimpleNamespace(content=f"ok-{user_id}")], "hindsight_memory": recalled}

    monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        headers_a = {"X-Internal-Auth": "test-token", "X-User-Id": "user-a"}
        headers_b = {"X-Internal-Auth": "test-token", "X-User-Id": "user-b"}

        response_a = client.post("/chat", json=_chat_payload(), headers=headers_a)
        response_b = client.post("/chat", json=_chat_payload(), headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert response_a.json()["hindsight_memory"] == "user-a memory"
    assert response_b.json()["hindsight_memory"] == "user-b memory"
    assert ("user-a", "user-b memory") not in seen
    assert ("user-b", "user-a memory") not in seen


def test_uat5_retain_non_blocking_response_completes_before_reflection(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    events: list[tuple[str, float]] = []

    async def fake_ainvoke(input_data, config):
        _ = input_data
        _ = config
        events.append(("ainvoke_done", time.perf_counter()))
        return {"messages": [SimpleNamespace(content="ok")], "hindsight_memory": "mem"}

    async def slow_reflect():
        events.append(("reflect_start", time.perf_counter()))
        await asyncio.sleep(0.25)
        events.append(("reflect_done", time.perf_counter()))

    monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)
    monkeypatch.setattr(main.hindsight_db, "reflect", slow_reflect)
    monkeypatch.setattr(main.settings, "supabase_connection_string", "")

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        headers = {"X-Internal-Auth": "test-token", "X-User-Id": "user-a"}
        start = time.perf_counter()
        response = client.post("/chat", json=_chat_payload(), headers=headers)
        end = time.perf_counter()

    assert response.status_code == 200
    assert (end - start) < 0.20
    assert response.json()["response"] == "ok"

    names = [name for name, _ in events]
    assert "ainvoke_done" in names
    assert "reflect_start" in names
    assert "reflect_done" not in names


def test_uat5_retain_non_blocking_ordering_response_before_reflect_completion(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")

    call_log: list[str] = []

    async def fake_ainvoke(input_data, config):
        _ = input_data
        _ = config
        call_log.append("ainvoke_done")
        return {"messages": [SimpleNamespace(content="ok")], "hindsight_memory": "mem"}

    async def slow_reflect():
        call_log.append("reflect_start")
        await asyncio.sleep(0.15)
        call_log.append("reflect_done")

    monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)
    monkeypatch.setattr(main.hindsight_db, "reflect", slow_reflect)
    monkeypatch.setattr(main.settings, "supabase_connection_string", "")

    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    with TestClient(main.app) as client:
        headers = {"X-Internal-Auth": "test-token", "X-User-Id": "user-a"}
        response = client.post("/chat", json=_chat_payload(), headers=headers)

    assert response.status_code == 200
    assert call_log[0] == "ainvoke_done"
    assert call_log[1] == "reflect_start"
    assert "reflect_done" not in call_log
