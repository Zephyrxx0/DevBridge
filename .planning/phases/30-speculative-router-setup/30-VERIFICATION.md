---
phase: 30-speculative-router-setup
verified: 2026-05-20T00:00:00Z
status: gaps_found
score: 6/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "System automatically escalates entire conversation turns to the big model (Gemini 2.5 Flash) on validation failure"
    status: failed
    reason: "cascade_node validates after cascade_agent.run but does not re-run the turn with big model when validation fails; it only flips metadata flags."
    artifacts:
      - path: "api/agents/nodes/cascade.py"
        issue: "Lines 55-58 set model_used/cascaded fallback without invoking big model; final response remains original possibly invalid output."
    missing:
      - "On failed validation, execute full-turn escalation through big model and replace final_response with big-model output."
      - "Wire SchemaValidator into CascadeAgent validators (or equivalent) so escalation is triggered by validation gate, not metadata patching."
---

# Phase 30: Speculative Router Setup Verification Report

**Phase Goal:** System dynamically routes to the large model only when necessary to preserve GPU VRAM  
**Verified:** 2026-05-20T00:00:00Z  
**Status:** gaps_found  
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | System uses Cascadeflow for speculative routing setup | ✓ VERIFIED | `api/requirements.txt` line 20 includes `cascadeflow[langchain]==1.1.0`; `api/agents/nodes/cascade.py` imports `CascadeAgent`, `ModelConfig`. |
| 2 | Fast-model outputs are validated heuristically | ✓ VERIFIED | `api/agents/utils/validation.py` defines `ValidationSchema` and `SchemaValidator.validate()` with JSON+Pydantic checks (lines 34-45). |
| 3 | Agent graph uses cascade path instead of router/worker path | ✓ VERIFIED | `api/agents/graph.py` lines 66-72 wire `recall -> cascade -> retain`; no router/worker nodes in active graph. |
| 4 | Routing metadata is in graph state | ✓ VERIFIED | `api/agents/state.py` lines 10-11 define `model_used`, `cascaded`; `cascade_node` returns both keys (lines 62-63). |
| 5 | Big-model rate-limit/retry handling configured | ✓ VERIFIED | `api/agents/nodes/cascade.py` lines 36-37 set `extra.max_retries`, `retry_backoff_seconds`, `rate_limit_safe`, plus `http_config.max_retries`. |
| 6 | Cascade node links validator + cascadeflow runtime | ✓ VERIFIED | `api/agents/nodes/cascade.py` imports `SchemaValidator` and runs `cascade_agent.run(...)` plus `_schema_validator.validate(...)`. |
| 7 | Validation failure escalates entire turn to big model | ✗ FAILED (BLOCKER) | On fail path (lines 55-58), code only sets `model_used` and `cascaded`; no second big-model execution; response content not replaced. |
| 8 | End-to-end chat requests verified under speculative routing | ? UNCERTAIN (WARNING) | `pytest tests/test_phase21_e2e.py -q` result: skipped. No runtime proof for integrated chat flow in this verification run. |

**Score:** 6/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `api/agents/utils/validation.py` | Validation logic for speculative checks | ✓ VERIFIED | Exists; substantive (45 lines); wired via import in `cascade.py`. |
| `api/agents/nodes/cascade.py` | Speculative cascade execution node | ⚠ HOLLOW - wired but data/behavior gap | Exists; substantive; wired to graph. Escalation failure path flips metadata only, no true turn re-execution. |
| `api/agents/state.py` | Routing metadata fields | ✓ VERIFIED | Exists; fields present and consumed by graph/cascade flow. |
| `api/agents/graph.py` | Graph migration to cascade topology | ✓ VERIFIED | Exists; nodes/edges wired to `cascade_node`. |
| `tests/test_phase30_routing.py` | Routing behavior verification | ⚠ WARNING | Exists and passes, but tests monkeypatch `cascade_agent` to pre-baked `cascaded/model_used`; does not prove real validation-triggered escalation. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/agents/utils/validation.py` | `cascadeflow` | inheritance/runtime compatibility | ✓ WIRED | Imports `cascadeflow.quality`; builds compatible validator/result base classes. |
| `api/agents/nodes/cascade.py` | `api/agents/utils/validation.py` | import/use | ✓ WIRED | Imports `SchemaValidator`; invokes `_schema_validator.validate(final_response)`. |
| `api/agents/nodes/cascade.py` | `cascadeflow` | implementation | ✓ WIRED | Instantiates `CascadeAgent` and `ModelConfig` models. |
| `api/agents/graph.py` | `api/agents/nodes/cascade.py` | node registration | ✓ WIRED | `builder.add_node("cascade", cascade_node)` and edges into/out of cascade. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/agents/nodes/cascade.py` | `final_response` | `await cascade_agent.run(provider_messages)` | Yes (runtime call) | ✓ FLOWING |
| `api/agents/nodes/cascade.py` | validation decision | `_schema_validator.validate(final_response)` | Yes | ✓ FLOWING |
| `api/agents/nodes/cascade.py` | escalation output | fail branch lines 55-58 | No (metadata-only patch, no big-model rerun) | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase routing tests execute | `pytest tests/test_phase30_routing.py -q` | `2 passed` | ✓ PASS |
| E2E chat flow executes | `pytest tests/test_phase21_e2e.py -q` | `1 skipped` | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ROUT-01 | 30-01, 30-02, 30-03 | Dynamic model routing via Cascadeflow speculative execution | ? NEEDS HUMAN (and partial risk) | Cascadeflow node present and tests pass, but tests are mocked and do not prove real runtime escalation behavior. |
| ROUT-02 | 30-02, 30-03 | Standard rate-limit handling for Gemini 2.5 Flash | ✓ SATISFIED | Big-model `ModelConfig` includes retry/rate-limit related config (`max_retries`, backoff/rate-limit hints). |

Requirement-ID cross-reference check:
- Plan frontmatter IDs found: `ROUT-01`, `ROUT-02`
- REQUIREMENTS.md IDs for Phase 30: `ROUT-01`, `ROUT-02`
- Orphaned IDs: none

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `api/agents/nodes/cascade.py` | 55-58 | Metadata-only fallback on validation fail | blocker | Can misreport escalation without actually executing big-model turn; violates phase success criterion #2 intent. |
| `tests/test_phase30_routing.py` | 12-53 | Fully monkeypatched cascade result path | warning | Test passes even if production escalation logic broken; weak oracle for ROUT-01 truth. |
| `api/agents/graph.py` | 51 | `return {}` in retain wrapper client-missing path | info | Defensive no-op path; not phase blocker. |

### Human Verification Required

1. **Real escalation path with live/unmocked cascadeflow**  
   **Test:** Run agent flow with fast-model response intentionally schema-invalid and confirm big model actually re-runs full turn.  
   **Expected:** Final response content changes to big-model output; `model_used` reflects big model because execution happened, not metadata patch.  
   **Why human:** Requires live integration behavior (external model/provider semantics) not provable from mocked unit test.

2. **End-to-end chat request through graph**  
   **Test:** Execute real chat turn through compiled graph (`recall -> cascade -> retain`) and inspect final state/output.  
   **Expected:** Response present, metadata persisted, no regression in recall/retain behavior.  
   **Why human:** Existing e2e test currently skipped in this environment.

### Gaps Summary

Phase tasks mostly implemented. Goal contract not fully achieved. Core blocker: validation-failure path does not perform true turn escalation; code mutates metadata only. This breaks roadmap success criterion #2 and leaves ROUT-01 only partially evidenced.

---

_Verified: 2026-05-20T00:00:00Z_  
_Verifier: the agent (gsd-verifier)_
