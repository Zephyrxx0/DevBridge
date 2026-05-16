from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import text

from api.core.config import settings
from api.db.session import get_engine
from api.jobs.base import job_audit, with_distributed_lock
from api.reports.generator import generate_daily_intelligence_report, generate_weekly_report
from api.reports.hub import ReportsHub


def _hub() -> ReportsHub:
    return ReportsHub(settings.reports_dir)


@job_audit("daily_report")
@with_distributed_lock("daily_report")
async def run_daily_report_job() -> str:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine not initialized")

    async with engine.connect() as conn:
        repos_result = await conn.execute(
            text("SELECT id FROM repositories ORDER BY created_at ASC")
        )
    repo_ids = [str(row._mapping["id"]) for row in repos_result.fetchall()]

    generated: list[str] = []
    for repo_id in repo_ids:
        report = await generate_daily_intelligence_report(repo_id)
        filename = f"daily-{repo_id}-{datetime.now(UTC).strftime('%Y-%m-%d')}.md"
        _hub().save(filename, report)
        generated.append(filename)

    return f"generated:{len(generated)}"


@job_audit("weekly_report")
@with_distributed_lock("weekly_report")
async def run_weekly_report_job() -> str:
    report = await generate_weekly_report()
    filename = f"weekly-{datetime.now(UTC).strftime('%Y-%m-%d')}.md"
    _hub().save(filename, report)
    return filename
