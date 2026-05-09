from pathlib import Path
import sys
from typing import get_type_hints

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.state import AgentState
from api.agents.utils import llm as llm_module
from api.agents.utils.llm import get_model


def test_agent_state_has_required_keys():
    hints = get_type_hints(AgentState)
    assert "messages" in hints
    assert "next" in hints
    assert "fallback" in hints


def test_get_model_uses_correct_port_and_temperature(monkeypatch):
    class FakeChatOpenAI:
        def __init__(self, **kwargs):
            self.openai_api_base = kwargs["base_url"]
            self.temperature = kwargs["temperature"]

    monkeypatch.setattr(llm_module, "ChatOpenAI", FakeChatOpenAI)

    fast_model = get_model(is_fast=True)
    big_model = get_model(is_fast=False)

    assert "8001/v1" in str(fast_model.openai_api_base)
    assert "8000/v1" in str(big_model.openai_api_base)
    assert fast_model.temperature == 0.0
    assert big_model.temperature == 0.7
