---
phase: 22-knowledge-graph-with-internal-resolution
verified: 2026-05-10T15:41:40Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run real repo re-index and inspect repo_graph row for same repo_id"
    expected: "repo_graph.nodes/edges refreshed after ingestion completion"
    why_human: "Requires live DB + GitHub/network integration beyond static verification"
  - test: "Inspect graph quality on real repo with mixed internal/external calls"
    expected: "CALLS only for internal symbols; unresolvable calls absent; shadow imports only blessed libs"
    why_human: "Semantic correctness across real-world code paths not fully provable via static grep"
---

# Phase 22: Knowledge Graph with Internal Resolution Verification Report

**Phase Goal:** Build graph with internal symbol resolution, dropping external/unresolvable CALLS edges.
**Verified:** 2026-05-10T15:41:40Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | CALLS edges only connect internal symbols | ✓ VERIFIED | `api/ingestion/graph_builder.py:212-216` adds CALLS only when `symbol_to_file.get(symbol)` resolves to local file. |
| 2 | Unresolvable calls dropped silently | ✓ VERIFIED | Same loop omits edge when target missing; no fallback CALLS edge emitted. Confirmed by `tests/test_phase22_resolution.py:93-108` (`edges == []`). |
| 3 | Graph updates on repo re-index | ✓ VERIFIED | Ingestion always rebuilds graph (`api/routes/repo.py:737-744`), persistence uses upsert (`api/db/graph_store.py:20-27`) so repeated re-index updates same `repo_id`. |
| 4 | repo_graph table exists with repo_id UUID PK (DR-01) | ✓ VERIFIED | `sql/migrations/0027_add_repo_graph_table.sql:2-7`. |
| 5 | RepoGraph dataclass models separate nodes/edges | ✓ VERIFIED | `api/db/models.py:204-209`. |
| 6 | GraphStoreManager saves/loads separate JSONB nodes and edges | ✓ VERIFIED | Save query writes separate columns (`graph_store.py:20-27`); read query returns both (`47-67`). |
| 7 | Graph nodes restricted to file + shadow node types (D-01) | ✓ VERIFIED | Node creation fixed to `type: file|shadow` (`graph_builder.py:171,201`) and tested (`test_phase22_resolution.py:84`). |
| 8 | Internal symbols resolved via global symbol map | ✓ VERIFIED | Pass1 map in `discover_symbols` (`143-159`), consumed in imports/calls resolution (`187-190`, `212-215`). |
| 9 | Edge types limited to IMPORTS/CALLS (no DEFINES) | ✓ VERIFIED | Only edge writes use `"IMPORTS"`/`"CALLS"` (`190,205,210,215`); test asserts no DEFINES (`85`). |
| 10 | Ingestion pipeline auto-triggers graph build using repo_id | ✓ VERIFIED | `_run_ingestion` calls `GraphBuilder(repo_id=repo_id, ...)` and `save_graph(repo_id, ...)` (`repo.py:739-744`); integration test verifies call path (`test_phase22_integration.py:64-75`). |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `sql/migrations/0027_add_repo_graph_table.sql` | Graph storage schema | ✓ VERIFIED | Exists, substantive SQL DDL + index, consumed by migration flow. |
| `api/db/models.py` | `RepoGraph` dataclass | ✓ VERIFIED | Exists + wired via `from api.db.models import RepoGraph` in `graph_store.py:8`. |
| `api/db/graph_store.py` | Save/load graph manager | ✓ VERIFIED | Exists + substantive queries + wired from ingestion route (`repo.py:15,742-743`). |
| `api/ingestion/graph_builder.py` | Two-pass extraction/resolution | ✓ VERIFIED | Exists + substantive parser/query logic + wired from route (`repo.py:16,739-740`). |
| `api/routes/repo.py` | Ingestion hook | ✓ VERIFIED | Hook exists in `_run_ingestion`, non-fatal try/except around graph build. |
| `tests/test_phase22_schema.py` | Storage verification | ✓ VERIFIED | 3 async tests for create/overwrite/read semantics. |
| `tests/test_phase22_extraction.py` | Symbol discovery verification | ✓ VERIFIED | Validates python/ts exports map. |
| `tests/test_phase22_resolution.py` | Relationship resolution verification | ✓ VERIFIED | Validates file/shadow-only nodes and dropped unresolvable calls. |
| `tests/test_phase22_integration.py` | Pipeline integration verification | ✓ VERIFIED | Verifies build+save triggered, and graph failure non-fatal path. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/db/graph_store.py` | `repo_graph table` | SQLAlchemy `text()` queries | ✓ WIRED | Insert/upsert + select queries target `repo_graph` (`20-27`, `47-52`). |
| `api/routes/repo.py` | `api/ingestion/graph_builder.py` | Function call at end of ingestion | ✓ WIRED | Import on line `16`; call on `739-740`; save on `742-743`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/ingestion/graph_builder.py` | `files`, `symbol_to_file`, `edges` | DB query on `code_chunks` (`79-88`) + parser extraction | Yes — DB-backed rows feed parse and edge generation | ✓ FLOWING |
| `api/routes/repo.py` | `nodes`, `edges` | `await builder.build_graph()` (`740`) | Yes — passed directly into `save_graph` (`743`) | ✓ FLOWING |
| `api/db/graph_store.py` | persisted `nodes`/`edges` | SQL insert/select on `repo_graph` | Yes — returns stored row into `RepoGraph` (`63-67`) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 22 targeted tests pass | `python -m pytest tests/test_phase22_schema.py tests/test_phase22_extraction.py tests/test_phase22_resolution.py tests/test_phase22_integration.py -q` | `8 passed, 13 warnings in 0.81s` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-02 | 22-01, 22-02 | Knowledge Graph with internal resolution and graph storage | ✓ SATISFIED | Graph builder + ingestion hook + graph store + tests (`graph_builder.py`, `repo.py`, `graph_store.py`, `tests/test_phase22_*.py`). |
| DR-01 | 22-01 | Graph table with `repo_id`, `nodes`, `edges`, `updated_at` | ✓ SATISFIED | Migration defines exact schema (`0027_add_repo_graph_table.sql:2-7`), save/load logic uses separate columns. |

Orphaned requirements for Phase 22 in `REQUIREMENTS.md`: **none found** (doc not phase-mapped by number; referenced IDs fully accounted for).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `api/ingestion/graph_builder.py` | 117 | Deprecated API usage: `parser.language.query(...)` | ⚠️ Warning | Runtime still works now; future tree-sitter upgrade risk. |
| `api/ingestion/graph_builder.py` | 151-154, 177-185 | Broad exception swallowing during extraction/resolution | ⚠️ Warning | Silent partial graph quality regressions possible. |

### Human Verification Required

### 1. Re-index persistence on real environment

**Test:** Trigger ingestion for an existing repo twice (with code changes between runs), then inspect `repo_graph` by `repo_id`.
**Expected:** `updated_at` advances and `nodes`/`edges` reflect latest state.
**Why human:** Needs live DB + GitHub fetch path; static checks cannot validate end-to-end runtime freshness.

### 2. Real-world semantic correctness of internal resolution

**Test:** Run ingestion on a medium repo containing local imports, external imports, aliased imports, dynamic patterns.
**Expected:** CALLS edges map only to internal files; unresolved calls absent; shadow nodes only for blessed libraries.
**Why human:** Requires runtime corpus inspection and qualitative edge validation beyond synthetic unit tests.

### Gaps Summary

No blocker gaps found in must-have implementation/wiring/data-flow checks. Phase code evidence satisfies declared must-haves and requirement IDs. Human runtime validation still required for live integration behavior.

---

_Verified: 2026-05-10T15:41:40Z_
_Verifier: the agent (gsd-verifier)_
