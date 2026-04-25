import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from api.ingestion.history import ingest_commit_history, ingest_pr_metadata


@pytest.mark.asyncio
async def test_ingest_pr_metadata_upserts_pull_request_record():
    mock_conn = AsyncMock()
    mock_engine = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = mock_conn
    mock_engine.connect.return_value = mock_cm

    with patch("api.ingestion.history._get_github_token", return_value="ghp-test-token"), \
         patch("api.ingestion.history._github_get_json", new_callable=AsyncMock) as mock_get_json, \
         patch("api.ingestion.history._summarize_pr", new_callable=AsyncMock, return_value="Intent summary"), \
         patch("api.ingestion.history._embed_text", new_callable=AsyncMock, return_value=[0.1] * 768), \
         patch("api.ingestion.history._ensure_db_ready", new_callable=AsyncMock), \
         patch("api.ingestion.history.get_engine", return_value=mock_engine):

        mock_get_json.return_value = {
            "title": "Refactor auth flow",
            "body": "This PR clarifies token refresh logic.",
            "user": {"login": "alice"},
            "merged_at": "2026-04-25T12:34:56Z",
        }

        result = await ingest_pr_metadata("acme/devbridge", 42)

    assert result.repo == "acme/devbridge"
    assert result.number == 42
    assert result.summary == "Intent summary"
    assert mock_conn.execute.called

    args, _ = mock_conn.execute.call_args
    sql_query = str(args[0])
    params = args[1]
    assert "INSERT INTO pull_requests" in sql_query
    assert params["repo"] == "acme/devbridge"
    assert params["number"] == 42
    assert params["title"] == "Refactor auth flow"
    assert params["summary"] == "Intent summary"
    assert params["author"] == "alice"


@pytest.mark.asyncio
async def test_ingest_commit_history_updates_code_chunk_links():
    mock_conn = AsyncMock()
    mock_engine = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__.return_value = mock_conn
    mock_engine.connect.return_value = mock_cm

    with patch("api.ingestion.history._get_github_token", return_value="ghp-test-token"), \
         patch("api.ingestion.history._github_get_json", new_callable=AsyncMock) as mock_get_json, \
         patch("api.ingestion.history._ensure_db_ready", new_callable=AsyncMock), \
         patch("api.ingestion.history.get_engine", return_value=mock_engine):

        mock_get_json.return_value = [
            {
                "sha": "abc123",
                "commit": {"message": "Fix session drift (#77)"},
            },
            {
                "sha": "def456",
                "commit": {"message": "Minor follow-up"},
            },
        ]

        result = await ingest_commit_history("acme/devbridge", "api/agents/orchestrator.py")

    assert result.commit_count == 2
    assert result.latest_commit_sha == "abc123"
    assert result.pr_number == 77
    assert mock_conn.execute.called

    args, _ = mock_conn.execute.call_args
    sql_query = str(args[0])
    params = args[1]
    assert "UPDATE code_chunks" in sql_query
    assert params["repo"] == "acme/devbridge"
    assert params["file_path"] == "api/agents/orchestrator.py"
    assert params["commit_sha"] == "abc123"
    assert params["pr_number"] == 77
