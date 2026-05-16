from __future__ import annotations

from datetime import UTC, datetime, timedelta
from sqlalchemy import text

from api.core.config import settings
from api.db.session import get_engine


async def _summarize_with_gemma(prompt: str) -> str:
    try:
        from langchain_google_vertexai import ChatVertexAI

        model = ChatVertexAI(model=settings.report_summary_model, temperature=0.2)
        response = await model.ainvoke(prompt)
        content = getattr(response, "content", "")
        if isinstance(content, str) and content.strip():
            return content
    except Exception:
        pass
    return "Gemma summary unavailable. Fallback summary used.\n\n" + prompt[:1500]


async def generate_daily_intelligence_report() -> str:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine not initialized")

    since = datetime.now(UTC) - timedelta(days=1)
    async with engine.connect() as conn:
        top_questions = await conn.execute(
            text(
                """
                SELECT question, COUNT(*) AS cnt
                FROM questions
                WHERE created_at >= :since
                GROUP BY question
                ORDER BY cnt DESC
                LIMIT 10
                """
            ),
            {"since": since},
        )
        chat_count_result = await conn.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM chat_messages
                WHERE created_at >= :since
                """
            ),
            {"since": since},
        )

    rows = [dict(row._mapping) for row in top_questions.fetchall()]
    chat_count = int(chat_count_result.scalar_one_or_none() or 0)
    confusion_lines = "\n".join(f"- {r['question']} ({r['cnt']}x)" for r in rows) or "- No repeated questions"
    prompt = (
        "Create concise daily intelligence report for intern confusion. "
        "Include key confusion topics and next actions.\n\n"
        f"Messages in last 24h: {chat_count}\n"
        f"Top repeated questions:\n{confusion_lines}"
    )
    summary = await _summarize_with_gemma(prompt)
    day = datetime.now(UTC).strftime("%Y-%m-%d")
    return f"# Daily Intelligence Report ({day})\n\n{summary}\n"


async def generate_weekly_report() -> str:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine not initialized")

    since = datetime.now(UTC) - timedelta(days=7)
    async with engine.connect() as conn:
        weekly_questions = await conn.execute(
            text(
                """
                SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS cnt
                FROM questions
                WHERE created_at >= :since
                GROUP BY day
                ORDER BY day ASC
                """
            ),
            {"since": since},
        )

    trend = [dict(row._mapping) for row in weekly_questions.fetchall()]
    trend_text = "\n".join(f"- {row['day']}: {row['cnt']} questions" for row in trend) or "- No activity"
    prompt = (
        "Create weekly intelligence trend summary from daily usage metrics. "
        "Highlight trend and risks.\n\n"
        f"Question volume by day:\n{trend_text}"
    )
    summary = await _summarize_with_gemma(prompt)
    week = datetime.now(UTC).strftime("%Y-%m-%d")
    return f"# Weekly Intelligence Report ({week})\n\n{summary}\n"
