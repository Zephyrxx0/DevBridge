---
phase: 30-speculative-router-setup
plan: 02
subsystem: api
tags: [cascadeflow, langgraph, routing, validation, retries]
requires:
  - phase: 30-speculative-router-setup-01
    provides: validator shim, routing scaffold tests, cascadeflow dependency
provides:
  - Cascade routing node using CascadeAgent with metadata propagation
  - AgentState routing metadata fields for downstream UX
  - Big-model ModelConfig retry/rate-limit hints for ROUT-02 handling
affects: [phase-30-plan-03, phase-32-streaming-escalation-ux, sse-metadata]
tech-stack:
  added: []
  patterns: [speculative-node metadata contract, compatibility-safe validation result mapping]
key-files:
  created: [api/agents/nodes/cascade.py]
  modified: [api/agents/state.py, api/agents/utils/validation.py, tests/test_phase30_routing.py]
key-decisions:
  - "Use CascadeAgent result metadata (model_used/cascaded) as canonical state update source."
  - "Keep SchemaValidator result construction signature-adaptive to cascadeflow ValidationResult drift."
patterns-established:
  - "Routing Metadata Pattern: every speculative turn returns model_used + cascaded for UI and telemetry."
  - "Compatibility Pattern: inspect constructor signatures before instantiating cross-version result objects."
requirements-completed: [ROUT-01, ROUT-02]
duration: 5 min
completed: 2026-05-19
---

# Phase 30 Plan 02: Speculative Router Setup Summary

**Cascadeflow speculative router node now returns validated response plus `model_used` and `cascaded` metadata, with big-model retry/rate-limit hints in ModelConfig for escalation-safe routing.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-19T20:11:30Z
- **Completed:** 2026-05-19T20:16:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended `AgentState` with `model_used` and `cascaded` fields.
- Implemented `api/agents/nodes/cascade.py` with `CascadeAgent`, `ModelConfig`, and `SchemaValidator` wiring.
- Updated routing tests to execute `cascade_node` and assert gemma-path/escalation-path metadata behavior.
- Hardened validation result object construction to support cascadeflow 1.1.0 signature differences.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update AgentState** - `92ffe31` (feat)
2. **Task 2: Implement cascade node with rate-limiting** - `c171b8b` (feat)

## Files Created/Modified
- `api/agents/state.py` - adds `model_used` and `cascaded` to agent state contract.
- `api/agents/nodes/cascade.py` - adds speculative cascade node with metadata return.
- `api/agents/utils/validation.py` - adapts ValidationResult construction for installed cascadeflow API shape.
- `tests/test_phase30_routing.py` - verifies gemma path and escalation path metadata from cascade node.

## Decisions Made
- Used `ModelConfig(..., extra/http_config)` hints on big model for retry/rate-limit handling to satisfy ROUT-02 resilience requirement without introducing custom infra.
- Used dynamic result signature inspection in `SchemaValidator` to keep compatibility with cascadeflow API drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ModelConfig provider rejected `google` value in installed cascadeflow**
- **Found during:** Task 2 (Implement cascade node with rate-limiting)
- **Issue:** `ModelConfig(provider="google")` failed validation; accepted providers exclude `google` in installed package.
- **Fix:** Switched provider to `openai` shim expected by cascadeflow package behavior.
- **Files modified:** `api/agents/nodes/cascade.py`
- **Verification:** `pytest tests/test_phase30_routing.py` passes.
- **Committed in:** `c171b8b`

**2. [Rule 3 - Blocking] ValidationResult constructor mismatch blocked schema validation path**
- **Found during:** Task 2 (Implement cascade node with rate-limiting)
- **Issue:** `ValidationResult` required `checks` and `details` fields in this installed cascadeflow version.
- **Fix:** Added signature-adaptive constructor helper in `SchemaValidator` to populate required fields conditionally.
- **Files modified:** `api/agents/utils/validation.py`
- **Verification:** `pytest tests/test_phase30_routing.py` passes.
- **Committed in:** `c171b8b`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes required for runtime compatibility and did not expand scope.

## Known Stubs
None.

## Issues Encountered
- None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cascade node and metadata contract ready for graph integration in 30-03.
- ROUT-02 validation/escalation behavior covered by passing routing tests.

## Self-Check: PASSED

---
*Phase: 30-speculative-router-setup*
*Completed: 2026-05-19*
