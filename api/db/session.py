from __future__ import annotations

import shlex
from typing import Optional
from urllib.parse import parse_qsl, quote, unquote, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

engine: Optional[AsyncEngine] = None


def _conninfo_to_url(connection_string: str) -> str:
    raw_conninfo, _, raw_query = connection_string.partition("?")
    fields: dict[str, str] = {}
    for token in shlex.split(raw_conninfo):
        if "=" not in token:
            continue
        key, value = token.split("=", 1)
        fields[key.strip().lower()] = value.strip()

    host = fields.get("host", "")
    dbname = fields.get("dbname") or fields.get("database") or ""
    if not host or not dbname:
        raise ValueError("conninfo string must include host and dbname/database")

    user = fields.get("user", "")
    password = fields.get("password", "")
    port = fields.get("port", "")

    safe_user = quote(user, safe="") if user else ""
    safe_password = quote(password, safe="") if password else ""
    auth = ""
    if safe_user:
        auth = safe_user
        if password:
            auth = f"{auth}:{safe_password}"
        auth = f"{auth}@"

    hostport = f"{host}:{port}" if port else host
    query = dict(parse_qsl(raw_query, keep_blank_values=True))

    # Keep extra conninfo fields (except URL core parts) as query args.
    reserved = {"host", "port", "user", "password", "dbname", "database"}
    for key, value in fields.items():
        if key not in reserved:
            query.setdefault(key, value)

    query.pop("sslmode", None)
    query.pop("ssl", None)
    return urlunsplit(
        (
            "postgresql+asyncpg",
            f"{auth}{hostport}",
            f"/{quote(dbname, safe='')}",
            urlencode(query),
            "",
        )
    )


def _normalize_connection_string(connection_string: str) -> str:
    normalized = connection_string.strip()

    # Support libpq conninfo format ("key=value key=value") often returned by
    # secret stores for Postgres credentials.
    if "://" not in normalized and "=" in normalized:
        return _conninfo_to_url(normalized)

    if normalized.startswith("postgres://"):
        normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
    if normalized.startswith("postgresql://"):
        normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
    if normalized.startswith("postgresql+psycopg://"):
        normalized = normalized.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)

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
    query.pop("sslmode", None)
    query.pop("ssl", None)

    # Supabase transaction pooler (PgBouncer) does not support prepared
    # statements in the default asyncpg mode. Disable statement caches.
    host = (parts.hostname or "").lower()
    if "pooler.supabase.com" in host:
        query.setdefault("prepared_statement_cache_size", "0")

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
        engine = create_async_engine(
            normalized,
            pool_size=10,
            connect_args={
                "ssl": "require",
                "statement_cache_size": 0,
            },
        )
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
