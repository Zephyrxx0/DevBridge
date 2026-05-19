---
phase: 30-speculative-router-setup
plan: 04
subsystem: api
tags: [cascadeflow, validation, escalation, routing, pytest]
requires:
  - phase: 30-speculative-router-setup-03
    provides: cascade-node graph wiring and routing metadata contract
provides:
  - Real second-pass response replacement on schema validation failure
  - Validator-wired cascade agent wrapper compatible with cascadeflow 1.1.0
  - Escalation-focused routing tests verifying big-model content output
affects: [phase-32-streaming-escalation-ux, agent-routing, verification]
tech-stack:
  added: []
  patterns: [validator-gated rerun on invalid draft, escalation-result content assertion]
key-files:
  created: [.planning/phases/30-speculative-router-setup/30-04-SUMMARY.md]
  modified: [api/agents/nodes/cascade.py, tests/test_phase30_routing.py]
key-decisions:
  - "Wrap CascadeAgent with ValidatorCascadeAgent because cascadeflow 1.1.0 lacks constructor validators support."
  - "Use force_direct rerun on failed schema validation to guarantee full-turn big-model replacement."
patterns-established:
  - "Escalation Correctness Pattern: invalid draft must trigger rerun and replace final response content."
  - "Test Oracle Pattern: assert escalated message content, model_used, and cascaded state together."
requirements-completed: [ROUT-01, ROUT-02]
duration: 18 min
completed: 2026-05-20
---

# Phase 30 Plan 04: Speculative Router Setup Summary

**Schema validation now triggers real big-model rerun with final content replacement, not metadata-only escalation.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-20T06:24:00Z
- **Completed:** 2026-05-20T06:42:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced metadata-only fallback with real second-pass execution path when schema validation fails.
- Wired validator list into cascade runtime wrapper and removed manual invalid-response flag patch.
- Rebuilt routing tests to verify escalated content comes from big-model path.
- Kept gemma fast-path test coverage while adding stronger escalation assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire native validator and implement real escalation** - `ef8afff` (fix)
2. **Task 2: Implement robust escalation tests** - `72bda0e` (test)

## Files Created/Modified
- `api/agents/nodes/cascade.py` - adds `ValidatorCascadeAgent`, wires `validators=[_schema_validator]`, removes metadata-only fallback block.
- `tests/test_phase30_routing.py` - replaces weak monkeypatch tests with escalation simulation and output replacement assertions.

## Decisions Made
- Used compatibility wrapper instead of direct `CascadeAgent(validators=...)` since installed cascadeflow API does not accept validators in constructor.
- Kept escalation logic inside cascade runtime wrapper so `cascade_node` remains simple result consumer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cascadeflow constructor API drift blocked direct validator wiring**
- **Found during:** Task 1 (Wire native validator and implement real escalation)
- **Issue:** Installed `cascadeflow==1.1.0` `CascadeAgent.__init__` has no `validators` parameter, so plan’s direct constructor wiring fails.
- **Fix:** Implemented `ValidatorCascadeAgent` wrapper that accepts `validators=[_schema_validator]`, runs first pass, validates output, and reruns with `force_direct=True` on failure.
- **Files modified:** `api/agents/nodes/cascade.py`
- **Verification:** `python -c "import inspect; from cascadeflow import CascadeAgent; print(inspect.signature(CascadeAgent.__init__))"` plus `pytest tests/test_phase30_routing.py`
- **Committed in:** `ef8afff`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. Change preserves plan intent and closes escalation correctness gap under current library API.

## Known Stubs
None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 30 escalation blocker closed with executable rerun behavior.
- Verification evidence now checks output replacement, reducing false positives for ROUT-01.

## Self-Check: PASSED

---
*Phase: 30-speculative-router-setup*
*Completed: 2026-05-20*
