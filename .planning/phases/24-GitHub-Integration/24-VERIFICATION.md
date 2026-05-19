---
phase: 24-GitHub-Integration
verified: 2026-05-10T20:54:01Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 2/3
  gaps_closed:
    - "Uses user's OAuth token, not shared PAT"
  gaps_remaining: []
  regressions: []
---

# Phase 24: GitHub Integration Verification Report

**Phase Goal:** Issue-to-file mapping via pgvector, OAuth token extraction from Supabase.
**Verified:** 2026-05-10T20:54:01Z
**Status:** passed
**Re-verification:** Yes — after gap closure attempt

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Issue search returns relevant files | ✓ VERIFIED | `api/agents/orchestrator.py:386-462` implements `map_issue_to_files`, runs existence check, optional on-demand sync, then DB-native cosine ranking (`ORDER BY cc.embedding <=> rgi.embedding`). |
| 2 | Uses user's OAuth token, not shared PAT | ✓ VERIFIED | Fail-closed now enforced on all phase-critical flows: `_run_ingestion` exits before any GitHub call when `user_id`/token missing (`api/routes/repo.py:639-646`), scheduler skips per-repo without token (`api/main.py:126-133`), on-demand sync aborts without token (`api/agents/orchestrator.py:308-312`). Shared PAT fallback remains disabled by default (`api/core/secrets.py:49-71`). |
| 3 | No VRAM spikes from large context | ✓ VERIFIED | Similarity computation stays in Postgres (`api/agents/orchestrator.py:412-440`). Blocking network/embedding wrapped in `asyncio.to_thread` (`api/main.py:69`, `api/main.py:80-83`, `api/agents/orchestrator.py:300-301`, `:351-354`). |

**Score:** 3/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `sql/migrations/0029_add_github_issues_and_rpc.sql` | Issue table + secure token RPC | ✓ VERIFIED | `repo_github_issues`, `VECTOR(768)`, `get_github_token_for_user`, and `REVOKE ... FROM PUBLIC` present. |
| `api/db/models.py` | RepoGithubIssue model | ✓ VERIFIED | `class RepoGithubIssue` present (`api/db/models.py:213`). |
| `api/core/secrets.py` | user_id → RPC token retrieval | ✓ VERIFIED | RPC path implemented with UUID normalization and token extraction; `allow_env_fallback=False` by default (`api/core/secrets.py:47-71`). |
| `api/requirements.txt` | APScheduler dependency | ✓ VERIFIED | `APScheduler==3.10.4` present. |
| `api/main.py` | FastAPI lifespan + daily sync | ✓ VERIFIED | Lifespan scheduler, job registration, sync upsert flow present. |
| `api/agents/orchestrator.py` | map_issue_to_files + on-demand sync | ✓ VERIFIED | Tool registered and SQL cosine mapping implemented. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/core/secrets.py` | Postgres RPC | `get_github_token_for_user` | ✓ WIRED | SQL RPC query executes and returns provider_token when `user_id` provided. |
| `api/agents/orchestrator.py` | Database pgvector | `<=>` cosine join | ✓ WIRED | In-DB query with join and limit present. |
| Critical GitHub flows | User-scoped OAuth | `get_github_token(user_id=...)` + fail-closed guards | ✓ WIRED | Ingestion now returns early on missing user/token (`api/routes/repo.py:639-646`) before first `_github_get_json` call (`:660`). Scheduler/on-demand sync already skip/abort without token (`api/main.py:126-133`, `api/agents/orchestrator.py:308-312`). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/agents/orchestrator.py` (`map_issue_to_files`) | `rows` | SQL join result over `repo_github_issues` + `code_chunks` | Yes | ✓ FLOWING |
| `api/main.py` (`sync_issues`) | `payload`, `embedding` | GitHub API pages + embedding service + DB upsert | Yes | ✓ FLOWING |
| Token path across critical flows | `token` | RPC via `get_github_token_for_user` | Yes (missing token halts flow before network call) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Python parse sanity for critical files | `python -m py_compile api/core/secrets.py api/main.py api/agents/orchestrator.py api/routes/repo.py` | Exit 0 | ✓ PASS |
| Scheduler wiring exists | static check for `add_job/start/shutdown` in `api/main.py` | present | ✓ PASS |
| Must-have token enforcement in critical flows | static check (`get_github_token(user_id)` + fail-closed on missing token) | ingestion now returns on missing `user_id`/token before GitHub calls (`api/routes/repo.py:639-646`) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-04 | 24-01, 24-02 | Issue mapping via pgvector + Supabase OAuth token extraction | ✓ SATISFIED | Mapping implemented in `map_issue_to_files`; OAuth retrieved via RPC; critical flows enforce fail-closed user-token requirement before GitHub network access. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| None | - | - | - | No blocker anti-patterns found in phase-critical paths. |

### Human Verification Required

None.

### Gaps Summary

Re-verification result: prior OAuth blocker closed. `_run_ingestion` now fail-closes on missing user context or missing user token and does not perform GitHub requests in that state. Combined with existing fail-closed guards in scheduled sync and on-demand sync, phase-critical GitHub paths now enforce user-scoped OAuth usage without shared PAT fallback.

---

_Verified: 2026-05-10T20:54:01Z_
_Verifier: the agent (gsd-verifier)_
