from __future__ import annotations

import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import text

from api.core.config import settings
from api.db.session import get_engine
from api.reports.hub import ReportsHub

router = APIRouter()

_trigger_hits: dict[str, deque[float]] = defaultdict(deque)


async def verify_admin(request: Request, x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    user_id = (x_user_id or getattr(request.state, "user_id", None) or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT is_admin FROM users WHERE id = CAST(:uid AS uuid)"),
            {"uid": user_id},
        )
        row = result.fetchone()
    if not row or not bool(row._mapping.get("is_admin")):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user_id


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
async def get_job_history(_admin: str = Depends(verify_admin)) -> list[dict[str, Any]]:
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
async def run_job_manually(job_id: str, request: Request, _admin: str = Depends(verify_admin)) -> dict[str, str]:
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
async def list_reports(hub: ReportsHub = Depends(get_reports_hub), _admin: str = Depends(verify_admin)) -> dict[str, Any]:
    return {"reports": hub.list_reports()}


@router.get("/reports/{filename}")
async def get_report(filename: str, hub: ReportsHub = Depends(get_reports_hub), _admin: str = Depends(verify_admin)) -> dict[str, str]:
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    try:
        body = hub.get_report(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return {"filename": filename, "content": body}


@router.get("/repo/{repo_id}/reports")
async def list_repo_reports(
    repo_id: str,
    hub: ReportsHub = Depends(get_reports_hub),
    _admin: str = Depends(verify_admin),
) -> dict[str, Any]:
    repo_tag = f"-{repo_id}-"
    reports = [
        item
        for item in hub.list_reports()
        if item["filename"].endswith(".md") and repo_tag in item["filename"]
    ]
    return {"repo_id": repo_id, "reports": reports}
