from __future__ import annotations

import pytest

from api.routes import repo as repo_routes


@pytest.mark.asyncio
async def test_run_ingestion_triggers_graph_build_and_save(monkeypatch):
    calls: dict[str, object] = {}

    class FakeConn:
        async def execute(self, stmt, params=None):
            calls.setdefault("sql", []).append(str(stmt))
            return None

        async def commit(self):
            return None

    class FakeConnCtx:
        async def __aenter__(self):
            return FakeConn()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class FakeEngine:
        def connect(self):
            return FakeConnCtx()

    async def fake_github_get_json(url: str, token: str | None = None):
        if "/git/trees/" in url:
            return {"tree": [{"type": "blob", "path": "api/main.py"}]}
        if "/contents/" in url:
            import base64

            payload = base64.b64encode(b"print('ok')\n").decode("utf-8")
            return {"content": payload}
        return {}

    class FakeBuilder:
        def __init__(self, repo_id, engine):
            calls["builder_repo_id"] = repo_id
            calls["builder_engine"] = engine

        async def build_graph(self):
            return ([{"id": "api/main.py", "type": "file", "name": "main.py", "file_path": "api/main.py"}], [])

    class FakeStore:
        def __init__(self):
            calls["store_engine"] = "created"

        async def save_graph(self, repo_id, nodes, edges):
            calls["saved"] = (repo_id, nodes, edges)

    async def fake_token(user_id=None):
        return "token"

    monkeypatch.setattr(repo_routes, "get_github_token", fake_token)
    monkeypatch.setattr(repo_routes, "_github_get_json", fake_github_get_json)
    monkeypatch.setattr(repo_routes, "GraphBuilder", FakeBuilder)
    monkeypatch.setattr(repo_routes, "GraphStoreManager", FakeStore)

    await repo_routes._run_ingestion(
        FakeEngine(),
        job_id="job-1234-0000-0000-0000-000000000000",
        repo_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        repo_slug="owner/repo",
        user_id="11111111-1111-1111-1111-111111111111",
    )

    assert calls["builder_repo_id"] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    assert "saved" in calls
    saved_repo_id, saved_nodes, saved_edges = calls["saved"]
    assert saved_repo_id == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    assert saved_nodes[0]["type"] == "file"
    assert saved_edges == []


@pytest.mark.asyncio
async def test_run_ingestion_graph_build_is_non_fatal(monkeypatch):
    class FakeConn:
        async def execute(self, stmt, params=None):
            return None

        async def commit(self):
            return None

    class FakeConnCtx:
        async def __aenter__(self):
            return FakeConn()

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class FakeEngine:
        def connect(self):
            return FakeConnCtx()

    async def fake_github_get_json(url: str, token: str | None = None):
        if "/git/trees/" in url:
            return {"tree": [{"type": "blob", "path": "api/main.py"}]}
        if "/contents/" in url:
            import base64

            payload = base64.b64encode(b"print('ok')\n").decode("utf-8")
            return {"content": payload}
        return {}

    class FailingBuilder:
        def __init__(self, repo_id, engine):
            pass

        async def build_graph(self):
            raise RuntimeError("graph boom")

    class FakeStore:
        def __init__(self):
            pass

        async def save_graph(self, repo_id, nodes, edges):
            raise AssertionError("save_graph should not be called when build fails")

    async def fake_token(user_id=None):
        return "token"

    monkeypatch.setattr(repo_routes, "get_github_token", fake_token)
    monkeypatch.setattr(repo_routes, "_github_get_json", fake_github_get_json)
    monkeypatch.setattr(repo_routes, "GraphBuilder", FailingBuilder)
    monkeypatch.setattr(repo_routes, "GraphStoreManager", FakeStore)

    await repo_routes._run_ingestion(
        FakeEngine(),
        job_id="job-5678-0000-0000-0000-000000000000",
        repo_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        repo_slug="owner/repo",
        user_id="22222222-2222-2222-2222-222222222222",
    )
