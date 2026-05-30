---
phase: 21-dual-model-agent-orchestrator
verified: 2026-05-09T20:27:18Z
status: human_needed
score: 6/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Measure intent classification p95 latency under real model runtime"
    expected: "FAST/DEEP classification returns in <5s"
    why_human: "Needs running MI300X model servers and timing in deployed environment"
  - test: "Trigger Big model timeout and measure failover latency"
    expected: "Fallback response completes within 30s after failover"
    why_human: "Requires live model endpoints and wall-clock SLA measurement"
  - test: "Verify Fast Mode badge in real browser chat flow"
    expected: "Badge appears only when fallback metadata=true during stream"
    why_human: "Visual UX behavior and streaming timing cannot be fully proven by static code scan"
---

# Phase 21: Dual-Model Agent Orchestrator Verification Report

**Phase Goal:** Implement agent routing with Big Model (deep reasoning) and Fast Model (intent classification).
**Verified:** 2026-05-09T20:27:18Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Intent classification responds in <5s | ? UNCERTAIN (WARNING) | `api/agents/nodes/router.py:15` uses timeout 30s, but no measured <5s assertion in runtime tests. |
| 2 | Fallback succeeds within 30s timeout | ? UNCERTAIN (WARNING) | Fallback path exists (`api/agents/nodes/big.py:14-15`, `api/agents/nodes/fast.py:10`), but no wall-clock SLA proof for failover duration. |
| 3 | Both models load concurrently without OOM | ? UNCERTAIN (WARNING) | No runtime stress/VRAM evidence in phase artifacts; code only sets ports/timeouts (`api/core/config.py:7-10`). |
| 4 | System classifies "hi" as FAST and complex prompt as DEEP path | ✓ VERIFIED | Router logic in `api/agents/nodes/router.py:10-18`; tests `tests/test_phase21_routing.py:13-25` and `tests/test_phase21_graph_e2e.py:14-33`. |
| 5 | Fast model answers simple queries without invoking Big model | ✓ VERIFIED | `fast_worker_node` implemented (`api/agents/nodes/fast.py:8-11`) and direct routing test passes (`tests/test_phase21_routing.py:13-25`). |
| 6 | Big model timeout triggers fallback with `fallback=True` | ✓ VERIFIED | `api/agents/nodes/big.py:12-15`, `api/agents/utils/fallback.py:5-8`, test `tests/test_phase21_fallback.py:20-42`. |
| 7 | Chat stream emits fallback metadata packet | ✓ VERIFIED | SSE emits metadata false/true in `api/main.py:290,297,321`; stream source uses `graph.astream_events` in `api/routes/chats.py:19`. |
| 8 | Frontend receives fallback metadata and marks assistant message | ✓ VERIFIED | Metadata handler sets fallback flag in `web/src/app/repo/[id]/page.tsx:515-526`. |
| 9 | UI renders Fast Mode badge for fallback messages | ✓ VERIFIED | Badge render condition in `web/src/app/repo/[id]/page.tsx:807-809`. |

**Score:** 6/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `api/agents/state.py` | AgentState definition | ✓ VERIFIED | Exists, typed state with reducer (`messages: Annotated[..., operator.add]`). |
| `api/agents/utils/llm.py` | Dual-model factory | ✓ VERIFIED | Substantive factory with fast/big port selection and model choice (`get_model`). |
| `api/agents/nodes/router.py` | FAST/DEEP classifier | ✓ VERIFIED | Prompt + classification + timeout path implemented. |
| `api/agents/nodes/fast.py` | Fast worker node | ✓ VERIFIED | Invokes fast model with timeout and returns message output. |
| `api/agents/nodes/big.py` | Big worker with failover | ✓ VERIFIED | Big call with timeout, exception path redirects to fallback helper. |
| `api/agents/utils/fallback.py` | Fallback command utility | ✓ VERIFIED | Returns `Command(...goto="fast_worker", fallback=True)`. |
| `api/agents/graph.py` | Compiled orchestrator graph | ✓ VERIFIED | Router/fast/big nodes wired, conditional edge, MemorySaver compile. |
| `api/routes/chats.py` | Chat route graph streaming integration | ✓ VERIFIED | `stream_graph_events` yields `graph.astream_events(...version="v2")`. |
| `api/main.py` | SSE metadata signaling | ✓ VERIFIED | Metadata control-plane events + chunk stream handling implemented. |
| `web/src/app/repo/[id]/page.tsx` | Fallback metadata handling + badge | ✓ VERIFIED | Reads metadata fallback and displays `Fast Mode` badge in assistant header. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/agents/nodes/router.py` | `api/agents/nodes/fast.py` | conditional edge / goto | ✓ WIRED | Router returns `next="fast_worker"`; graph conditional edge routes by `next`. |
| `api/agents/nodes/big.py` | `api/agents/nodes/fast.py` | `Command(...goto="fast_worker")` | ✓ WIRED | Fallback helper imported and returned on timeout/exception. |
| `api/routes/chats.py` | `api/agents/graph.py` | `graph.astream_events` | ✓ WIRED | Direct import `from api.agents.graph import graph`; event stream call line 19. |
| `web/src/app/repo/[id]/page.tsx` | `/chat/stream` backend endpoint | fetch SSE | ✓ WIRED | Streaming POST to `${apiUrl}/chat/stream` and SSE event parsing loop. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/main.py` | `event` / `chunk_text` | `stream_graph_events()` -> `graph.astream_events()` | Yes | ✓ FLOWING |
| `api/main.py` | `final_state["messages"][-1].content` fallback path | `graph.ainvoke()` | Yes | ✓ FLOWING |
| `web/src/app/repo/[id]/page.tsx` | `data.fallback` | SSE metadata event from `/chat/stream` | Yes | ✓ FLOWING |
| `web/src/app/repo/[id]/page.tsx` | `message.fallback` render flag | Set in metadata handler, consumed in JSX badge condition | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Foundation + routing + fallback + graph tests | `pytest tests/test_phase21_foundation.py tests/test_phase21_routing.py tests/test_phase21_fallback.py tests/test_phase21_graph_e2e.py -q` | `8 passed in 6.96s` | ✓ PASS |
| SSE/E2E test coverage for phase | `pytest tests/test_phase21_sse.py tests/test_phase21_e2e.py -q` | `2 skipped` (stub markers remain) | ⚠️ WARNING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MR-01 | `21-02-PLAN.md` | Big Model deep reasoning path | ✓ SATISFIED | Big worker uses big model + deep route tests (`api/agents/nodes/big.py`, `tests/test_phase21_graph_e2e.py`). |
| MR-02 | `21-01-PLAN.md` | Fast model intent classification (FAST/DEEP) | ✓ SATISFIED | Router binary classifier prompt and routing tests (`api/agents/nodes/router.py`, `tests/test_phase21_routing.py`). |
| FR-01 | `21-01/02/03-PLAN.md` | Dual-model orchestrator with fallback + timeouts | ✓ SATISFIED | Graph assembly, fallback command, SSE propagation, UI signal path all present. |

Orphaned requirements for Phase 21 in `REQUIREMENTS.md`: none detected for provided IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `tests/test_phase21_sse.py` | 4 | `@pytest.mark.skip(...stub...)` | ⚠️ Warning | SSE behavior not asserted by active automated test. |
| `tests/test_phase21_e2e.py` | 4 | `@pytest.mark.skip(...stub...)` | ⚠️ Warning | End-to-end fallback/user-flow not covered by active test. |

### Human Verification Required

### 1. Intent Classification SLA

**Test:** Run live `/chat` requests with simple prompts (`"hi"`, clarification prompts) against deployed dual-model runtime and capture latency distribution.
**Expected:** Classification and response path stays under 5s for FAST intents.
**Why human:** Requires live model serving performance and environment load.

### 2. Big Timeout Failover SLA

**Test:** Induce Big model stall/unavailability and observe `/chat/stream` end-to-end completion time.
**Expected:** Fallback response returned within 30s failover target.
**Why human:** Needs real infrastructure timing; static code/tests do not prove runtime SLA.

### 3. Fast Mode UX Signal

**Test:** In browser, trigger fallback and inspect message header.
**Expected:** `Fast Mode` badge appears only on fallback assistant outputs.
**Why human:** Visual and interaction behavior cannot be fully validated via static checks.

### Gaps Summary

No code-level blocker gap found for implemented routing/fallback wiring. Remaining risk is runtime validation: latency SLA and OOM/concurrency claims are unproven in this verification pass.

---

_Verified: 2026-05-09T20:27:18Z_
_Verifier: the agent (gsd-verifier)_
