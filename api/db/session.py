from __future__ import annotations

from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

engine: Optional[AsyncEngine] = None


def _normalize_connection_string(connection_string: str) -> str:
    normalized = connection_string
    if normalized.startswith("postgresql://"):
        normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)

    parts = urlsplit(normalized)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("sslmode", "require")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


async def init_db_pool(connection_string: str) -> AsyncEngine:
    global engine
    if engine is not None:
        return engine

    normalized = _normalize_connection_string(connection_string)
    engine = create_async_engine(normalized, pool_size=10)
    return engine


async def close_db_pool() -> None:
    global engine
    if engine is not None:
        await engine.dispose()
        engine = None


def get_engine() -> Optional[AsyncEngine]:
    return engine
