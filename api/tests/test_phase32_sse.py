import pytest


def _stub_extract_metadata(value):
    """Phase-32 scaffold stub. Real extraction implemented in api.main."""
    output = value.get("data", {}).get("output", {}) if isinstance(value, dict) else {}
    return {
        "fallback": bool(output.get("fallback", False)),
        "model_used": output.get("model_used"),
        "cascaded": bool(output.get("cascaded", False)),
    }


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
    metadata = _stub_extract_metadata(event)
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
