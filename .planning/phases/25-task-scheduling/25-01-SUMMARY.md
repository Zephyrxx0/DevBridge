---
phase: 25-task-scheduling
plan: 01
subsystem: api
tags: [apscheduler, postgres, advisory-lock, job-history, retry]
requires:
  - phase: 24-GitHub-Integration
    provides: OAuth-scoped GitHub sync data path reused by scheduled jobs
provides:
  - Persistent scheduler manager wired to FastAPI lifespan
  - DB advisory-lock decorator for multi-instance single-run behavior
  - Job audit decorators writing running/success/failed records to job_history
affects: [25-02-PLAN, reports-hub, scheduled-jobs]
tech-stack:
  added: [none]
  patterns: [SchedulerManager lifecycle wrapper, advisory xact lock decorator, retry with exponential backoff]
key-files:
  created: [sql/migrations/0030_add_job_history_table.sql, api/jobs/base.py, api/core/scheduler.py, tests/test_jobs.py]
  modified: [api/core/config.py, api/db/session.py, api/main.py, apply_migration.py]
key-decisions:
  - "Use postgresql+psycopg normalized sync URL for SQLAlchemyJobStore while async runtime keeps asyncpg"
  - "Enforce max_instances=1 default at scheduler manager add_job boundary"
patterns-established:
  - "Decorator stack for jobs: lock + audit + retry"
  - "FastAPI lifespan owns scheduler startup/shutdown"
requirements-completed: [FR-05, FR-06]
duration: 51 min
completed: 2026-05-16
---

# Phase 25 Plan 01: Task Scheduling Infrastructure Summary

**Persistent APScheduler foundation shipped with Postgres job history, advisory locking, and retry-safe job wrappers for multi-instance execution.**

## Performance

- **Duration:** 51 min
- **Started:** 2026-05-16T15:25:00Z
- **Completed:** 2026-05-16T16:16:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Added migration `0030` for `job_history` audit persistence with status + timing columns.
- Added sync connection normalization path and scheduler-safe config property.
- Implemented distributed lock, job audit, retry decorators, and scheduler lifecycle manager integrated in FastAPI lifespan.
- Added focused tests covering lock gate, retry flow, scheduler startup, and add_job max_instances default.

## Task Commits

1. **Task 1: Database Migration for Job History** - `687d570` (feat)
2. **Task 2: Sync Connection String & Locking Utilities with Retry Policy** - `7b4d20d` (feat)
3. **Task 3: Scheduler Lifecycle Integration** - `b22a2ad` (feat)

## Files Created/Modified
- `sql/migrations/0030_add_job_history_table.sql` - Job execution audit table + index.
- `api/jobs/base.py` - `with_distributed_lock`, `job_audit`, `with_retry` decorators.
- `api/core/scheduler.py` - `SchedulerManager` with persistent SQLAlchemyJobStore.
- `api/core/config.py` - `sync_supabase_connection_string` property.
- `api/db/session.py` - `normalize_sync_url()` helper for sync job store driver.
- `api/main.py` - Lifespan moved from inline scheduler to `SchedulerManager`.
- `tests/test_jobs.py` - New task-scheduling tests.
- `apply_migration.py` - Migration runner hardened to process migration files consistently.

## Decisions Made
- Keep job storage persistent via sync psycopg URL while preserving asyncpg for API runtime DB usage.
- Set scheduler-level `max_instances=1` default to mitigate pile-up/DoS risk from duplicate trigger overlap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed migration runner hardcoded SQL file and multi-statement execution**
- **Found during:** Task 1
- **Issue:** `apply_migration.py` only executed migration 0014 and failed on multi-command SQL files.
- **Fix:** Updated runner to iterate migration files and split SQL into executable statements.
- **Files modified:** `apply_migration.py`
- **Verification:** `python apply_migration.py` progressed to DB duplicate-object boundary instead of parser failure.
- **Committed in:** `687d570`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to keep migration path functional for new scheduling schema.

## Issues Encountered
- Existing migration stack is not idempotent (duplicate table errors on rerun). New migration validated by structure/tests, but full replay of all historical SQL still fails on pre-existing tables.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 25-02 can now attach concrete jobs to scheduler manager and reuse lock/audit/retry decorators.
- Persistent infrastructure and lifecycle hooks in place for daily jobs + reports.

## Self-Check: PASSED

---
*Phase: 25-task-scheduling*
*Completed: 2026-05-16*
