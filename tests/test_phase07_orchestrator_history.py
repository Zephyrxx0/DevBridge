import json
from unittest.mock import AsyncMock, patch

import pytest

from api.agents.orchestrator import code_search, get_pr_detail, search_pr_history


@pytest.mark.asyncio
async def test_search_pr_history_returns_json_payload():
    mock_rows = [
        {
            "repo": "acme/devbridge",
            "number": 101,
            "title": "Improve auth flow",
            "summary": "Adds refresh rotation.",
            "author": "alice",
        }
    ]

    with patch("api.db.vector_store.vector_db.search_pr_history", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_rows
        response = await search_pr_history.ainvoke({"query": "auth refresh"})

    parsed = json.loads(response)
    assert parsed[0]["number"] == 101
    assert parsed[0]["title"] == "Improve auth flow"


@pytest.mark.asyncio
async def test_get_pr_detail_returns_full_record():
    detail = {
        "repo": "acme/devbridge",
        "number": 88,
        "title": "Refactor orchestrator",
        "description": "Long form description",
        "summary": "Intent summary",
    }
    with patch("api.db.vector_store.vector_db.get_pr_detail", new_callable=AsyncMock) as mock_detail:
        mock_detail.return_value = detail
        response = await get_pr_detail.ainvoke({"repo": "acme/devbridge", "pr_number": 88})

    parsed = json.loads(response)
    assert parsed["repo"] == "acme/devbridge"
    assert parsed["number"] == 88
    assert "description" in parsed


@pytest.mark.asyncio
async def test_code_search_can_include_history_metadata():
    mock_hits = [
        {
            "file_path": "api/agents/orchestrator.py",
            "start_line": 10,
            "end_line": 40,
            "snippet": "def code_search(...)",
        }
    ]

    with patch("api.db.vector_store.vector_db.hybrid_search", new_callable=AsyncMock) as mock_search, \
         patch("api.db.vector_store.vector_db.get_chunk_history", new_callable=AsyncMock) as mock_history:
        mock_search.return_value = mock_hits
        mock_history.return_value = {"commit_sha": "abc123", "pr_number": 7}

        response = await code_search.ainvoke({"query": "code search", "include_history": True})

    assert "Citations:" in response
    assert "abc123" in response
    assert "\"pr_number\": 7" in response
