from __future__ import annotations

from types import SimpleNamespace

from api.agents.utils import llm as llm_module
from api.core.config import Settings
from api.utils import tokenizer as tokenizer_module


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


def test_settings_loads_gemini_api_key_from_env(monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "gem-key-123")
    settings = Settings()
    assert settings.gemini_api_key == "gem-key-123"


def test_get_model_big_uses_gemini_flash_with_auto_thinking() -> None:
    llm_module.settings.gemini_api_key = "gem-key-123"
    model = llm_module.get_model(is_fast=False)
    assert getattr(model, "model_name", None) == "gemini-2.5-flash"
    assert getattr(model, "thinking_budget", None) == -1


def test_get_model_fast_uses_gemma_high_thinking() -> None:
    llm_module.settings.gemini_api_key = "gem-key-123"
    model = llm_module.get_model(is_fast=True)
    assert getattr(model, "model_name", None) == "gemma-4-26b-a4b-it"
    assert getattr(model, "thinking_level", None) == "HIGH"


def test_tokenizer_uses_sdk_count_tokens(monkeypatch) -> None:
    tokenizer_module._get_client.cache_clear()
    tokenizer_module.settings.gemini_api_key = "gem-key-123"

    class FakeModels:
        @staticmethod
        def count_tokens(*, model, contents):
            assert model == "gemini-2.5-flash"
            assert contents == "hello world"
            return SimpleNamespace(total_tokens=77)

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(tokenizer_module.genai, "Client", lambda api_key: FakeClient())
    assert tokenizer_module._count_tokens("hello world", "gemini") == 77
