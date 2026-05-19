import pytest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from api.main import _extract_metadata


def _mock_stream_event() -> dict:
    return {
        "event": "on_chain_stream",
        "data": {
            "output": {
                "fallback": True,
                "model_used": "qwen2.5-72b",
                "cascaded": True,
            }
        },
    }


@pytest.mark.parametrize(
    "event, expected",
    [
        (
            _mock_stream_event(),
            {"fallback": True, "model_used": "qwen2.5-72b", "cascaded": True},
        )
    ],
)
def test_phase32_sse_metadata_scaffold(event, expected):
    metadata = _extract_metadata(event)
    payload = {
        "type": "metadata",
        "fallback": metadata.get("fallback", False),
        "model_used": metadata.get("model_used"),
        "cascaded": metadata.get("cascaded", False),
    }

    assert payload == {
        "type": "metadata",
        "fallback": expected["fallback"],
        "model_used": expected["model_used"],
        "cascaded": expected["cascaded"],
    }


def test_phase32_extract_metadata_recurses_nested_payload():
    nested_event = {
        "event": "on_chain_stream",
        "data": {
            "steps": [
                {"x": 1},
                {
                    "output": {
                        "fallback": True,
                        "model_used": "qwen2.5-72b",
                        "cascaded": True,
                        "internal_prompt": "must-not-leak",
                    }
                },
            ]
        },
    }

    assert _extract_metadata(nested_event) == {
        "fallback": True,
        "model_used": "qwen2.5-72b",
        "cascaded": True,
    }
