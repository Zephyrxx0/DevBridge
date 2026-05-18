from __future__ import annotations

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from api.core.config import settings


class SchedulerManager:
    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler(
            jobstores={
                "default": SQLAlchemyJobStore(url=settings.sync_supabase_connection_string),
            }
        )

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def add_job(self, *args, **kwargs):
        kwargs.setdefault("max_instances", 1)
        return self.scheduler.add_job(*args, **kwargs)
