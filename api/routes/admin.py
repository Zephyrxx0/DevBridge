from __future__ import annotations

import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text

from api.core.config import settings
from api.db.session import get_engine
from api.reports.hub import ReportsHub

router = APIRouter()

_trigger_hits: dict[str, deque[float]] = defaultdict(deque)


def _verify_admin(request: Request) -> None:
    expected = (settings.internal_auth_token or "").strip()
    provided = (request.headers.get("X-Internal-Auth") or "").strip()
    if not expected or expected != provided:
        raise HTTPException(status_code=403, detail="Forbidden")


def _rate_limit(job_id: str, max_hits: int = 5, period_sec: int = 60) -> None:
    now = time.time()
    window = _trigger_hits[job_id]
    while window and now - window[0] > period_sec:
        window.popleft()
    if len(window) >= max_hits:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    window.append(now)


def get_reports_hub() -> ReportsHub:
    return ReportsHub(settings.reports_dir)


@router.get("/jobs/history")
async def get_job_history(_admin: None = Depends(_verify_admin)) -> list[dict[str, Any]]:
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT id, job_id, status, start_time, end_time, duration_seconds, error_message, node_id
                FROM job_history
                ORDER BY created_at DESC
                LIMIT 200
                """
            )
        )
        return [dict(row._mapping) for row in result.fetchall()]


@router.post("/jobs/{job_id}/run")
async def run_job_manually(job_id: str, request: Request, _admin: None = Depends(_verify_admin)) -> dict[str, str]:
    _rate_limit(job_id)
    scheduler_manager = getattr(request.app.state, "scheduler_manager", None)
    if scheduler_manager is None:
        raise HTTPException(status_code=503, detail="Scheduler unavailable")
    job = scheduler_manager.scheduler.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Unknown job '{job_id}'")
    scheduler_manager.scheduler.modify_job(job_id, next_run_time=None)
    scheduler_manager.scheduler.wakeup()
    return {"status": "queued", "job_id": job_id}


@router.get("/reports")
async def list_reports(hub: ReportsHub = Depends(get_reports_hub), _admin: None = Depends(_verify_admin)) -> dict[str, Any]:
    return {"reports": hub.list_reports()}


@router.get("/reports/{filename}")
async def get_report(filename: str, hub: ReportsHub = Depends(get_reports_hub), _admin: None = Depends(_verify_admin)) -> dict[str, str]:
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    try:
        body = hub.get_report(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return {"filename": filename, "content": body}
