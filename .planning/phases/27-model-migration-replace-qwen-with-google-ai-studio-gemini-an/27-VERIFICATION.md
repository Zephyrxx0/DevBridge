---
phase: 27-model-migration-replace-qwen-with-google-ai-studio-gemini-an
verified: 2026-05-17T09:24:42Z
status: gaps_found
score: 5/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Qwen model dependencies and configuration removed from orchestrator and docker setup."
    status: failed
    reason: "Qwen still present in runtime request/config surface (`model_type` defaults), so cleanup not complete."
    artifacts:
      - path: "api/routes/chats.py"
        issue: "InferenceContextRequest still defaults `model_type: \"qwen\"`."
      - path: "api/utils/tokenizer.py"
        issue: "`enforce_cap(..., model_type=\"qwen\")` default remains."
    missing:
      - "Replace qwen defaults with provider-agnostic or gemini/gemma defaults."
      - "Remove/rename qwen-specific request model_type semantics in API surface."
  - truth: "Application fully functional using external Google AI Studio API."
    status: failed
    reason: "Fast-path nodes reference removed setting (`settings.fast_model_timeout`), causing runtime failure before/while invoking Gemini/Gemma."
    artifacts:
      - path: "api/agents/nodes/fast.py"
        issue: "Uses `settings.fast_model_timeout`, field no longer exists in Settings."
      - path: "api/agents/nodes/router.py"
        issue: "Uses `settings.fast_model_timeout`, field no longer exists in Settings."
      - path: "api/core/config.py"
        issue: "No `fast_model_timeout` field defined."
    missing:
      - "Reintroduce timeout setting in config or replace node references with valid timeout constant."
      - "Add runtime test covering fast worker + router invocation path."
---

# Phase 27: Model Migration: Replace Qwen with Google AI Studio (Gemini) and Clean Up Local Dependencies Verification Report

**Phase Goal:** Transition model inference from local Qwen models (running on AMD GPUs) to Google AI Studio (Gemini) while maintaining Gemma integration for testing and development.
**Verified:** 2026-05-17T09:24:42Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Qwen model dependencies and configuration removed from orchestrator and docker setup. | ✗ FAILED (BLOCKER) | `api/routes/chats.py:229` default `model_type="qwen"`; `api/utils/tokenizer.py:46` default `model_type="qwen"`. |
| 2 | Google AI Studio (Gemini) integrated as primary Big Model engine. | ✓ VERIFIED | `api/agents/utils/llm.py:69` returns `gemini-2.5-flash` for big path. |
| 3 | Application fully functional using external Google AI Studio API. | ✗ FAILED (BLOCKER) | `api/agents/nodes/fast.py:10` and `router.py:16` reference missing `settings.fast_model_timeout`; `hasattr(settings,"fast_model_timeout") -> False`. |
| 4 | Gemma integration preserved as local or API-based fallback/fast-path. | ✓ VERIFIED | `api/agents/utils/llm.py:68` fast path uses `gemma-4-26b-a4b-it`; fallback route exists `api/agents/utils/fallback.py:5-8`. |
| 5 | SDK updated to google-genai Python SDK. | ✓ VERIFIED | `api/requirements.txt:17` includes `google-genai>=1.33.0`; imports in `llm.py` + `tokenizer.py`. |
| 6 | Thinking config correctly applied (`thinking_budget=-1` flash, `thinking_level=HIGH` gemma). | ✓ VERIFIED | `api/agents/utils/llm.py:37-43,67-69`. |
| 7 | Local vLLM services removed from docker-compose. | ✓ VERIFIED | `docker-compose.yml` only `api` service; no `vllm-deep/vllm-fast` or ROCm device wiring. |
| 8 | Model weights removed from host filesystem. | ? UNCERTAIN (WARNING) | Environment lacks `/app/repo_cache` in this verifier runtime (`NO_REPO_CACHE_PATH`), cannot confirm host deletion. |

**Score:** 5/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `api/agents/utils/llm.py` | Gemini SDK wrapper + model factory | ✓ VERIFIED | Exists, substantive (69 lines), wired via imports in `big.py`, `fast.py`, `router.py`, `onboarding.py`. |
| `tests/test_model_migration.py` | Migration verification tests | ✓ VERIFIED | Exists, substantive, executable; `pytest tests/test_model_migration.py -q` => `6 passed`. |
| `docker-compose.yml` | No local inference services | ✓ VERIFIED | Contains only `api` service and named volumes. |
| `api/core/config.py` | Config without legacy vLLM ports/timeouts | ⚠️ PARTIAL | Legacy fields removed, but dependent nodes still reference removed timeout key (broken wiring). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `api/agents/nodes/big.py` | `api/agents/utils/llm.py` | `get_model` call | ✓ WIRED | `big.py:5,10` imports and calls `get_model(is_fast=False)`. |
| `api/agents/nodes/fast.py` | `api/core/config.py` | `settings.fast_model_timeout` | ✗ NOT_WIRED | Config field removed; runtime attribute missing. |
| `api/agents/nodes/router.py` | `api/core/config.py` | `settings.fast_model_timeout` | ✗ NOT_WIRED | Config field removed; runtime attribute missing. |
| `docker-compose.yml` | host disk | volume mount removal | ⚠️ PARTIAL | Bind mounts removed, but named volume `repo_cache_data` still mounted at `/app/repo_cache`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `api/agents/utils/llm.py` | `response.text` | `client.aio.models.generate_content(...)` | Yes (external API call path present) | ✓ FLOWING (code-path verified) |
| `api/utils/tokenizer.py` | `response.total_tokens` | `client.models.count_tokens(...)` | Yes (SDK call path + test assertion) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Migration tests pass | `pytest tests/test_model_migration.py -q` | `6 passed` | ✓ PASS |
| Big/Fast model mapping | `python -c "...print(llm.get_model(False).model_name, llm.get_model(True).model_name)"` | `gemini-2.5-flash gemma-4-26b-a4b-it` | ✓ PASS |
| Fast timeout config presence | `python -c "from api.core.config import settings; print(hasattr(settings,'fast_model_timeout'))"` | `False` | ✗ FAIL |
| Host weight dirs exist | `Test-Path /app/repo_cache/qwen|gemma` | `NO_REPO_CACHE_PATH` | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description (from REQUIREMENTS.md) | Status | Evidence |
|---|---|---|---|---|
| MR-01 | 27-01 | Big Model = `Qwen2.5-72B-Instruct-AWQ` | ✗ BLOCKED | Code intentionally migrated away from Qwen to Gemini (`llm.py:69`). REQUIREMENTS.md not updated to refactored requirement text. |
| MR-04 | 27-01 | **Not found in REQUIREMENTS.md** | ? NEEDS HUMAN | Plan/ROADMAP reference MR-04, but canonical REQUIREMENTS.md lacks definition; cannot formally validate text contract. |
| IR-01 | 27-02 | Single GPU VRAM partitioning | ✗ BLOCKED | Phase 27 decommissions local GPU/vLLM infra; requirement mapping appears stale/inconsistent for this migration phase. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `api/routes/chats.py` | 229 | Hardcoded legacy default `model_type="qwen"` | ⚠️ Warning | Indicates incomplete Qwen config cleanup. |
| `api/utils/tokenizer.py` | 46 | Legacy default `model_type="qwen"` | ⚠️ Warning | Legacy naming persists in runtime path. |
| `api/agents/nodes/fast.py` | 10 | Reads removed config field | 🛑 Blocker | Fast-path runtime breaks (`AttributeError`) or cannot execute timeout branch safely. |
| `api/agents/nodes/router.py` | 16 | Reads removed config field | 🛑 Blocker | Intent classification path broken by missing timeout setting. |
| `api/agents/onboarding.py` | 103 | Stale comment references Qwen Big Model | ℹ️ Info | Documentation drift, not direct runtime failure. |

### Human Verification Required

### 1. External Gemini API end-to-end call

**Test:** Run real onboarding or chat inference with valid `GEMINI_API_KEY`.
**Expected:** Response returns from Gemini/Gemma with no fallback mock content and no timeout attribute errors.
**Why human:** Requires real credentialed external service and runtime environment.

### 2. Host weight purge confirmation

**Test:** On deployment host, verify `/app/repo_cache/qwen` and `/app/repo_cache/gemma` removed and disk reclaimed.
**Expected:** Both dirs absent; storage usage reduced.
**Why human:** Verifier environment does not mount host cache path.

### Gaps Summary

Phase work substantial, goal not achieved yet. Two blockers prevent pass:
1) legacy Qwen config defaults still present in runtime API/tokenizer surfaces,
2) fast/router nodes depend on removed `fast_model_timeout` config key, breaking functional runtime path.

Additionally, requirements traceability is inconsistent: MR-04 missing in REQUIREMENTS.md, MR-01/IR-01 appear stale vs migration intent.

---

_Verified: 2026-05-17T09:24:42Z_
_Verifier: the agent (gsd-verifier)_
