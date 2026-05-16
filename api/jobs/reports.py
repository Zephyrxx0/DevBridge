from __future__ import annotations

from datetime import UTC, datetime

from api.core.config import settings
from api.jobs.base import job_audit, with_distributed_lock
from api.reports.generator import generate_daily_intelligence_report, generate_weekly_report
from api.reports.hub import ReportsHub


def _hub() -> ReportsHub:
    return ReportsHub(settings.reports_dir)


@job_audit("daily_report")
@with_distributed_lock("daily_report")
async def run_daily_report_job() -> str:
    report = await generate_daily_intelligence_report()
    filename = f"daily-{datetime.now(UTC).strftime('%Y-%m-%d')}.md"
    _hub().save(filename, report)
    return filename


@job_audit("weekly_report")
@with_distributed_lock("weekly_report")
async def run_weekly_report_job() -> str:
    report = await generate_weekly_report()
    filename = f"weekly-{datetime.now(UTC).strftime('%Y-%m-%d')}.md"
    _hub().save(filename, report)
    return filename
