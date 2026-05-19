---
phase: 30-speculative-router-setup
verified: 2026-05-19T20:46:06Z
status: saved_for_later
score: 7/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "System automatically escalates entire conversation turns to the big model (Gemini 2.5 Flash) on validation failure"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run unmocked cascade turn where first draft fails schema and confirm second-pass big-model execution"
    expected: "Final response content comes from big model; model_used is big model; cascaded is true"
    why_human: "Unit test patches cascade_agent; does not prove live provider escalation behavior"
  - test: "Run end-to-end chat flow through compiled graph with speculative routing enabled"
    expected: "recall -> cascade -> retain executes, response returned, routing metadata preserved"
    why_human: "Current e2e test is skipped in this environment"
---

# Phase 30: Speculative Router Setup Verification Report

**Phase Goal:** System dynamically routes to the large model only when necessary to preserve GPU VRAM  
**Verified:** 2026-05-19T20:46:06Z  
**Status:** saved_for_later  
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | System uses Cascadeflow for speculative routing setup | ✓ VERIFIED | `api/requirements.txt:20` has `cascadeflow[langchain]==1.1.0`; `api/agents/nodes/cascade.py` imports `CascadeAgent`, `ModelConfig`. |
| 2 | Fast-model outputs are validated heuristically | ✓ VERIFIED | `api/agents/utils/validation.py:34-45` validates JSON schema using Pydantic and completeness check. |
| 3 | Agent graph uses cascade path instead of router/worker path | ✓ VERIFIED | `api/agents/graph.py:65-72` wires `recall -> cascade -> retain`. |
| 4 | Routing metadata is in graph state | ✓ VERIFIED | `api/agents/state.py:10-11` defines `model_used`, `cascaded`; returned by `cascade_node` at `cascade.py:81-82`. |
| 5 | Big-model rate-limit/retry handling configured | ✓ VERIFIED | `api/agents/nodes/cascade.py:60-62` sets `extra.max_retries`, `retry_backoff_seconds`, `rate_limit_safe`, `http_config.max_retries`. |
| 6 | Cascade node links validator + cascadeflow runtime | ✓ VERIFIED | `cascade.py:64` wires `validators=[_schema_validator]`; `ValidatorCascadeAgent.run()` executes first pass then validation gate. |
| 7 | Validation failure escalates entire turn to big model | ✓ VERIFIED | `cascade.py:37-46` runs first pass, validates, then reruns with `force_direct=True` on fail and returns second output. Previous metadata-only fallback removed. |
| 8 | End-to-end chat requests verified under speculative routing | ? UNCERTAIN (WARNING) | `pytest tests/test_phase21_e2e.py -q` => `1 skipped`; no runnable e2e evidence in current env. |

**Score:** 7/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `api/agents/nodes/cascade.py` | Native Cascadeflow escalation with wired validator | ✓ VERIFIED | Exists; substantive; wired to graph; contains two-pass escalation path with validator gate. |
| `tests/test_phase30_routing.py` | Robust escalation path verification | ⚠ PARTIAL | Exists/substantive and passes, but monkeypatches whole `cascade_agent`; proves contract output, not live second-call behavior. |
| `api/agents/utils/validation.py` | Heuristic schema validator | ✓ VERIFIED | Exists/substantive; imported and used in cascade node wrapper. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/agents/nodes/cascade.py` | `api/agents/utils/validation.py` | `validators=[_schema_validator]` wiring | ✓ WIRED | `cascade.py:7,22,64` import + instance + constructor wiring. |
| `api/agents/nodes/cascade.py` | `cascadeflow` runtime | `CascadeAgent.run(..., force_direct=True)` | ✓ WIRED | `cascade.py:34,37,43` runtime calls prove second-pass escalation path exists in code. |
| `api/agents/graph.py` | `api/agents/nodes/cascade.py` | node registration | ✓ WIRED | `graph.py:66,70-71` adds node and edges. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/agents/nodes/cascade.py` | `final_response` | `result = await cascade_agent.run(provider_messages)` | Yes | ✓ FLOWING |
| `api/agents/nodes/cascade.py` | validation decision | `validator.validate(content).passed` | Yes | ✓ FLOWING |
| `api/agents/nodes/cascade.py` | escalation output | `second = await self._agent.run(query, force_direct=True)` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Routing tests execute | `pytest tests/test_phase30_routing.py -q` | `2 passed` | ✓ PASS |
| E2E chat flow executes | `pytest tests/test_phase21_e2e.py -q` | `1 skipped` | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ROUT-01 | 30-01, 30-02, 30-03, 30-04 | Dynamic model routing (Gemma -> Gemini) via speculative execution | ? NEEDS HUMAN | Code path now has real second-pass rerun (`cascade.py:37-46`), but no unmocked integration/e2e proof in this environment. |
| ROUT-02 | 30-02, 30-03, 30-04 | Standard rate-limit handling for Gemini 2.5 Flash | ✓ SATISFIED | Big model config includes retry/rate-limit hints (`cascade.py:60-62`). |

Requirement-ID cross-reference check:
- Plan frontmatter IDs found: `ROUT-01`, `ROUT-02`
- REQUIREMENTS.md IDs for Phase 30: `ROUT-01`, `ROUT-02`
- Orphaned IDs: none

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `tests/test_phase30_routing.py` | 64-85 | Mock agent performs escalation internally; node only called once (`mock_agent.calls == 1`) | warning | Test oracle weaker than claimed “big-model invocation” proof; can miss runtime integration drift. |
| `api/agents/nodes/cascade.py` | 60-62 | Retry/rate-limit hints in metadata only | info | Depends on cascadeflow/provider honoring fields; no direct runtime assertion in tests. |

### Human Verification Required

### 1. Live escalation rerun

**Test:** Run unmocked cascade turn with intentionally invalid fast-model schema output.  
**Expected:** Wrapper performs second pass (`force_direct=True` path), final content from big model, `model_used` big model, `cascaded=true`.  
**Why human:** Requires live provider/cascadeflow behavior; unit test uses patched agent.

### 2. End-to-end graph chat run

**Test:** Execute real chat through compiled graph (`recall -> cascade -> retain`).  
**Expected:** Response returned, routing metadata persisted, no recall/retain regression.  
**Why human:** Existing e2e test skipped in this environment.

### Gaps Summary

Previous blocker closed. Code now contains true validation-triggered second-pass rerun and response replacement. Remaining risk = runtime proof only (human/integration needed), not observable code gap.

---

_Verified: 2026-05-19T20:46:06Z_  
_Verifier: the agent (gsd-verifier)_
