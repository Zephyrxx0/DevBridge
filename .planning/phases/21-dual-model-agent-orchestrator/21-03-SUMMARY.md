---
phase: 21-dual-model-agent-orchestrator
plan: 03
subsystem: api
tags: [langgraph, sse, fallback, nextjs, ui]
requires:
  - phase: 21-02
    provides: Big-model worker and fallback command path
provides:
  - LangGraph wired into /chat and /chat/stream runtime paths
  - SSE metadata packets with fallback flag updates
  - UI Fast Mode badge driven by metadata fallback state
affects: [chat-streaming, frontend-chat-ui, phase-22]
tech-stack:
  added: []
  patterns: [LangGraph astream_events v2 streaming, metadata-first SSE signaling]
key-files:
  created: [.planning/phases/21-dual-model-agent-orchestrator/21-03-SUMMARY.md]
  modified: [api/routes/chats.py, api/main.py, web/src/app/repo/[id]/page.tsx, api/agents/orchestrator.py]
key-decisions:
  - "Use graph.astream_events(version='v2') event stream and detect fallback from event payloads."
  - "Send metadata fallback=false first, then metadata fallback=true only on detected failover."
patterns-established:
  - "SSE control plane: metadata events for UX state, chunk events for token text"
requirements-completed: [FR-01]
duration: 31 min
completed: 2026-05-10
---

# Phase 21 Plan 03: SSE Integration & UI Signaling Summary

**LangGraph-driven SSE now emits fallback metadata and the chat UI renders Fast Mode badge when failover occurs.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-05-09T19:48:00Z
- **Completed:** 2026-05-09T20:19:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Replaced runtime chat invocation path to compiled LangGraph graph for both `/chat` and `/chat/stream`.
- Added SSE metadata signaling for fallback state transitions during stream execution.
- Updated Next.js chat page state/rendering to surface Fast Mode badge when metadata indicates fallback.

## Task Commits

Each task committed atomically:

1. **Task 1: Chat Route Integration (Backend)** - `0475614` (feat)
2. **Task 2: UI "Fast Mode" Badge (Frontend)** - `00a6d2d` (feat)
3. **Task 3: E2E Verification, Cleanup & Graph Update** - `6d626bc` (refactor)

## Files Created/Modified
- `api/routes/chats.py` - Added `stream_graph_events()` wrapper using `graph.astream_events(..., version="v2")`.
- `api/main.py` - Wired `/chat` and `/chat/stream` to LangGraph, metadata fallback signaling, chunk stream parsing.
- `web/src/app/repo/[id]/page.tsx` - Added `fallback` message flag, metadata handler, and Fast Mode badge UI.
- `api/agents/orchestrator.py` - Marked legacy compatibility status after runtime route migration to graph module.

## Decisions Made
- Keep legacy orchestrator module for compatibility with existing tests while moving live route execution to `api.agents.graph`.
- Use metadata event type as UX signal channel to avoid leaking internal errors in stream payloads.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Prevented internal error leakage on SSE control path**
- **Found during:** Task 1 (Chat Route Integration)
- **Issue:** Plan requires only fallback flag exposure across SSE trust boundary.
- **Fix:** Implemented metadata-only fallback signaling and retained generic stream error message.
- **Files modified:** `api/main.py`
- **Verification:** Stream code emits metadata packets and keeps error payload generic.
- **Committed in:** `0475614`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Security/correctness aligned with threat model. No scope creep.

## Issues Encountered
- `tests/test_phase21_sse.py` and `tests/test_phase21_e2e.py` remain skip-stub tests in repository baseline; execution verification completed but assertions are placeholders.

## Known Stubs
- `tests/test_phase21_sse.py:4` - test skipped with downstream-plan stub marker.
- `tests/test_phase21_e2e.py:4` - test skipped with downstream-plan stub marker.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 now has route-to-UI fallback propagation path complete.
- Ready for final phase closeout and downstream graph-dependent work.

## Self-Check: PASSED
- Found file: `.planning/phases/21-dual-model-agent-orchestrator/21-03-SUMMARY.md`
- Found commit: `0475614`
- Found commit: `00a6d2d`
- Found commit: `6d626bc`
