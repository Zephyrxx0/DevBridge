from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import api.utils.tokenizer as tokenizer_mod


class FakeTokenizer:
    def encode(self, text, add_special_tokens=False):
        return text.split()


def _patch_tokenizer(monkeypatch):
    monkeypatch.setattr(tokenizer_mod, "_get_tokenizer", lambda model_type: FakeTokenizer())


def test_enforce_cap_truncates_oldest_and_preserves_recent(monkeypatch):
    _patch_tokenizer(monkeypatch)

    messages = [
        {"role": "user", "content": "old one"},
        {"role": "assistant", "content": "old two"},
        {"role": "user", "content": "newest item"},
    ]
    codebase_chunk = "keep codebase context always"

    truncated, warning = tokenizer_mod.enforce_cap(
        messages=messages,
        codebase_chunk=codebase_chunk,
        max_tokens=12,
        model_type="qwen",
    )

    assert warning is True
    assert truncated[-1] == {"role": "user", "content": "newest item"}
    assert len(truncated) < len(messages)
    assert {"role": "user", "content": "old one"} not in truncated


def test_enforce_cap_handles_gemma_model_type(monkeypatch):
    _patch_tokenizer(monkeypatch)

    messages = [
        {"role": "user", "content": "one two three"},
        {"role": "assistant", "content": "four five six"},
    ]

    truncated, warning = tokenizer_mod.enforce_cap(
        messages=messages,
        codebase_chunk="seven eight nine ten",
        max_tokens=11,
        model_type="gemma",
    )

    assert warning is True
    assert truncated[-1] == {"role": "assistant", "content": "four five six"}
    assert len(truncated) < len(messages)


def test_enforce_cap_no_truncation_when_within_limit(monkeypatch):
    _patch_tokenizer(monkeypatch)

    messages = [{"role": "user", "content": "small"}]
    truncated, warning = tokenizer_mod.enforce_cap(messages, "chunk", max_tokens=10)

    assert warning is False
    assert truncated == messages
