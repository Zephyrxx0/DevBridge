from pathlib import Path
from types import SimpleNamespace
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from api import main


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
