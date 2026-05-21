import logging
import os
from typing import Any

from api.core.config import settings

try:
    from hindsight_client import Hindsight
    from hindsight_embed import get_embed_manager
except ImportError:  # pragma: no cover - validated in runtime logs/tests
    Hindsight = None
    get_embed_manager = None


logger = logging.getLogger(__name__)


class HindsightManager:
    """Manages embedded Hindsight client lifecycle and access."""

    def __init__(self) -> None:
        self._client: Any | None = None

    def initialize(self) -> bool:
        """Initialize Hindsight embedded client for Supabase-backed memory."""
        if Hindsight is None or get_embed_manager is None:
            logger.warning("hindsight packages not installed. Hindsight memory is disabled.")
            return False

        database_url = settings.sync_supabase_connection_string
        if not database_url:
            logger.warning("SUPABASE_CONNECTION_STRING is missing. Hindsight memory is disabled.")
            return False

        try:
            config = {
                "HINDSIGHT_API_DATABASE_URL": database_url,
                "HINDSIGHT_API_DATABASE_SCHEMA": "hindsight",
            }

            llm_provider = "gemini"
            llm_model = settings.report_summary_model
            if llm_provider:
                config["HINDSIGHT_API_LLM_PROVIDER"] = llm_provider
            if llm_model:
                config["HINDSIGHT_API_LLM_MODEL"] = llm_model
            if settings.gemini_api_key:
                config["HINDSIGHT_API_LLM_API_KEY"] = settings.gemini_api_key

            for key, value in config.items():
                os.environ[key] = value

            profile = "devbridge"
            embed_manager = get_embed_manager()
            if not embed_manager.ensure_running(config=config, profile=profile):
                logger.error("Failed to start embedded Hindsight daemon.")
                return False
            base_url = embed_manager.get_url(profile)

            self._client = Hindsight(base_url=base_url)
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
