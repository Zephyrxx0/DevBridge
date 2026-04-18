from __future__ import annotations

from typing import Optional
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

engine: Optional[AsyncEngine] = None


def _normalize_connection_string(connection_string: str) -> str:
    normalized = connection_string.strip()
    if normalized.startswith("postgresql://"):
        normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)

    parts = urlsplit(normalized)
    netloc = parts.netloc

    # Encode password safely when it contains reserved URL characters
    # (for example '@') so SQLAlchemy can parse the URL.
    if "@" in netloc:
        userinfo, hostinfo = netloc.rsplit("@", 1)
        if ":" in userinfo:
            username, raw_password = userinfo.split(":", 1)
            safe_password = quote(unquote(raw_password), safe="")
            netloc = f"{username}:{safe_password}@{hostinfo}"

    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("sslmode", "require")
    return urlunsplit((parts.scheme, netloc, parts.path, urlencode(query), parts.fragment))


async def init_db_pool(connection_string: str) -> AsyncEngine:
    global engine
    if engine is not None:
        return engine

    if not connection_string:
        raise RuntimeError("FATAL: connection_string is EMPTY in init_db_pool!")

    normalized = _normalize_connection_string(connection_string)
    if "@" in normalized and "%40" not in normalized and normalized.count("@") != 1:
        raise RuntimeError(f"FATAL: normalization failed!! String is: {normalized!r}")

    try:
        engine = create_async_engine(normalized, pool_size=10)
    except Exception as e:
        raise RuntimeError(f"FATAL: create_async_engine failed on string: {normalized!r}") from e
    
    return engine


async def close_db_pool() -> None:
    global engine
    if engine is not None:
        await engine.dispose()
        engine = None


def get_engine() -> Optional[AsyncEngine]:
    return engine
