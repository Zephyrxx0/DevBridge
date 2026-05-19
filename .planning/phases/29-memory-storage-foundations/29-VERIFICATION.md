---
phase: 29-memory-storage-foundations
verified: 2026-05-19T00:00:00Z
status: gaps_found
score: 9/10 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Memory isolation is safe per-user across chat execution paths"
    status: failed
    reason: "Both /chat and /chat/stream fall back to a shared literal user_id (`default_user`) when request.state.user_id is absent, which can merge memory banks across users."
    artifacts:
      - path: "api/main.py"
        issue: "`user_id = getattr(request.state, \"user_id\", \"default_user\")` used in both endpoints."
    missing:
      - "Replace shared fallback with per-session/per-user unique ID strategy or reject requests without authenticated user context."
      - "Add tests that prove two distinct users cannot read/write same hindsight bank."
---

# Phase 29: Memory Storage & Foundations Verification Report

**Phase Goal:** System has persistent biomimetic agent memory using Hindsight without blocking execution  
**Verified:** 2026-05-19T00:00:00Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | System initializes Hindsight using existing Supabase pgvector instance | ✓ VERIFIED | `api/db/hindsight.py:28-36` sets DB URL from `settings.sync_supabase_connection_string` and schema `hindsight`; `api/main.py:213` calls `hindsight_db.initialize()` at startup. |
| 2 | Agent workflows call `recall()` before execution | ✓ VERIFIED | `api/agents/graph.py:67-75` adds `recall` node and routes `START -> recall -> router` before workers. |
| 3 | System offloads `reflect()` to async APScheduler job | ✓ VERIFIED | `api/main.py:258-264` schedules `hindsight_db.reflect` as cron job (`hour="*/4"`) through scheduler manager. |
| 4 | Hindsight dependencies are installed in runtime requirements | ✓ VERIFIED | `api/requirements.txt:18-19` includes `hindsight-all-slim` and `hindsight-langgraph`. |
| 5 | Dedicated `hindsight` schema artifact exists | ✓ VERIFIED | `sql/migrations/0032_create_hindsight_schema.sql:3` contains `CREATE SCHEMA IF NOT EXISTS hindsight;`. |
| 6 | Test scaffold for memory phase exists | ✓ VERIFIED | `api/tests/test_phase29_memory.py` exists with 24 lines and three phase tests collected by pytest. |
| 7 | AgentState includes dedicated memory field | ✓ VERIFIED | `api/agents/state.py:9` contains `hindsight_memory: Optional[str]`. |
| 8 | HindsightManager embedded client lifecycle exists | ✓ VERIFIED | `api/db/hindsight.py:16-60` defines `HindsightManager`, `initialize()`, `reflect()`, and singleton `hindsight_db`. |
| 9 | LangGraph includes recall+retain nodes and memory output key | ✓ VERIFIED | `api/agents/graph.py:35-39,54-58,67-78` wires recall/retain nodes with `output_key="hindsight_memory"`. |
| 10 | Memory isolation is safe per-user across chat execution paths | ✗ FAILED (BLOCKER) | `api/main.py:400,517` fallback to shared `"default_user"` when no authenticated user set; this can collapse multiple users into one memory bank. |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `sql/migrations/0032_create_hindsight_schema.sql` | Schema isolation | ✓ VERIFIED | Exists; substantive SQL statement present. |
| `api/tests/test_phase29_memory.py` | Verification infrastructure | ⚠️ VERIFIED (scaffold) | Exists and collects, but contains TODO + `assert True` placeholders only. |
| `api/agents/state.py` | Structured memory state | ✓ VERIFIED | Contains typed `hindsight_memory` field. |
| `api/db/hindsight.py` | Hindsight client management | ✓ VERIFIED | Manager + singleton + init/reflect path implemented. |
| `api/agents/graph.py` | Memory-aware graph | ✓ VERIFIED | Recall/retain node creation and routing implemented. |
| `api/main.py` | Async reflection scheduling + config passing | ⚠️ PARTIAL | Scheduling + user_id propagation exist, but safety fallback uses shared `default_user`. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `api/main.py` | `api/agents/graph.py` | `graph.ainvoke(..., config={configurable:{thread_id,user_id}})` | ✓ WIRED | `/chat` + `/chat/stream` pass config including `user_id`. |
| `api/routes/chats.py` | `api/agents/graph.py` | `stream_graph_events(..., user_id)` -> `graph.astream_events(..., config=...)` | ✓ WIRED | `user_id` threaded through stream helper. |
| `api/agents/graph.py` | Hindsight node factories | `create_recall_node/create_retain_node` | ✓ WIRED | Factories created lazily with hindsight client + bank isolation key. |
| `api/main.py` | Scheduler | `scheduler_manager.add_job(hindsight_db.reflect, cron)` | ✓ WIRED | Reflect offloaded from request path to background cron. |
| `api/db/hindsight.py` | Supabase config | `settings.sync_supabase_connection_string` -> env vars | ✓ WIRED | DB URL + schema envs set before embedded client init. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `api/agents/graph.py` | `hindsight_memory` | `recall_node(state, config)` from `hindsight_langgraph.create_recall_node` | Yes (client-backed when initialized; `None` fallback on init failure) | ⚠️ FLOWING WITH FAILOPEN |
| `api/main.py` (`/chat`) | `user_id` in configurable context | `request.state.user_id` else `"default_user"` | No, can collapse multiple callers to shared literal | ✗ HOLLOW_PROP (safety) |
| `api/main.py` lifespan | scheduled reflection callable | `scheduler_manager.add_job(hindsight_db.reflect, ...)` | Yes, background scheduler invocation path exists | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase memory tests are discoverable | `python -m pytest api/tests/test_phase29_memory.py --collect-only -q` | 3 tests collected | ✓ PASS |
| Hindsight manager exports usable singleton | `python -c "from api.db.hindsight import HindsightManager,hindsight_db; print(HindsightManager.__name__, isinstance(hindsight_db,HindsightManager))"` | `HindsightManager True` | ✓ PASS |
| Graph module compiles/imports | `python -c "import api.agents.graph as g; print(hasattr(g,'graph'))"` | `True` | ✓ PASS |
| Phase memory tests validate behavior | `python -m pytest api/tests/test_phase29_memory.py -q` | 3 passed, but all are scaffold `assert True` | ✗ FAIL (behavior not validated) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| MEM-01 | 29-02, 29-03 | Invoke `recall()` before execution and `retain()` post-execution | ✓ SATISFIED | `api/agents/graph.py` routes `START->recall->router` and workers -> `retain` -> `END`. |
| MEM-02 | 29-01, 29-02 | Point Hindsight embedded mode to existing Supabase pgvector | ✓ SATISFIED | `api/db/hindsight.py` sets DB URL from settings + schema `hindsight`; migration creates schema artifact. |
| MEM-03 | 29-03 | Offload `reflect()` to APScheduler | ✓ SATISFIED | `api/main.py:258-264` schedules `hindsight_db.reflect` cron job. |

Cross-reference check complete: PLAN frontmatter IDs `{MEM-01, MEM-02, MEM-03}` all present in `.planning/REQUIREMENTS.md` and all accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `api/tests/test_phase29_memory.py` | 9,16,23 | TODO scaffold markers | ⚠️ Warning | Tests do not verify recall/init/scheduler behavior yet. |
| `api/tests/test_phase29_memory.py` | 10,17,24 | `assert True` placeholder tests | ⚠️ Warning | Passing tests can mask integration regressions. |
| `api/main.py` | 400,517 | Shared fallback `default_user` | 🛑 Blocker | Cross-user memory mixing risk; violates safe isolation intent. |

### Gaps Summary

Phase implemented core plumbing (deps, schema, manager, graph wiring, scheduler). Goal claim includes “integrated safely and correctly”. Safety boundary fails under missing auth context because fallback user id is global literal. Memory banks can merge across callers. Test suite currently scaffold-only, so behavioral correctness not enforced.

---

_Verified: 2026-05-19T00:00:00Z_  
_Verifier: the agent (gsd-verifier)_
