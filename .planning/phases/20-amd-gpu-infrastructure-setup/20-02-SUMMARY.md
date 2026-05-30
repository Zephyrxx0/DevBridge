---
phase: 20-amd-gpu-infrastructure-setup
plan: 02
subsystem: infra
tags: [docker, vllm, huggingface, cache, rocm]
requires:
  - phase: 20-01
    provides: VRAM partitioning and model serving baseline
provides:
  - Persistent host-mounted HuggingFace cache volumes per model container
  - Host UID/GID container mapping for cache directory permission safety
  - Manual pre-download script for model weights into isolated caches
affects: [phase-21-dual-model-orchestrator, phase-25-task-scheduling]
tech-stack:
  added: []
  patterns: [isolated HF_HOME cache directories, pre-warm model cache before vLLM startup]
key-files:
  created: [scripts/download_models.sh]
  modified: [docker-compose.yml]
key-decisions:
  - "Keep Qwen and Gemma cache roots isolated under /app/repo_cache to avoid lock contention."
  - "Run vLLM containers with host UID/GID mapping via docker-compose user field."
patterns-established:
  - "Model cache persistence: bind mount host cache path to /root/.cache/huggingface per service."
  - "Startup reliability: pre-download heavy model weights with a dedicated script before compose up."
requirements-completed: [IR-02]
duration: 2 min
completed: 2026-05-09
---

# Phase 20 Plan 02: Docker cache persistence and model prewarm Summary

**Persistent per-model HuggingFace cache mounts plus explicit pre-download workflow prevent startup-time weight fetch failures and cross-container cache contention.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-09T18:39:00Z
- **Completed:** 2026-05-09T18:40:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added host bind mounts for both vLLM services to persist model caches under `/app/repo_cache`.
- Added host UID/GID user mapping on both services to reduce host-side permission friction.
- Added executable `scripts/download_models.sh` to pre-download Qwen and Gemma weights into isolated cache directories.

## Task Commits

Each task was committed atomically:

1. **Task 1: Docker Volume Cache Binding** - `d7f03e2` (feat)
2. **Task 2: Model Pre-download Script** - `0bf9d94` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `docker-compose.yml` - Added `user` mapping and per-service HuggingFace cache bind mounts.
- `scripts/download_models.sh` - Added executable cache warm-up script with explicit HF_HOME targets and model downloads.

## Decisions Made
- None - followed plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Windows shell lacked chmod command**
- **Found during:** Task 2 (Model Pre-download Script)
- **Issue:** `chmod +x` failed in PowerShell environment.
- **Fix:** Applied executable bit with `git update-index --chmod=+x` after staging file.
- **Files modified:** `scripts/download_models.sh` (mode)
- **Verification:** Commit recorded file mode `100755`; syntax check via `bash -n` passed.
- **Committed in:** `0bf9d94` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope change. Fix required only for cross-shell execution compatibility.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 20 cache persistence and prewarm path ready for dual-model routing work in Phase 21.
No blockers from this plan.

## Self-Check: PASSED
- Found summary file: `.planning/phases/20-amd-gpu-infrastructure-setup/20-02-SUMMARY.md`
- Found task commit: `d7f03e2`
- Found task commit: `0bf9d94`

---
*Phase: 20-amd-gpu-infrastructure-setup*
*Completed: 2026-05-09*
