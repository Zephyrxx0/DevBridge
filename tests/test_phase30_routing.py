from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.nodes.cascade import cascade_node


@pytest.mark.asyncio
async def test_gemma_path(monkeypatch):
    class CascadeResult:
        content = '{"content":"quick answer","is_complete":true,"confidence":0.95}'
        model_used = "gemma-2-9b-it"
        cascaded = False

    class FakeCascadeAgent:
        async def run(self, _messages):
            return CascadeResult()

    monkeypatch.setattr("api.agents.nodes.cascade.cascade_agent", FakeCascadeAgent())

    state = {"messages": [type("Msg", (), {"content": "hi"})()]}
    result = await cascade_node(state)

    assert result["messages"][0].content
    assert "model_used" in result
    assert "cascaded" in result
    assert result.get("model_used") == "gemma-2-9b-it"
    assert result.get("cascaded") is False


@pytest.mark.asyncio
async def test_escalation_path(monkeypatch):
    class CascadeResult:
        content = "deep answer"
        model_used = "gemini-2.5-flash"
        cascaded = True

    class FakeCascadeAgent:
        async def run(self, _messages):
            return CascadeResult()

    monkeypatch.setattr("api.agents.nodes.cascade.cascade_agent", FakeCascadeAgent())

    state = {"messages": [type("Msg", (), {"content": "complex request"})()]}
    result = await cascade_node(state)

    assert "model_used" in result
    assert "cascaded" in result
    assert result.get("model_used") == "gemini-2.5-flash"
    assert result.get("cascaded") is True
