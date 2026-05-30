---
phase: 07-history-intent-ingestion
plan: 01
subsystem: api
tags: [history-ingestion, github-api, pgvector, orchestrator]
requires:
  - phase: 05-vector-indexing-hybrid-search
    provides: hybrid_search SQL + vector store runtime
  - phase: 06-basic-chat-interface-sse
    provides: orchestrator tool execution path
provides:
  - PR metadata ingestion with summary + embedding persistence
  - Commit-to-chunk linking via commit_sha and pr_number
  - Orchestrator history tools (search_pr_history, get_pr_detail)
affects: [phase-08-human-annotation-api, phase-09-collaborative-agents]
tech-stack:
  added: [GitHub REST API, VertexAIEmbeddings, ChatVertexAI]
  patterns: [async upsert with SQLAlchemy text, tool-level history augmentation]
key-files:
  created:
    - api/ingestion/history.py
    - api/db/models.py
    - tests/test_phase07_history_ingestion.py
    - tests/test_phase07_orchestrator_history.py
  modified:
    - sql/setup_vector_store.sql
    - api/db/vector_store.py
    - api/agents/orchestrator.py
key-decisions:
  - "Use GitHub API as canonical source for PR + commit history, with Secret Manager-first token resolution."
  - "Keep history augmentation optional in code_search via include_history to preserve existing response shape by default."
patterns-established:
  - "History ingest path: fetch -> sanitize -> summarize -> embed -> upsert"
  - "History retrieval path: semantic/file-path PR search + direct PR detail fetch"
requirements-completed: [FR-HIST-01, FR-HIST-02]
duration: 6m 6s
completed: 2026-04-25
---

# Phase 07 Plan 01: History & Intent Ingestion Summary

**History-intent foundation shipped: schema links from chunks to commits/PRs, PR metadata ingestion with embeddings/summaries, and orchestrator tools to retrieve PR context.**

## Performance

- **Duration:** 6m 6s
- **Started:** 2026-04-25T20:52:27Z
- **Completed:** 2026-04-25T20:58:34Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Extended `code_chunks` schema with `commit_sha` and `pr_number` and created `pull_requests` table + indexes.
- Implemented `api/ingestion/history.py` with GitHub PR/commit ingestion, PR summarization, and embedding generation.
- Added orchestrator history tools and optional metadata enrichment in `code_search`.

## Task Commits

1. **Task 1: Evolve Database Schema for History** - `90fef8a` (feat)
2. **Task 2: Implement History Ingestion Service** - `f43f78f` (feat)
3. **Task 3: Extend Orchestrator with History Tools** - `a117ef1` (feat)

## Files Created/Modified
- `sql/setup_vector_store.sql` - Added history columns, `pull_requests` table, and PR/chunk indexes.
- `api/ingestion/history.py` - Added PR metadata ingestion, commit history linking, summarization, embedding, and DB upserts.
- `api/db/vector_store.py` - Added PR semantic/file-path search, PR detail lookup, chunk history lookup.
- `api/agents/orchestrator.py` - Added `search_pr_history`, `get_pr_detail`, and optional `include_history` in `code_search`.
- `api/db/models.py` - Added typed history record dataclasses.
- `tests/test_phase07_history_ingestion.py` - Added ingestion contract tests.
- `tests/test_phase07_orchestrator_history.py` - Added orchestrator history tool tests.

## Decisions Made
- Chose Secret Manager-first token load for GitHub API access, with local env fallback for local test/dev continuity.
- Chose optional history expansion on existing `code_search` output instead of breaking default payload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing plan-referenced model module**
- **Found during:** Task 2
- **Issue:** `api/db/models.py` referenced by plan context but file absent.
- **Fix:** Added history record dataclasses for chunk-history and pull-request entities.
- **Files modified:** `api/db/models.py`
- **Verification:** Imported and exercised via new ingestion tests.
- **Committed in:** `f43f78f`

**2. [Rule 3 - Blocking] Added missing verification test suites**
- **Found during:** Task 2 and Task 3
- **Issue:** Plan verification targeted `tests/test_phase07_history_ingestion.py` and `tests/test_phase07_orchestrator_history.py`, both absent.
- **Fix:** Created both test files with async mocks for DB + tool contracts.
- **Files modified:** `tests/test_phase07_history_ingestion.py`, `tests/test_phase07_orchestrator_history.py`
- **Verification:** `5 passed` on targeted pytest run.
- **Committed in:** `f43f78f`, `a117ef1`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Deviations required to satisfy planned verification and complete implementation safely.

## Issues Encountered
- `DB_URL` not set in executor environment, so direct `psql` schema introspection step could not run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PR and commit context now persisted and queryable by tools.
- Phase 08 can attach human annotations to PR-aware chunk context without schema rework.

## Known Stubs
None.

## Self-Check: PASSED
- Verified required files exist.
- Verified task commit hashes exist in git history (`90fef8a`, `f43f78f`, `a117ef1`).
