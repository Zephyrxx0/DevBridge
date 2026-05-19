---
phase: 25-task-scheduling
plan: 02
subsystem: api
tags: [apscheduler, admin-api, gemma-4, reports, gcs]
requires:
  - phase: 25-task-scheduling-01
    provides: scheduler foundation, job audit, distributed lock
provides:
  - Daily sync job for GitHub issues and external docs
  - Cache cleanup for repo cache and GCS temp objects
  - Daily metrics job + daily/weekly report generation
  - Secured admin endpoints for job history, trigger, and reports
affects: [admin-dashboard, task-scheduling, observability]
tech-stack:
  added: [none]
  patterns: [job wrappers with audit/lock/retry, report file hub, header-token admin auth]
key-files:
  created: [api/jobs/sync.py, api/jobs/cleanup.py, api/jobs/metrics.py, api/jobs/reports.py, api/reports/hub.py, api/reports/generator.py, api/routes/admin.py]
  modified: [api/main.py, api/core/config.py, docker-compose.yml, tests/test_jobs.py]
key-decisions:
  - "Admin routes require INTERNAL_AUTH_TOKEN via X-Internal-Auth header"
  - "Manual job trigger protected with in-process rate limit"
  - "Reports persisted under /app/reports via ReportsHub"
patterns-established:
  - "Scheduled jobs return lightweight metrics dicts for auditability"
  - "Report retrieval sanitizes filenames to block path traversal"
requirements-completed: [FR-05, FR-06]
duration: 2 min
completed: 2026-05-16
---

# Phase 25 Plan 02: Core Jobs + Reports Hub Summary

**Daily sync/cleanup/metrics jobs + Gemma-based report generation + secured admin visibility endpoints shipped.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-16T14:40:54Z
- **Completed:** 2026-05-16T14:42:39Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Added core job inventory: sync (GitHub + external docs), cleanup (local + GCS), metrics (24h usage).
- Added ReportsHub and daily/weekly intelligence report generation flow with Gemma/Vertex attempt + fallback.
- Wired scheduler registration in lifespan and added secured admin APIs for history/manual trigger/report access.

## Task Commits

1. **Task 1: Core Job Implementation (Sync & Cleanup Expansion)** - `669e089` (feat)
2. **Task 2: Reports Hub & Daily/Weekly AI Summaries** - `23274db` (feat)
3. **Task 3: Admin API, Registration & Graphify Update** - `d605340` (feat)

## Files Created/Modified
- `api/jobs/sync.py` - GitHub + external docs sync job with retry/lock/audit.
- `api/jobs/cleanup.py` - stale repo cache and GCS temp cleanup.
- `api/jobs/metrics.py` - daily usage counters from questions/chat_messages.
- `api/jobs/reports.py` - daily/weekly report scheduled wrappers.
- `api/reports/hub.py` - report persistence and retrieval abstraction.
- `api/reports/generator.py` - daily/weekly intelligence report generation.
- `api/routes/admin.py` - secured admin endpoints.
- `api/main.py` - scheduler + router wiring.
- `docker-compose.yml` - persistent `/app/reports` volume.
- `tests/test_jobs.py` - task-level verification coverage.

## Decisions Made
- Token-gated admin endpoints with `X-Internal-Auth`.
- Filename sanitization enforced with basename check for report fetch.
- Manual trigger throttled (5 requests/min/job) to mitigate trigger spam risk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added admin auth + path traversal guard + trigger rate limit**
- **Found during:** Task 3
- **Issue:** Plan requested admin APIs; threat model required protections but endpoints did not exist.
- **Fix:** Added INTERNAL_AUTH_TOKEN check, filename sanitization, and trigger rate limiting.
- **Files modified:** `api/routes/admin.py`
- **Verification:** `pytest tests/test_jobs.py::test_admin_manual_trigger`
- **Committed in:** `d605340`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Security posture improved to match threat register. No feature scope creep.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-admin-endpoints | api/routes/admin.py | New trust boundary for manual job execution and report file access; mitigated with token auth + filename sanitization + rate limit. |

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Ready for next plan in phase. Scheduler and report/admin surfaces now available for integration verification.

## Self-Check: PASSED
- SUMMARY file exists: `.planning/phases/25-task-scheduling/25-02-SUMMARY.md`
- Commit exists: `669e089`
- Commit exists: `23274db`
- Commit exists: `d605340`
