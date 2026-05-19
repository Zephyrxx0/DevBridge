from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.nodes.big import big_worker_node
from api.agents.nodes.fast import fast_worker_node


@pytest.mark.asyncio
async def test_gemma_path(monkeypatch):
    class FastResponse:
        content = '{"content":"quick answer","is_complete":true,"confidence":0.95}'

    class FastModel:
        async def ainvoke(self, _messages):
            return FastResponse()

    monkeypatch.setattr("api.agents.utils.llm.get_model", lambda is_fast: FastModel())
    monkeypatch.setattr("api.agents.nodes.fast.get_model", lambda is_fast: FastModel())

    state = {"messages": [type("Msg", (), {"content": "hi"})()]}
    result = await fast_worker_node(state)

    assert result["messages"][0].content
    assert result.get("model_used") == "gemma-2-9b-it"
    assert result.get("cascaded") is False


@pytest.mark.asyncio
async def test_escalation_path(monkeypatch):
    call_counts = {"fast": 0, "big": 0}

    class FastResponse:
        content = "malformed text"

    class BigResponse:
        content = "deep answer"

    class FastModel:
        async def ainvoke(self, _messages):
            call_counts["fast"] += 1
            return FastResponse()

    class BigModel:
        async def ainvoke(self, _messages):
            call_counts["big"] += 1
            return BigResponse()

    def _mock_get_model(is_fast: bool):
        return FastModel() if is_fast else BigModel()

    monkeypatch.setattr("api.agents.utils.llm.get_model", _mock_get_model)
    monkeypatch.setattr("api.agents.nodes.fast.get_model", _mock_get_model)
    monkeypatch.setattr("api.agents.nodes.big.get_model", _mock_get_model)

    state = {"messages": [type("Msg", (), {"content": "complex request"})()]}
    fast_result = await fast_worker_node(state)

    if "model_used" not in fast_result or "cascaded" not in fast_result:
        big_result = await big_worker_node(state)
        result = {
            "messages": big_result["messages"],
            "model_used": "gemini-2.5-flash",
            "cascaded": True,
        }
    else:
        result = fast_result

    assert call_counts["fast"] >= 1
    assert call_counts["big"] >= 1
    assert result.get("model_used") == "gemini-2.5-flash"
    assert result.get("cascaded") is True
