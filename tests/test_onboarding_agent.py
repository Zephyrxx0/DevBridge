"""Tests for onboarding agent personalization and retry logic."""

from __future__ import annotations

import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.db.onboarding_models import OnboardingPlan


VALID_PLAN_JSON = json.dumps({
    "summary": "A FastAPI backend for codebase knowledge.",
    "architecture": "Layered: routes → agents → DB with vector search.",
    "setup_commands": ["pip install -r requirements.txt", "uvicorn api.main:app"],
    "key_files": [
        {"path": "api/routes/repo.py", "description": "Main repository endpoints"},
        {"path": "api/agents/orchestrator.py", "description": "Agent orchestration logic"},
    ],
    "steps": [
        {
            "title": "Explore the API routes",
            "description": "Start with api/routes/ to understand HTTP surface.",
            "files": ["api/routes/repo.py"],
        },
        {
            "title": "Understand the agent layer",
            "description": "Read orchestrator.py for multi-agent flow.",
            "files": ["api/agents/orchestrator.py"],
        },
    ],
})

INVALID_JSON = "{ this is not valid json at all }"


@pytest.fixture
def mock_vector_db():
    """Mock vector_db.hybrid_search to return fake code results."""
    with patch("api.agents.onboarding.code_search_for_onboarding") as mock_search:
        mock_search.return_value = [
            {"file_path": "api/routes/repo.py", "snippet": "router = APIRouter()", "start_line": 1, "end_line": 10},
            {"file_path": "api/agents/orchestrator.py", "snippet": "class Orchestrator:", "start_line": 1, "end_line": 20},
        ]
        yield mock_search


@pytest.fixture
def mock_llm_valid():
    """Mock LLM that returns valid plan JSON on first call."""
    with patch("api.agents.onboarding.get_model") as mock_get:
        mock_model = MagicMock()
        mock_model.ainvoke = AsyncMock(return_value=MagicMock(content=VALID_PLAN_JSON))
        mock_get.return_value = mock_model
        yield mock_model


@pytest.fixture
def mock_llm_invalid_then_valid():
    """Mock LLM that fails twice (invalid JSON) then succeeds."""
    with patch("api.agents.onboarding.get_model") as mock_get:
        mock_model = MagicMock()
        call_count = 0

        async def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                return MagicMock(content=INVALID_JSON)
            return MagicMock(content=VALID_PLAN_JSON)

        mock_model.ainvoke = AsyncMock(side_effect=side_effect)
        mock_get.return_value = mock_model
        yield mock_model


@pytest.fixture
def mock_llm_always_invalid():
    """Mock LLM that always returns invalid JSON."""
    with patch("api.agents.onboarding.get_model") as mock_get:
        mock_model = MagicMock()
        mock_model.ainvoke = AsyncMock(return_value=MagicMock(content=INVALID_JSON))
        mock_get.return_value = mock_model
        yield mock_model


@pytest.fixture
def mock_upsert():
    """Mock DB upsert to avoid real DB calls."""
    with patch("api.agents.onboarding.upsert_onboarding_plan", new_callable=AsyncMock) as mock:
        mock.return_value = True
        yield mock


class TestFocusPersonalization:
    """Verify focus parameter influences prompt generation."""

    @pytest.mark.asyncio
    async def test_backend_focus_influences_prompt(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Backend"):
            events.append(event)

        # LLM should have been called with a prompt containing "Backend"
        call_args = mock_llm_valid.ainvoke.call_args
        messages = call_args[0][0] if call_args[0] else call_args[1].get("messages", [])
        prompt_text = " ".join(str(m.content) if hasattr(m, "content") else str(m) for m in messages)
        assert "Backend" in prompt_text, f"Focus 'Backend' not found in prompt: {prompt_text}"

    @pytest.mark.asyncio
    async def test_frontend_focus_influences_prompt(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Frontend"):
            events.append(event)

        call_args = mock_llm_valid.ainvoke.call_args
        messages = call_args[0][0] if call_args[0] else call_args[1].get("messages", [])
        prompt_text = " ".join(str(m.content) if hasattr(m, "content") else str(m) for m in messages)
        assert "Frontend" in prompt_text, f"Focus 'Frontend' not found in prompt: {prompt_text}"

    @pytest.mark.asyncio
    async def test_status_updates_reference_focus(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Backend"):
            events.append(event)

        status_events = [e for e in events if e.get("type") == "status"]
        assert len(status_events) > 0, "Expected at least one status event"

        # At least one status event should reference the focus
        focus_referenced = any("Backend" in e.get("content", "") for e in status_events)
        assert focus_referenced, f"No status event references 'Backend': {status_events}"


class TestExponentialBackoff:
    """Verify retry logic with exponential backoff on validation failure."""

    @pytest.mark.asyncio
    async def test_retries_on_invalid_json(self, mock_vector_db, mock_llm_invalid_then_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)

        # Should have called LLM 3 times (2 failures + 1 success)
        assert mock_llm_invalid_then_valid.ainvoke.call_count == 3

        # Final event should be a valid plan
        plan_events = [e for e in events if e.get("type") == "plan"]
        assert len(plan_events) == 1, f"Expected exactly one plan event, got {len(plan_events)}"

    @pytest.mark.asyncio
    async def test_backoff_timing(self, mock_vector_db, mock_llm_invalid_then_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        start = time.monotonic()
        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)
        elapsed = time.monotonic() - start

        # Exponential backoff: 1s + 2s = 3s minimum delay
        # Allow some tolerance for test execution overhead
        assert elapsed >= 2.5, f"Backoff too fast: {elapsed:.2f}s (expected >= 2.5s)"

    @pytest.mark.asyncio
    async def test_max_retries_exhausted(self, mock_vector_db, mock_llm_always_invalid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)

        # Should have called LLM 3 times total (1 initial + 2 retries)
        assert mock_llm_always_invalid.ainvoke.call_count == 3

        # Should have an error event, no plan event
        plan_events = [e for e in events if e.get("type") == "plan"]
        error_events = [e for e in events if e.get("type") == "error"]
        assert len(plan_events) == 0, "Should not produce a plan on exhausted retries"
        assert len(error_events) == 1, f"Expected error event on exhausted retries, got {error_events}"


class TestSSEStream:
    """Verify SSE event stream structure."""

    @pytest.mark.asyncio
    async def test_events_have_correct_types(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)

        # Every event must have a 'type' field
        for event in events:
            assert "type" in event, f"Event missing 'type': {event}"
            assert event["type"] in ("status", "plan", "error"), f"Unknown event type: {event['type']}"

    @pytest.mark.asyncio
    async def test_plan_event_validates_as_onboarding_plan(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)

        plan_events = [e for e in events if e.get("type") == "plan"]
        assert len(plan_events) == 1

        # Content should be valid OnboardingPlan
        plan_data = plan_events[0]["content"]
        plan = OnboardingPlan.model_validate(plan_data)
        assert plan.summary
        assert plan.steps

    @pytest.mark.asyncio
    async def test_successful_plan_triggers_upsert(self, mock_vector_db, mock_llm_valid, mock_upsert):
        from api.agents.onboarding import generate_onboarding_plan

        events = []
        async for event in generate_onboarding_plan("test-repo-id", focus="Exploring"):
            events.append(event)

        # upsert should have been called once with repo_id and plan dict
        mock_upsert.assert_called_once()
        call_args = mock_upsert.call_args
        assert call_args[0][0] == "test-repo-id"
        assert isinstance(call_args[0][1], dict)
