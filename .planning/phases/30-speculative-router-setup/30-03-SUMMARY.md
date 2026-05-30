---
phase: 30-speculative-router-setup
plan: 03
subsystem: api
tags: [langgraph, cascadeflow, routing, metadata, hindsight]
requires:
  - phase: 30-speculative-router-setup-02
    provides: cascade_node implementation and routing metadata contract
provides:
  - LangGraph workflow migrated from router/worker topology to cascade node topology
  - Recall/cascade/retain path wiring for speculative routing default flow
  - Explicit metadata-presence assertions for model_used and cascaded in phase-30 tests
affects: [phase-32-streaming-escalation-ux, agent-routing, telemetry]
tech-stack:
  added: []
  patterns: [single-hop cascade routing graph, state metadata propagation contract]
key-files:
  created: []
  modified: [api/agents/graph.py, tests/test_phase30_routing.py]
key-decisions:
  - "Retire router/fast_worker/big_worker graph nodes and delegate routing entirely to cascade_node."
  - "Strengthen test oracle by requiring model_used and cascaded keys to exist in cascade output."
patterns-established:
  - "Graph Simplification Pattern: START -> recall -> cascade -> retain -> END."
  - "Metadata Contract Pattern: routing outputs always include model_used and cascaded keys."
requirements-completed: [ROUT-01, ROUT-02]
duration: 1 min
completed: 2026-05-19
---

# Phase 30 Plan 03: Speculative Router Setup Summary

**LangGraph now runs speculative routing through a single cascade node path with routing metadata preserved to final state.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-20T01:49:40+05:30
- **Completed:** 2026-05-20T01:50:37+05:30
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewired agent graph to remove legacy router and worker nodes.
- Connected recall directly to cascade node and cascade to retain.
- Re-ran routing + E2E tests to validate speculative flow behavior.
- Added explicit metadata key-presence assertions in phase-30 routing tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update LangGraph wiring** - `1f606b6` (feat)
2. **Task 2: Final verification** - `a7ed29f` (test)

## Files Created/Modified
- `api/agents/graph.py` - swaps legacy router/worker nodes for `cascade_node` and updates edges.
- `tests/test_phase30_routing.py` - asserts `model_used` and `cascaded` keys are present in final output.

## Decisions Made
- Removed conditional router edges and made cascade node sole routing decision point, aligned with D-30-02 intent.
- Kept metadata checks in test layer to guard Phase 32 SSE/UI dependency on these fields.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 30 graph integration complete.
- Phase 32 can consume stable `model_used`/`cascaded` metadata from agent outputs.

## Self-Check: PASSED

---
*Phase: 30-speculative-router-setup*
*Completed: 2026-05-19*
