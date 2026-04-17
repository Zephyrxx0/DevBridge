from functools import lru_cache

from api.core.config import settings

class SecretManager:
    """
    Temporary facade over central configuration settings.
    Kept to avoid breaking existing imports while callers migrate.
    """
    def __init__(self, project_id: str = None):
        self.project_id = project_id or settings.google_cloud_project

    @lru_cache(maxsize=32)
    def get_secret(self, secret_id: str, version_id: str = "latest") -> str:
        """
        Resolve requested values from the central settings object.
        """
        _ = version_id  # Kept for backwards-compatible signature.
        mapping = {
            "SUPABASE_CONNECTION_STRING": settings.supabase_connection_string,
            "GOOGLE_CLOUD_PROJECT": settings.google_cloud_project or "",
        }
        return mapping.get(secret_id, "")

# Singleton instance
secrets = SecretManager()

def get_secret_manager() -> SecretManager:
    return secrets
