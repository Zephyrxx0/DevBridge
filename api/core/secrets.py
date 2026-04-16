import os
from functools import lru_cache
import logging

try:
    from google.cloud import secretmanager
except ImportError:
    secretmanager = None

logger = logging.getLogger(__name__)

class SecretManager:
    """
    Handles secure retrieval of API keys and configuration secrets.
    Falls back to environment variables if GCP Secret Manager is unavailable
    or not configured.
    """
    def __init__(self, project_id: str = None):
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.client = secretmanager.SecretManagerServiceClient() if secretmanager else None

        if not self.client:
            logger.warning("Secret Manager client could not be initialized. Using Mock/Local Fallback.")

    @lru_cache(maxsize=32)
    def get_secret(self, secret_id: str, version_id: str = "latest") -> str:
        """
        Retrieves a secret from GCP Secret Manager with LRU caching to reduce latency/cost.
        Fallback to os.environ if project_id is missing or client fails.
        """
        # 1. Try local environment variable first (for local dev override)
        local_val = os.getenv(secret_id)
        if local_val:
            return local_val

        # 2. Try GCP Secret Manager if configured
        if self.client and self.project_id:
            try:
                name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version_id}"
                response = self.client.access_secret_version(request={"name": name})
                return response.payload.data.decode("UTF-8")
            except Exception as e:
                logger.error(f"Failed to fetch secret {secret_id} from GCP: {e}")

        # 3. Fail gracefully
        logger.warning(f"Secret {secret_id} not found in environment or Secret Manager.")
        return ""

# Singleton instance
secrets = SecretManager()

def get_secret_manager() -> SecretManager:
    return secrets
