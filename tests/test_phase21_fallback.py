from pathlib import Path
import sys

import pytest
from langgraph.types import Command

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.nodes.big import big_worker_node
from api.agents.utils.fallback import fallback_to_fast_worker


def test_fallback_helper_sets_flag_and_goto():
    cmd = fallback_to_fast_worker("timeout")
    assert isinstance(cmd, Command)
    assert cmd.goto == "fast_worker"
    assert cmd.update["fallback"] is True


@pytest.mark.asyncio
async def test_big_worker_timeout_routes_to_fast(monkeypatch):
    class AnyModel:
        async def ainvoke(self, _messages):
            return type("Msg", (), {"content": "late"})()

    import asyncio

    async def force_timeout(_awaitable, timeout):
        _ = timeout
        if hasattr(_awaitable, "close"):
            _awaitable.close()
        raise asyncio.TimeoutError()

    monkeypatch.setattr("api.agents.nodes.big.get_model", lambda is_fast: AnyModel())
    monkeypatch.setattr("api.agents.nodes.big.asyncio.wait_for", force_timeout)

    state = {"messages": [type("Msg", (), {"content": "deep analysis"})()]}
    result = await big_worker_node(state)

    assert isinstance(result, Command)
    assert result.goto == "fast_worker"
    assert result.update["fallback"] is True
