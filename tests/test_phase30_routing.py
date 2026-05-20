from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.agents.nodes.cascade import cascade_node


@pytest.mark.asyncio
async def test_gemma_path(monkeypatch):
    class CascadeResult:
        def __init__(self, *, content: str, model_used: str, cascaded: bool):
            self.content = content
            self.model_used = model_used
            self.cascaded = cascaded

    class MockCascadeAgent:
        def __init__(self):
            self.validators = [object()]
            self.calls = 0

        async def run(self, _messages):
            self.calls += 1
            return CascadeResult(
                content='{"content":"quick answer","is_complete":true,"confidence":0.95}',
                model_used="gemma-4-26b-a4b-it",
                cascaded=False,
            )

    mock_agent = MockCascadeAgent()
    monkeypatch.setattr("api.agents.nodes.cascade.cascade_agent", mock_agent)

    state = {"messages": [type("Msg", (), {"content": "hi"})()]}
    result = await cascade_node(state)

    assert result["messages"][0].content
    assert "model_used" in result
    assert "cascaded" in result
    assert result.get("model_used") == "gemma-4-26b-a4b-it"
    assert result.get("cascaded") is False
    assert mock_agent.calls == 1


@pytest.mark.asyncio
async def test_escalation_path(monkeypatch):
    class CascadeResult:
        def __init__(self, *, content: str, model_used: str, cascaded: bool):
            self.content = content
            self.model_used = model_used
            self.cascaded = cascaded

    class MockValidation:
        def __init__(self, passed: bool):
            self.passed = passed

    class MockValidator:
        def validate(self, response: str):
            if '"is_complete":true' in response:
                return MockValidation(True)
            return MockValidation(False)

    class MockCascadeAgent:
        def __init__(self):
            self.validators = [MockValidator()]
            self.calls = 0

        async def run(self, _messages):
            self.calls += 1
            if self.calls == 1:
                draft = '{"wrong":"schema"}'
                passed = all(v.validate(draft).passed for v in self.validators)
                if not passed:
                    return CascadeResult(
                        content='{"content":"valid","is_complete":true,"confidence":1.0}',
                        model_used="gemini-2.5-flash",
                        cascaded=True,
                    )

            return CascadeResult(
                content='{"content":"quick answer","is_complete":true,"confidence":0.95}',
                model_used="gemma-4-26b-a4b-it",
                cascaded=False,
            )

    mock_agent = MockCascadeAgent()
    monkeypatch.setattr("api.agents.nodes.cascade.cascade_agent", mock_agent)

    state = {"messages": [type("Msg", (), {"content": "complex request"})()]}
    result = await cascade_node(state)

    assert result["messages"][0].content == '{"content":"valid","is_complete":true,"confidence":1.0}'
    assert "model_used" in result
    assert "cascaded" in result
    assert result.get("model_used") == "gemini-2.5-flash"
    assert result.get("cascaded") is True
    assert mock_agent.calls == 1
