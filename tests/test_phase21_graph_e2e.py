from pathlib import Path
import sys

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.types import Command

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.graph import graph


@pytest.mark.asyncio
async def test_deep_query_routes_to_big_worker(monkeypatch):
    class FakeRouterMsg:
        content = "DEEP"

    class FakeRouterModel:
        async def ainvoke(self, _prompt):
            return FakeRouterMsg()

    class FakeBigModel:
        async def ainvoke(self, _messages):
            return AIMessage(content="big-analysis")

    monkeypatch.setattr("api.agents.nodes.router.get_model", lambda is_fast: FakeRouterModel())
    monkeypatch.setattr("api.agents.nodes.big.get_model", lambda is_fast: FakeBigModel())

    input_state = {"messages": [HumanMessage(content="Refactor this complex module")]}
    result = await graph.ainvoke(input_state, config={"configurable": {"thread_id": "phase21-e2e-deep"}})

    assert result["messages"][-1].content == "big-analysis"


@pytest.mark.asyncio
async def test_big_timeout_falls_back_to_fast_output(monkeypatch):
    class FakeRouterMsg:
        content = "DEEP"

    class FakeRouterModel:
        async def ainvoke(self, _prompt):
            return FakeRouterMsg()

    class BigTimeoutModel:
        async def ainvoke(self, _messages):
            return type("Msg", (), {"content": "never"})()

    class FakeFastModel:
        async def ainvoke(self, _messages):
            return AIMessage(content="fast-fallback-response")

    import asyncio

    original_wait_for = asyncio.wait_for

    async def force_big_timeout(_awaitable, timeout):
        if timeout == 120:
            if hasattr(_awaitable, "close"):
                _awaitable.close()
            raise asyncio.TimeoutError()
        return await original_wait_for(_awaitable, timeout)

    monkeypatch.setattr("api.agents.nodes.router.get_model", lambda is_fast: FakeRouterModel())
    monkeypatch.setattr("api.agents.nodes.big.get_model", lambda is_fast: BigTimeoutModel())
    monkeypatch.setattr("api.agents.nodes.fast.get_model", lambda is_fast: FakeFastModel())
    monkeypatch.setattr("api.agents.nodes.big.asyncio.wait_for", force_big_timeout)

    input_state = {"messages": [HumanMessage(content="Explain architecture deeply")]}
    result = await graph.ainvoke(input_state, config={"configurable": {"thread_id": "phase21-e2e-fallback"}})

    assert result["messages"][-1].content == "fast-fallback-response"
    assert result.get("fallback") is True
