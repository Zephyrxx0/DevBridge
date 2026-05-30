---
phase: 24-GitHub-Integration
plan: 01
subsystem: database
tags: [github, supabase, pgvector, rpc, oauth]

requires:
  - phase: 24-GitHub-Integration
    provides: D-01 RPC token access decision and D-02 issue storage schema decision
provides:
  - GitHub issues storage table with VECTOR(768) embeddings
  - SECURITY DEFINER RPC for per-user GitHub provider token retrieval
  - Backend secret resolver path for user-scoped token lookup with env fallback
affects: [github-sync, issue-mapping, scheduler]

tech-stack:
  added: []
  patterns: [Postgres SECURITY DEFINER RPC, async SQL execution via SQLAlchemy engine]

key-files:
  created: [sql/migrations/0029_add_github_issues_and_rpc.sql]
  modified: [api/db/models.py, api/core/secrets.py]

key-decisions:
  - "Use SECURITY DEFINER RPC instead of direct auth.identities reads from app code"
  - "Store GitHub issues in dedicated repo_github_issues table separated from code_chunks"

patterns-established:
  - "Token retrieval pattern: user_id -> RPC -> fallback env token"

requirements-completed: [FR-04]

duration: 16 min
completed: 2026-05-11
---

# Phase 24 Plan 01: GitHub storage schema + secure token RPC Summary

**GitHub issue storage added with VECTOR(768) embeddings plus secure per-user Supabase token retrieval via SECURITY DEFINER RPC.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11T00:16:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added migration creating `repo_github_issues` with unique `(repo_id, issue_number)` and vector index.
- Added `get_github_token_for_user(user_uuid UUID)` RPC using `SECURITY DEFINER` and revoked public execute.
- Refactored secret resolution to support user-scoped RPC token fetch with `GITHUB_TOKEN` fallback.

## Task Commits

Each task committed atomically:

1. **Task 1: Create DB Migration for Issues and RPC** - `b2d122c` (feat)
2. **Task 2: Update DB Models** - `19c6492` (feat)
3. **Task 3: Refactor Secrets Manager for Token Retrieval** - `c8fefd0` (feat)

**Plan metadata:** pending in this commit

## Files Created/Modified
- `sql/migrations/0029_add_github_issues_and_rpc.sql` - Defines issue table, indexes, and secure token RPC.
- `api/db/models.py` - Adds `RepoGithubIssue` model.
- `api/core/secrets.py` - Adds optional `user_id` token path using DB RPC.

## Decisions Made
- Kept RPC in public namespace with restricted execute permissions for compatibility and controlled access.
- Enforced search path in function definition to reduce definer-function privilege abuse surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Restricted RPC execution permissions**
- **Found during:** Task 1 (Create DB Migration for Issues and RPC)
- **Issue:** SECURITY DEFINER function without execute restrictions could expose privileged token lookup broadly.
- **Fix:** Added `REVOKE ALL ON FUNCTION get_github_token_for_user(UUID) FROM PUBLIC`.
- **Files modified:** sql/migrations/0029_add_github_issues_and_rpc.sql
- **Verification:** Migration contains revoke statement tied to function signature.
- **Committed in:** b2d122c

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Security hardening only. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Ready for next GitHub integration plans (sync + mapping). Core token access path and issue storage schema now available.

## Known Stubs
None.

## Self-Check: PASSED
- Found: `.planning/phases/24-GitHub-Integration/24-01-SUMMARY.md`
- Found commit: `b2d122c`
- Found commit: `19c6492`
- Found commit: `c8fefd0`

---
*Phase: 24-GitHub-Integration*
*Completed: 2026-05-11*
