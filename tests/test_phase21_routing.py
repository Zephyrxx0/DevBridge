from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.nodes.fast import fast_worker_node
from api.agents.nodes.router import intent_classifier


@pytest.mark.asyncio
async def test_hi_routes_to_fast_worker(monkeypatch):
    class FakeResponse:
        content = "FAST"

    class FakeModel:
        async def ainvoke(self, _prompt):
            return FakeResponse()

    monkeypatch.setattr("api.agents.nodes.router.get_model", lambda is_fast: FakeModel())

    state = {"messages": [type("Msg", (), {"content": "hi"})()]}
    result = await intent_classifier(state)
    assert result["next"] == "fast_worker"


@pytest.mark.asyncio
async def test_fast_worker_returns_model_message(monkeypatch):
    class FakeResponse:
        content = "ok"

    class FakeModel:
        async def ainvoke(self, _messages):
            return FakeResponse()

    monkeypatch.setattr("api.agents.nodes.fast.get_model", lambda is_fast: FakeModel())

    state = {"messages": [type("Msg", (), {"content": "hello"})()]}
    result = await fast_worker_node(state)
    assert result["messages"][0].content == "ok"
