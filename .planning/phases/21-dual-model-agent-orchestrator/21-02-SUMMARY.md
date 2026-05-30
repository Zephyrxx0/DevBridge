---
phase: 21-dual-model-agent-orchestrator
plan: 02
subsystem: api
tags: [langgraph, fallback, qwen, gemma, asyncio, memorysaver]

# Dependency graph
requires:
  - phase: 21-01
    provides: Fast router node, fast worker node, typed AgentState, model factory
provides:
  - Big model worker node with hard 120s timeout
  - Centralized fallback utility that routes to fast_worker
  - Fully assembled StateGraph with MemorySaver checkpointing
  - E2E tests for DEEP route and timeout failover behavior
affects: [phase-21-sse-signaling, chat-stream-fallback-badge, agent-routing]

# Tech tracking
tech-stack:
  added: [langgraph Command fallback utility]
  patterns: [supervisor routing, failover via Command goto, memory checkpoint compile]

key-files:
  created: [api/agents/nodes/big.py, api/agents/utils/fallback.py, tests/test_phase21_graph_e2e.py]
  modified: [api/agents/graph.py, tests/test_phase21_fallback.py]

key-decisions:
  - "Enforced fixed Big timeout as literal 120s to match D-04 acceptance constraint."
  - "Fallback messages omit exception details to avoid leaking internal failures across trust boundary."

patterns-established:
  - "Fallback Pattern: node returns Command(update={fallback: True}, goto='fast_worker')."
  - "Graph Pattern: compile StateGraph with MemorySaver for per-thread persistence."

requirements-completed: [MR-01, FR-01]

# Metrics
duration: 2 min
completed: 2026-05-10
---

# Phase 21 Plan 02: Big Model Integration & Fallback Summary

**Big-model deep-reasoning path now fails over safely to fast-model output with explicit fallback state signaling.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-10T01:39:59+05:30
- **Completed:** 2026-05-10T01:41:58+05:30
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `big_worker_node` using `get_model(is_fast=False)` and enforced `asyncio.wait_for(..., timeout=120)`.
- Added centralized fallback helper returning `Command(..., goto="fast_worker")` with `fallback=True` for UI signaling.
- Replaced graph placeholder wiring with real `big_worker_node`, and compiled graph with `MemorySaver` checkpointing.
- Added/updated tests for timeout fallback and graph-level DEEP routing + fallback behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Big Model Node & Timeout Fallback** - `6b23f90` (feat)
2. **Task 2: Complete Graph Assembly** - `588c22c` (feat)

## Files Created/Modified
- `api/agents/nodes/big.py` - Big worker with hard timeout and failover path.
- `api/agents/utils/fallback.py` - Shared fallback `Command` helper (`fallback=True`, `goto="fast_worker"`).
- `api/agents/graph.py` - Real big-worker wiring and `MemorySaver` compile.
- `tests/test_phase21_fallback.py` - Fallback behavior tests replacing stub.
- `tests/test_phase21_graph_e2e.py` - E2E graph tests for DEEP route and timeout fallback output.

## Decisions Made
- Kept Big timeout literal `120` in node call to satisfy hard acceptance requirement.
- Suppressed internal error details in fallback user-facing message per trust-boundary threat model.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added graph E2E test file for required verification command**
- **Found during:** Task 2
- **Issue:** Plan verification required `pytest tests/test_phase21_graph_e2e.py`, file absent.
- **Fix:** Created `tests/test_phase21_graph_e2e.py` with DEEP-route and timeout-fallback integration tests.
- **Files modified:** `tests/test_phase21_graph_e2e.py`
- **Verification:** `pytest tests/test_phase21_graph_e2e.py` passes.
- **Committed in:** `588c22c`

**2. [Rule 1 - Bug] Prevented internal error leakage in fallback path**
- **Found during:** Task 1
- **Issue:** Initial fallback message included exception text, violating threat model boundary.
- **Fix:** Removed raw exception details from user-visible fallback message.
- **Files modified:** `api/agents/utils/fallback.py`
- **Verification:** Fallback tests pass and `fallback=True` state preserved.
- **Committed in:** `6b23f90`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Tightened correctness and security. No scope creep.

## Known Stubs
None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 21-03 can consume `fallback=True` state and SSE metadata signaling path.
Runtime MI300X dual-model availability checks remain environment-dependent but code path and tests are complete.

---
*Phase: 21-dual-model-agent-orchestrator*
*Completed: 2026-05-10*

## Self-Check: PASSED
- FOUND: `.planning/phases/21-dual-model-agent-orchestrator/21-02-SUMMARY.md`
- FOUND commits: `6b23f90`, `588c22c`
