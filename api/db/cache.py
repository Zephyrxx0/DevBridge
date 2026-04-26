import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Tuple

from sqlalchemy import text
from fastapi_cache.backends import Backend

from api.db.session import get_engine

class PostgresCacheBackend(Backend):
    def __init__(self):
        pass

    async def get(self, key: str) -> Optional[str]:
        engine = get_engine()
        if not engine:
            return None

        async with engine.connect() as conn:
            query = text("""
                SELECT value FROM cache_entries 
                WHERE key = :key AND expires_at > :now
            """)
            result = await conn.execute(query, {"key": key, "now": datetime.now(timezone.utc)})
            row = result.fetchone()
            if row:
                return row[0]
        return None

    async def set(self, key: str, value: Any, expire: Optional[int] = None):
        engine = get_engine()
        if not engine:
            return

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expire or 3600)
        
        async with engine.begin() as conn:
            query = text("""
                INSERT INTO cache_entries (key, value, expires_at)
                VALUES (:key, :value, :expires_at)
                ON CONFLICT (key) DO UPDATE 
                SET value = EXCLUDED.value, 
                    expires_at = EXCLUDED.expires_at
            """)
            await conn.execute(query, {
                "key": key, 
                "value": value, 
                "expires_at": expires_at
            })

    async def clear(self, namespace: Optional[str] = None, key: Optional[str] = None) -> int:
        engine = get_engine()
        if not engine:
            return 0

        async with engine.begin() as conn:
            if key:
                query = text("DELETE FROM cache_entries WHERE key = :key")
                result = await conn.execute(query, {"key": key})
                return result.rowcount
            elif namespace:
                # fastapi-cache2 typically prefixes keys with namespace
                query = text("DELETE FROM cache_entries WHERE key LIKE :namespace")
                result = await conn.execute(query, {"namespace": f"{namespace}:%"})
                return result.rowcount
            else:
                query = text("DELETE FROM cache_entries")
                result = await conn.execute(query)
                return result.rowcount

def repo_id_key_builder(
    func,
    namespace: str = "",
    request=None,
    response=None,
    args: Tuple[Any, ...] = None,
    kwargs: Dict[str, Any] = None,
):
    from fastapi_cache import FastAPICache
    
    # Extract repo_id from kwargs or request body
    repo_id = "default"
    if kwargs and "request" in kwargs:
        req_obj = kwargs["request"]
        if hasattr(req_obj, "repo_id") and req_obj.repo_id:
            repo_id = req_obj.repo_id
    
    # If namespace is provided, use it as a sub-prefix
    prefix = FastAPICache.get_prefix()
    cache_key = f"{prefix}:{namespace}:{repo_id}:{func.__module__}:{func.__name__}:{args}:{kwargs}"
    return cache_key
