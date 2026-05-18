---
phase: 20-amd-gpu-infrastructure-setup
verified: 2026-05-10T00:25:00Z
status: gaps_found
score: 6/7 must-haves verified
overrides_applied: 0
gaps:
  - truth: "D-03: Embeddings continue to use Vertex AI text-embedding-004 to preserve VRAM."
    status: failed
    reason: "Codebase does not implement Vertex text-embedding-004 path in Phase 20 deliverables."
    artifacts:
      - path: "api/core/config.py"
        issue: "Default embedding model is local-hash-embedding-v1, not Vertex text-embedding-004."
    missing:
      - "Configure embedding model/runtime to Vertex AI text-embedding-004 or add accepted override for intentional deviation."
---

# Phase 20: AMD GPU Infrastructure Setup Verification Report

**Phase Goal:** Configure single MI300X with VRAM partitioning and Docker volume for cache.
**Verified:** 2026-05-10T00:25:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Big Model uses ≤60% VRAM | ✓ VERIFIED | `docker-compose.yml` uses `vllm-deep` with `--gpu-memory-utilization 0.60` and `--port 8000` (lines 16-19). |
| 2 | Fast Model uses ≤20% VRAM | ✓ VERIFIED | `docker-compose.yml` uses `vllm-fast` with `--gpu-memory-utilization 0.20` and `--port 8001` (lines 35-38). |
| 3 | No request exceeds 48K tokens | ✓ VERIFIED | `api/routes/chats.py` calls `enforce_cap(..., max_tokens=settings.max_context_tokens)`; `api/core/config.py` sets default `max_context_tokens=48000`; `api/utils/tokenizer.py` trims oldest history until within cap. |
| 4 | D-12: Startup avoids model download on init via pre-download script | ✓ VERIFIED | `scripts/download_models.sh` exists, syntax-valid (`bash -n`), invokes `huggingface-cli download` for Qwen and Gemma with isolated `HF_HOME` roots. |
| 5 | D-09/D-11: Isolated cache dirs + UID/GID mapping in compose | ✓ VERIFIED | `docker-compose.yml` bind mounts `/app/repo_cache/qwen` and `/app/repo_cache/gemma`; both services set `user: "${UID}:${GID}"`. |
| 6 | D-10: Cache eviction policy deferred | ✓ VERIFIED | No eviction/cleanup cron logic in phase files (`docker-compose.yml`, `scripts/download_models.sh`). |
| 7 | D-03: Embeddings continue using Vertex AI text-embedding-004 | ✗ FAILED (BLOCKER) | `api/core/config.py` sets `embedding_model` default to `local-hash-embedding-v1`; no Vertex `text-embedding-004` implementation evidence in phase artifacts. |

**Score:** 6/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `docker-compose.yml` | Dual ROCm vLLM, VRAM partitioning, cache binds | ✓ VERIFIED | Substantive config (38 lines). Includes `vllm-deep`, `vllm-fast`, 0.60/0.20 utilization, `/app/repo_cache/*` mounts. |
| `api/utils/tokenizer.py` | 48K enforcement + truncation logic | ✓ VERIFIED | Substantive utility (67 lines), tokenizer-backed counting, oldest-first truncation, warning flag return, exception logging. |
| `api/routes/chats.py` | Gateway integration calling cap enforcement | ✓ VERIFIED | Imports and calls `enforce_cap`; returns warning payload when trimming occurs. |
| `scripts/download_models.sh` | Manual model pre-warm | ✓ VERIFIED | Executable script with `set -e`, isolated `HF_HOME`, two `huggingface-cli download` calls. |
| `api/core/config.py` | Ports + token cap + embedding continuity | ⚠️ PARTIAL | Token cap and ports present; embedding continuity truth (Vertex text-embedding-004) not satisfied. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `api/routes/chats.py` | `api/utils/tokenizer.py` | `enforce_cap` before response context handoff | ✓ WIRED | Import at line 9; call at lines 258-263; warning handling lines 269-270. |
| `docker-compose.yml` | `/app/repo_cache` | Bind mounts for HF cache per service | ✓ WIRED | `/app/repo_cache/qwen` and `/app/repo_cache/gemma` mount to `/root/.cache/huggingface`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `api/routes/chats.py` (`build_inference_context`) | `messages`, `warning` | `enforce_cap(payload.messages, payload.codebase_chunk, ...)` | Yes — tokenizer counts + iterative truncation from request payload | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Compose config valid with dual services | `docker compose config` | Parsed successfully; both services rendered; warning: UID/GID unset in current shell | ✓ PASS |
| Token cap logic works | `pytest tests/test_phase20_config.py tests/test_phase20_truncation.py -q` | `4 passed` | ✓ PASS |
| Pre-download script shell-valid | `bash -n scripts/download_models.sh` | Exit 0, no syntax errors | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| IR-01 | 20-01-PLAN.md | Partition 192GB VRAM via `--gpu-memory-utilization` | ✓ SATISFIED | `docker-compose.yml` deep=0.60, fast=0.20; max-model-len set 48000. |
| IR-02 | 20-02-PLAN.md | Bind Docker volume to `/app/repo_cache` persistent cache | ✓ SATISFIED | `docker-compose.yml` binds `/app/repo_cache/qwen` and `/app/repo_cache/gemma`. |
| IR-03 | 20-01-PLAN.md | Cap request context at 48,000 tokens | ✓ SATISFIED | `settings.max_context_tokens=48000`; `enforce_cap` truncation integration in chats route. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `api/core/config.py` | 13 | `embedding_model` set to local placeholder (`local-hash-embedding-v1`) instead of required Vertex path from must-have | 🛑 Blocker | Violates explicit must-have D-03 continuity claim. |

### Human Verification Required

None.

### Gaps Summary

Phase goal mostly achieved for IR-01/IR-02/IR-03 and core infra behavior. One must-have from plan frontmatter fails: D-03 embedding continuity to Vertex `text-embedding-004` not evidenced in code. Under verification rules, this is blocker until implemented or explicitly accepted via override.

Suggested override template (if intentional deviation):

```yaml
overrides:
  - must_have: "D-03: Embeddings continue to use Vertex AI text-embedding-004 to preserve VRAM."
    reason: "{why local embedding path is acceptable at this phase}"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-05-10T00:25:00Z_
_Verifier: the agent (gsd-verifier)_
