from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.core.config import Settings


def test_phase20_settings_defaults():
    settings = Settings()

    assert settings.max_context_tokens == 48000
    assert settings.big_model_port == 8000
    assert settings.fast_model_port == 8001
