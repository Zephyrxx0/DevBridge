from functools import lru_cache
import os
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError

from api.core.config import settings
from api.db.session import get_engine

class SecretManager:
    """
    Temporary facade over central configuration settings.
    Kept to avoid breaking existing imports while callers migrate.
    """
    def __init__(self, project_id: str = None):
        self.project_id = project_id or ""

    @lru_cache(maxsize=32)
    def get_secret(self, secret_id: str, version_id: str = "latest") -> str:
        """
        Resolve requested values from the central settings object.
        """
        _ = version_id  # Kept for backwards-compatible signature.
        mapping = {
            "SUPABASE_CONNECTION_STRING": settings.supabase_connection_string,
        }
        return mapping.get(secret_id, "")

# Singleton instance
secrets = SecretManager()

def get_secret_manager() -> SecretManager:
    return secrets


def _normalize_user_uuid(user_id: UUID | str | None) -> UUID | None:
    if user_id is None:
        return None
    if isinstance(user_id, UUID):
        return user_id
    try:
        return UUID(str(user_id).strip())
    except Exception:
        return None


async def get_github_token(
    user_id: UUID | str | None = None,
    allow_env_fallback: bool = False,
) -> str:
    """Resolve user-scoped GitHub token from RPC.

    Environment fallback is disabled by default to avoid shared PAT usage.
    """
    user_uuid = _normalize_user_uuid(user_id)
    if user_uuid is not None:
        engine = get_engine()
        if engine is not None:
            query = text(
                "SELECT get_github_token_for_user(CAST(:user_id AS uuid)) AS provider_token"
            )
            try:
                async with engine.connect() as conn:
                    result = await conn.execute(query, {"user_id": str(user_uuid)})
                    row = result.fetchone()
                    if row:
                        token = (row._mapping.get("provider_token") or "").strip()
                        if token:
                            return token
            except (ProgrammingError, DBAPIError):
                # Some environments don't have the RPC helper function.
                # Fall through to env token when allowed.
                pass

    if allow_env_fallback:
        return (os.getenv("GITHUB_TOKEN") or "").strip()
    return ""
