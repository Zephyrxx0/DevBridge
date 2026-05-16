from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import socket
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from functools import wraps
from typing import Any, TypeVar, cast

from sqlalchemy import text

from api.db.session import get_engine

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Awaitable[Any]])


def _lock_id(lock_name: str) -> int:
    return int.from_bytes(hashlib.sha256(lock_name.encode()).digest()[:8], "big", signed=True)


def _node_id() -> str:
    return os.getenv("HOSTNAME") or socket.gethostname()


async def _insert_job_history(job_id: str, status: str, start_time: datetime) -> str | None:
    engine = get_engine()
    if engine is None:
        return None
    async with engine.begin() as conn:
        row = await conn.execute(
            text(
                """
                INSERT INTO job_history (job_id, status, start_time, node_id)
                VALUES (:job_id, :status, :start_time, :node_id)
                RETURNING id::text
                """
            ),
            {
                "job_id": job_id,
                "status": status,
                "start_time": start_time,
                "node_id": _node_id(),
            },
        )
        return row.scalar_one_or_none()


async def _finalize_job_history(history_id: str, status: str, start_time: datetime, error_message: str | None = None) -> None:
    engine = get_engine()
    if engine is None:
        return
    end_time = datetime.now(UTC)
    duration = (end_time - start_time).total_seconds()
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                UPDATE job_history
                SET status = :status,
                    end_time = :end_time,
                    duration_seconds = :duration_seconds,
                    error_message = :error_message
                WHERE id::text = :history_id
                """
            ),
            {
                "status": status,
                "end_time": end_time,
                "duration_seconds": duration,
                "error_message": error_message,
                "history_id": history_id,
            },
        )


def with_distributed_lock(lock_name: str) -> Callable[[F], F]:
    """Prevent concurrent job execution across instances via advisory lock."""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            engine = get_engine()
            if engine is None:
                raise RuntimeError("Database engine is not initialized for distributed lock")

            lock_key = _lock_id(lock_name)
            async with engine.begin() as conn:
                locked = await conn.scalar(
                    text("SELECT pg_try_advisory_xact_lock(:key)"),
                    {"key": lock_key},
                )
                if not locked:
                    logger.info("Skip job execution: lock busy", extra={"lock_name": lock_name})
                    return None

                return await func(*args, **kwargs)

        return cast(F, wrapper)

    return decorator


def job_audit(job_id: str) -> Callable[[F], F]:
    """Write running/success/failed states to job_history."""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = datetime.now(UTC)
            history_id = await _insert_job_history(job_id=job_id, status="running", start_time=start_time)
            try:
                result = await func(*args, **kwargs)
                if history_id:
                    await _finalize_job_history(history_id, status="success", start_time=start_time)
                return result
            except Exception as exc:
                if history_id:
                    await _finalize_job_history(
                        history_id,
                        status="failed",
                        start_time=start_time,
                        error_message=str(exc),
                    )
                raise

        return cast(F, wrapper)

    return decorator


def with_retry(max_retries: int = 3, delay: float = 5) -> Callable[[F], F]:
    """Retry failed async jobs with exponential backoff."""

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            attempt = 0
            while True:
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    attempt += 1
                    if attempt >= max_retries:
                        logger.exception("Job failed after retries", extra={"attempts": attempt})
                        raise
                    wait_seconds = delay * (2 ** (attempt - 1))
                    logger.warning(
                        "Job failed, retrying",
                        extra={"attempt": attempt, "max_retries": max_retries, "wait": wait_seconds, "error": str(exc)},
                    )
                    await asyncio.sleep(wait_seconds)

        return cast(F, wrapper)

    return decorator
