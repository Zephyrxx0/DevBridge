import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from api.agents.orchestrator import Orchestrator
from api.ingestion.history import ingest_commit_history, ingest_pr_metadata


@pytest.mark.asyncio
async def test_ingestion_persistence():
    """Verify PR + commit ingestion persistence and linking contract."""

    mock_conn = AsyncMock()
    execute_calls: list[tuple[str, dict]] = []

    async def _capture_execute(sql, params):
        execute_calls.append((str(sql), params))
        return MagicMock()

    mock_conn.execute.side_effect = _capture_execute

    mock_engine = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = mock_conn
    mock_engine.connect.return_value = mock_cm

    pr_payload = {
        "title": "Refactor login flow",
        "body": "Switched to token refresh rotation and added explicit expiry checks.",
        "user": {"login": "alice"},
        "merged_at": "2026-04-26T10:00:00Z",
    }
    commit_payload = [
        {
            "sha": "abc123def",
            "commit": {"message": "Fix login race and refresh path (#42)"},
        }
    ]

    with patch("api.ingestion.history._get_github_token", return_value="ghp-test-token"), \
         patch("api.ingestion.history._github_get_json", new_callable=AsyncMock) as mock_get_json, \
         patch("api.ingestion.history._summarize_pr", new_callable=AsyncMock, return_value="Login flow changed to prevent stale refresh token usage."), \
         patch("api.ingestion.history._embed_text", new_callable=AsyncMock, return_value=[0.01] * 768) as mock_embed, \
         patch("api.ingestion.history._ensure_db_ready", new_callable=AsyncMock), \
         patch("api.ingestion.history.get_engine", return_value=mock_engine):
        mock_get_json.side_effect = [pr_payload, commit_payload]

        pr_result = await ingest_pr_metadata("acme/devbridge", 42)
        commit_result = await ingest_commit_history("acme/devbridge", "api/auth/login.py")

    assert pr_result.repo == "acme/devbridge"
    assert pr_result.number == 42
    assert "Login flow changed" in pr_result.summary

    assert commit_result.repo == "acme/devbridge"
    assert commit_result.file_path == "api/auth/login.py"
    assert commit_result.latest_commit_sha == "abc123def"
    assert commit_result.pr_number == 42

    # Vertex embedding path is part of ingestion pipeline contract.
    assert mock_embed.await_count == 1

    assert len(execute_calls) == 2

    insert_sql, insert_params = execute_calls[0]
    update_sql, update_params = execute_calls[1]

    assert "INSERT INTO pull_requests" in insert_sql
    assert insert_params["repo"] == "acme/devbridge"
    assert insert_params["number"] == 42
    assert insert_params["title"] == "Refactor login flow"
    assert insert_params["author"] == "alice"

    assert "UPDATE code_chunks" in update_sql
    assert update_params["repo"] == "acme/devbridge"
    assert update_params["file_path"] == "api/auth/login.py"
    assert update_params["commit_sha"] == "abc123def"
    assert update_params["pr_number"] == 42


@pytest.mark.asyncio
async def test_agent_intent_grounding():
    """Verify Why-intent retrieval calls PR history tools and returns citation."""

    class FakeGraph:
        def __init__(self):
            self.last_input = None

        async def ainvoke(self, input_data, config=None):
            self.last_input = input_data
            return {
                "messages": [
                    AIMessage(
                        content="Login logic changed to enforce refresh-token rotation and avoid stale-session races."
                    )
                ]
            }

    fake_graph = FakeGraph()

    with patch("api.db.vector_store.vector_db._vectorstore", new=MagicMock()), \
         patch("api.db.vector_store.vector_db.search_pr_history", new_callable=AsyncMock) as mock_search, \
         patch("api.db.vector_store.vector_db.get_pr_detail", new_callable=AsyncMock) as mock_detail:
        mock_search.return_value = [
            {
                "repo": "acme/devbridge",
                "number": 42,
                "title": "Stabilize login refresh flow",
                "summary": "Moved refresh checks before session extension to prevent stale token reuse.",
            }
        ]
        mock_detail.return_value = {
            "repo": "acme/devbridge",
            "number": 42,
            "summary": "Refresh token rotation fix for login path.",
            "description": "Detailed rationale",
        }

        orchestrator = Orchestrator()
        orchestrator._graph = fake_graph

        response = await orchestrator.chat(
            "Why was the login logic changed in PR 42?", thread_id="phase07-e2e"
        )

    assert mock_search.await_count == 1
    assert mock_detail.await_count == 1

    graph_prompt = fake_graph.last_input["messages"][0].content
    assert "PR history context for intent grounding" in graph_prompt
    assert "Stabilize login refresh flow" in graph_prompt

    assert "refresh-token rotation" in response
    assert "Citations:" in response
    assert "acme/devbridge#42" in response
