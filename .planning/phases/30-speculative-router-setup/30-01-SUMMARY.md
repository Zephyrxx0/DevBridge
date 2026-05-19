---
phase: 30-speculative-router-setup
plan: 01
subsystem: api
tags: [cascadeflow, pydantic, routing, pytest]
requires:
  - phase: 29-memory-storage-foundations
    provides: authenticated memory-aware agent graph baseline
provides:
  - Cascadeflow dependency pinned in API requirements
  - Pydantic-based speculative validation utility for fast-model drafts
  - Routing test scaffold for gemma path and escalation path
affects: [phase-30-plan-02, phase-30-plan-03, router, langgraph]
tech-stack:
  added: [cascadeflow[langchain]==1.1.0]
  patterns: [schema-first validation gate before escalation, metadata contract tests]
key-files:
  created: [api/agents/utils/validation.py, tests/test_phase30_routing.py]
  modified: [api/requirements.txt]
key-decisions:
  - "Keep validator compatible with cascadeflow export drift by dynamic result/base resolution."
  - "Scaffold tests encode future metadata contract (model_used/cascaded) even before router implementation."
patterns-established:
  - "Validation Pattern: Parse untrusted fast-model text into strict schema before accepting output."
  - "Escalation Contract Pattern: tests assert model_used + cascaded metadata for downstream SSE work."
requirements-completed: [ROUT-01]
duration: 1 min
completed: 2026-05-19
---

# Phase 30 Plan 01: Speculative Router Setup Summary

**Cascadeflow dependency plus Pydantic validator now ready for speculative fast-draft acceptance gate, with failing-forward routing scaffold tests for escalation metadata contract.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-20T01:37:43+05:30
- **Completed:** 2026-05-19T20:08:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `cascadeflow[langchain]==1.1.0` to API dependency set.
- Implemented `ValidationSchema` and `SchemaValidator` for schema/incomplete rejection path.
- Added routing scaffold tests covering gemma draft path and escalation fallback path with metadata assertions.

## Task Commits

1. **Task 1: Install dependencies and create validation schema** - `c2a4e3d` (feat)
2. **Task 2: Create test scaffold** - `aec3e72` (test)

## Files Created/Modified
- `api/requirements.txt` - adds cascadeflow runtime dependency.
- `api/agents/utils/validation.py` - schema + validator logic for speculative response checks.
- `tests/test_phase30_routing.py` - scaffold tests for no-escalation/escalation behavior and metadata contract.

## Decisions Made
- Used compatibility shim for cascadeflow validator/result exports because installed 1.1.0 package lacks direct `CustomValidator`/`CustomValidationResult` symbols.
- Kept test expectations for `model_used` and `cascaded` intentionally strict to drive plan 30-02 implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cascadeflow 1.1.0 export mismatch blocked validator import**
- **Found during:** Task 1 (Install dependencies and create validation schema)
- **Issue:** `from cascadeflow.quality import CustomValidationResult, CustomValidator` failed ImportError in installed package.
- **Fix:** Added compatibility resolution via `getattr` against `cascadeflow.quality` for validator base/result class while preserving plan contract behavior.
- **Files modified:** `api/agents/utils/validation.py`
- **Verification:** `python -c "from api.agents.utils.validation import SchemaValidator; print('Import OK')"`
- **Committed in:** `c2a4e3d`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. Fix required to make planned validator importable on actual library version.

## Issues Encountered
- `pytest tests/test_phase30_routing.py` returns 1 fail, 1 pass by design: gemma-path metadata assertions fail until speculative router implementation lands in plan 30-02.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for 30-02 implementation of cascade execution node and metadata propagation.
- Existing scaffold now provides immediate regression signal once router integration begins.

## Self-Check: PASSED

---
*Phase: 30-speculative-router-setup*
*Completed: 2026-05-19*
