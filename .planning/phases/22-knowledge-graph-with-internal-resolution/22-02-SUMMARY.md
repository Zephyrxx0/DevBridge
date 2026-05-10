---
phase: 22-knowledge-graph-with-internal-resolution
plan: 02
subsystem: api
tags: [tree-sitter, graph, ingestion, fastapi, sqlalchemy]
requires:
  - phase: 22-knowledge-graph-with-internal-resolution
    provides: repo_graph storage manager and schema from plan 22-01
provides:
  - two-pass graph builder with global symbol discovery and relationship resolution
  - D-01-compliant graph output (file and shadow nodes only; IMPORTS/CALLS only)
  - ingestion pipeline hook that builds/saves graph by UUID repo_id
affects: [knowledge-graph, ingestion, reasoning]
tech-stack:
  added: []
  patterns: [two-pass symbol resolution, non-fatal graph build integration, file-size parse cap]
key-files:
  created:
    - api/ingestion/graph_builder.py
    - tests/test_phase22_extraction.py
    - tests/test_phase22_resolution.py
    - tests/test_phase22_integration.py
  modified:
    - api/routes/repo.py
key-decisions:
  - "Resolve internal relationships via symbol map first, then emit file-level edges only"
  - "Keep graph build failure non-fatal to preserve ingestion completion semantics"
patterns-established:
  - "Graph extraction uses Tree-sitter queries with QueryCursor capture traversal"
  - "Threat mitigation T-22-03 applied by skipping files larger than MAX_PARSE_BYTES"
requirements-completed: [FR-02]
duration: 12 min
completed: 2026-05-10
---

# Phase 22 Plan 02: Internal Resolution Summary

**Tree-sitter two-pass graph extraction shipped with internal symbol-to-file resolution, D-01 file/shadow-only nodes, and automatic ingestion-time graph persistence by UUID repo_id.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-10T20:52:18+05:30
- **Completed:** 2026-05-10T21:04:20+05:30
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Implemented `GraphBuilder.discover_symbols()` for Python/TypeScript export discovery.
- Implemented `resolve_relationships()` and `build_graph()` with only `IMPORTS`/`CALLS` edges and file/shadow nodes.
- Integrated graph build/save into `_run_ingestion` with UUID `repo_id` and non-fatal error handling.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Pass 1 - Global Symbol Discovery** - `a6b2f34` (feat)
2. **Task 2: Implement Pass 2 - Relationship Extraction and Resolution** - `6941803` (feat)
3. **Task 3: Integrate graph building into ingestion pipeline** - `8ba71de` (feat)

**Plan metadata:** `pending` (docs)

## Files Created/Modified
- `api/ingestion/graph_builder.py` - new two-pass graph extraction/resolution engine.
- `api/routes/repo.py` - ingestion hook for graph build/save after chunk ingestion.
- `tests/test_phase22_extraction.py` - validates symbol discovery map.
- `tests/test_phase22_resolution.py` - validates D-01-compliant nodes/edges and shadow behavior.
- `tests/test_phase22_integration.py` - validates ingestion hook and non-fatal graph failure behavior.

## Decisions Made
- Keep graph relationships coarse at file level even when symbol map exists, satisfying D-01.
- Use shadow nodes only for blessed libraries; drop all other unresolved externals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tree-sitter query API mismatch (`Query.captures` not available)**
- **Found during:** Task 1 (symbol discovery verification)
- **Issue:** Initial query implementation used `Query.captures`, which is unavailable in installed Tree-sitter runtime.
- **Fix:** Switched to `QueryCursor(query).captures(root_node)` for all query extraction paths.
- **Files modified:** `api/ingestion/graph_builder.py`
- **Verification:** `python -m pytest tests/test_phase22_extraction.py`
- **Committed in:** `a6b2f34`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. Fix required for functional Tree-sitter extraction.

## Issues Encountered
- `pytest tests/test_phase22_*.py` wildcard does not expand in PowerShell context; used explicit file list instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 graph extraction/resolution now wired to ingestion and validated by targeted tests.
- Ready for phase-level verification and downstream graph consumption features.

## Known Stubs
None.

## Self-Check: PASSED
- Found file: .planning/phases/22-knowledge-graph-with-internal-resolution/22-02-SUMMARY.md
- Found commits: a6b2f34, 6941803, 8ba71de
