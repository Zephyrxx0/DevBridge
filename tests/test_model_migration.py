from __future__ import annotations

from types import SimpleNamespace

from api.agents.utils import llm as llm_module


def test_scaffold_google_genai_import_surface() -> None:
    assert hasattr(llm_module, "get_model")


def test_scaffold_client_can_be_monkeypatched(monkeypatch) -> None:
    calls: list[str] = []

    class FakeClient:
        def __init__(self, *args, **kwargs):
            calls.append("init")

    monkeypatch.setattr(llm_module, "genai", SimpleNamespace(Client=FakeClient), raising=False)
    llm_module.genai.Client(api_key="test")
    assert calls == ["init"]
