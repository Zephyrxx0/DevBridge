from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import text

from api.db.session import get_engine
from api.jobs.base import job_audit, with_distributed_lock


@job_audit("metrics_collection")
@with_distributed_lock("metrics_collection")
async def collect_daily_metrics() -> dict[str, int]:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine not initialized")

    since = datetime.now(UTC) - timedelta(days=1)
    async with engine.connect() as conn:
        questions_count = await conn.scalar(
            text("SELECT COUNT(*) FROM questions WHERE created_at >= :since"),
            {"since": since},
        )
        messages_count = await conn.scalar(
            text("SELECT COUNT(*) FROM chat_messages WHERE created_at >= :since"),
            {"since": since},
        )
    return {
        "questions_24h": int(questions_count or 0),
        "chat_messages_24h": int(messages_count or 0),
    }
