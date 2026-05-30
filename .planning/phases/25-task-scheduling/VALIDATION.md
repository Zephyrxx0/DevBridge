# Phase 25: Task Scheduling - Validation Plan

**Phase Domain:** Background Task Orchestration & Distributed Locking
**Primary Framework:** APScheduler with SQLAlchemyJobStore
**Testing Framework:** `pytest`

## Validation Architecture

This phase uses an integration-heavy validation strategy. Since the core value is persistence and distributed safety, tests must verify interactions with the database and the concurrency behavior of the lock wrapper.

### Test Map: Requirements & Decisions

| ID | Goal | Test Type | Automated Command | Success Criteria |
|----|------|-----------|-------------------|------------------|
| **D-01** | **Persistence** | Integration | `pytest tests/test_jobs.py::test_job_persistence` | Job exists in `apscheduler_jobs` table after scheduler restart. |
| **D-02** | **Lifespan** | Smoke | `pytest tests/test_jobs.py::test_scheduler_startup` | Scheduler status is `RUNNING` after FastAPI app initialization. |
| **D-03** | **Locking** | Integration | `pytest tests/test_jobs.py::test_distributed_lock_concurrency` | Two concurrent attempts to run the same job result in only one execution; second returns `None`. |
| **D-04** | **Audit** | Unit | `pytest tests/test_jobs.py::test_job_history_logging` | Record created in `job_history` with `status='success'` after successful job completion. |
| **D-04** | **Retry** | Unit | `pytest tests/test_jobs.py::test_job_retry_logic` | Failed job increments retry count or logs failure correctly in history. |
| **D-05** | **Reports Hub** | Integration | `pytest tests/test_jobs.py::test_reports_hub_storage` | Generated report file is readable via the Reports Hub API/Module. |
| **D-06** | **Sync Job** | Integration | `pytest tests/test_jobs.py::test_sync_job_github_and_docs` | Job fetches data from both GitHub and external documentation sources (e.g., URL crawl). |
| **D-06** | **Cleanup Job** | Integration | `pytest tests/test_jobs.py::test_cleanup_job_gcs_and_local` | Temporary files in GCS and local repo cache are removed according to retention policy. |
| **D-06** | **Metrics Job** | Integration | `pytest tests/test_jobs.py::test_metrics_collection` | Usage statistics are aggregated and stored in the database. |
| **D-06** | **Weekly Rpt** | Integration | `pytest tests/test_jobs.py::test_weekly_report_generation` | Job generates a summary of the past 7 days of activity into a markdown/JSON file. |
| **FR-05**| **Scheduling** | Integration | `pytest tests/test_jobs.py::test_cron_trigger_config` | Jobs are registered with the correct cron intervals from `config.py`. |
| **FR-06**| **Dashboard** | Integration | `pytest tests/test_jobs.py::test_admin_manual_trigger` | Admin API endpoint successfully triggers a job execution manually. |

## Implementation Details for Tests

### Locking Verification (D-03)
Tests for distributed locking must simulate two processes. Since `pytest` runs in a single process usually, we use `threading` or `multiprocessing` to attempt overlapping calls to the `run_with_lock` wrapper.
```python
# Expected logic in tests/test_jobs.py
async def test_distributed_lock_concurrency():
    # Attempt 1: Gets lock
    # Attempt 2: Should immediately fail to get lock (returns None)
    results = await asyncio.gather(
        run_with_lock(conn1, "test_job", slow_func),
        run_with_lock(conn2, "test_job", slow_func)
    )
    assert any(r is None for r in results)
```

### Scope Expansion: GCS Cleanup (D-06)
Verification must ensure that the cleanup job targets both `memories/repo` (local) and `gs://<bucket>/temp` (remote).
```bash
# Verify GCS cleanup logic
pytest tests/test_jobs.py::test_cleanup_job_gcs_and_local
```

### Scope Expansion: External Docs (D-06)
Verification must verify that the sync job iterates over configured external documentation URLs, not just GitHub repositories.
```bash
# Verify external docs sync
pytest tests/test_jobs.py::test_sync_job_github_and_docs
```

## Success Gate
All tests listed above must pass in a local environment with a Postgres instance available. The `job_history` table must be inspected post-test to ensure all audit logs were captured accurately.

**Full Suite Command:**
```bash
pytest tests/test_jobs.py -v
```
