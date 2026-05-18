from __future__ import annotations

import asyncio
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path

from api.core.config import settings
from api.jobs.base import job_audit, with_distributed_lock


@job_audit("cache_cleanup")
@with_distributed_lock("cache_cleanup")
async def cleanup_job() -> dict[str, int]:
    cutoff_repo = datetime.now(UTC) - timedelta(days=7)
    cutoff_gcs = datetime.now(UTC) - timedelta(hours=24)
    local_deleted = 0
    gcs_deleted = 0

    cache_dir = Path(settings.repo_cache_dir)
    if cache_dir.exists():
        for child in cache_dir.iterdir():
            if not child.is_dir():
                continue
            last_access = datetime.fromtimestamp(child.stat().st_atime, tz=UTC)
            if last_access < cutoff_repo:
                await asyncio.to_thread(shutil.rmtree, child, True)
                local_deleted += 1

    if settings.gcs_bucket_name:
        try:
            from google.cloud import storage

            client = storage.Client()
            bucket = client.bucket(settings.gcs_bucket_name)
            blobs = bucket.list_blobs(prefix="temp/")
            for blob in blobs:
                updated = blob.updated
                if updated is None:
                    continue
                ts = updated if updated.tzinfo else updated.replace(tzinfo=UTC)
                if ts < cutoff_gcs:
                    blob.delete()
                    gcs_deleted += 1
        except Exception:
            # best-effort cleanup; local cache cleanup still succeeds
            pass

    return {"local_deleted": local_deleted, "gcs_deleted": gcs_deleted}
