import logging
import os
from typing import Any

from api.core.config import settings

try:
    from hindsight import HindsightEmbedded
except ImportError:  # pragma: no cover - validated in runtime logs/tests
    HindsightEmbedded = None


logger = logging.getLogger(__name__)


class HindsightManager:
    """Manages embedded Hindsight client lifecycle and access."""

    def __init__(self) -> None:
        self._client: Any | None = None

    def initialize(self) -> bool:
        """Initialize Hindsight embedded client for Supabase-backed memory."""
        if HindsightEmbedded is None:
            logger.warning("hindsight package not installed. Hindsight memory is disabled.")
            return False

        database_url = settings.sync_supabase_connection_string
        if not database_url:
            logger.warning("SUPABASE_CONNECTION_STRING is missing. Hindsight memory is disabled.")
            return False

        try:
            os.environ["HINDSIGHT_API_DATABASE_URL"] = database_url
            os.environ["HINDSIGHT_API_DATABASE_SCHEMA"] = "hindsight"

            llm_provider = "google"
            llm_model = settings.report_summary_model
            if llm_provider:
                os.environ["HINDSIGHT_API_LLM_PROVIDER"] = llm_provider
            if llm_model:
                os.environ["HINDSIGHT_API_LLM_MODEL"] = llm_model
            if settings.gemini_api_key:
                os.environ["HINDSIGHT_API_LLM_API_KEY"] = settings.gemini_api_key

            self._client = HindsightEmbedded(profile="devbridge")
            logger.info("Hindsight embedded client initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Hindsight embedded client: {e}")
            return False

    def reflect(self, *args: Any, **kwargs: Any) -> Any:
        """Proxy wrapper for Hindsight reflection operation."""
        if self._client is None:
            raise ValueError("Hindsight client is not initialized.")
        return self._client.reflect(*args, **kwargs)


hindsight_db = HindsightManager()
