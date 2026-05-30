---
phase: 20-amd-gpu-infrastructure-setup
plan: 01
subsystem: infra
tags: [amd, vllm, fastapi, transformers, token-cap]
requires:
  - phase: 20-amd-gpu-infrastructure-setup
    provides: phase context decisions D-01..D-08
provides:
  - 48K context-cap utility using model-specific HuggingFace tokenizers
  - Chat route integration with truncation warning payload
  - Dual vLLM ROCm compose services with explicit VRAM split and ports
affects: [api-gateway, inference-routing, docker-runtime]
tech-stack:
  added: [transformers, huggingface-hub]
  patterns: [truncate-oldest-history, warning-on-trim, dual-vllm-port-routing]
key-files:
  created: [api/utils/tokenizer.py, tests/test_phase20_config.py, tests/test_phase20_truncation.py, docker-compose.yml]
  modified: [api/core/config.py, api/requirements.txt, api/routes/chats.py]
key-decisions:
  - "Expose MAX_CONTEXT_TOKENS/BIG_MODEL_PORT/FAST_MODEL_PORT via Settings for deterministic routing and limits."
  - "Use Truncation+Warning behavior in API route instead of rejection when context exceeds cap."
patterns-established:
  - "Token budget gate: enforce_cap(messages, codebase_chunk) before inference handoff."
  - "Model isolation: separate vllm-deep/vllm-fast containers with fixed ports and VRAM utilization."
requirements-completed: [IR-01, IR-03]
duration: 18 min
completed: 2026-05-09
---

# Phase 20 Plan 01: AMD GPU Infrastructure Setup Summary

**48K context cap enforcement shipped with tokenizer-accurate truncation, chat-route warning behavior, and dual ROCm vLLM container split (0.60/0.20).**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-09T18:18:00Z
- **Completed:** 2026-05-09T18:36:15Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added `Settings` fields for max context and explicit deep/fast model ports.
- Implemented `api/utils/tokenizer.py` with exact HF tokenizer loading and oldest-first history truncation while preserving codebase context.
- Integrated truncation in chat inference-context payload and added explicit warning message for trimmed context.
- Added base `docker-compose.yml` with `vllm-deep` and `vllm-fast` ROCm services, max-model-len 48000, and VRAM utilization limits.

## Task Commits

Each task committed atomically:

1. **Task 1: API Configuration and Tokenizer Utility** - `fe59737` (feat)
2. **Task 2: API Route Integration** - `dd07c67` (feat)
3. **Task 3: Docker Compose Base and VRAM Partitioning** - `5079b22` (feat)

## Files Created/Modified
- `api/core/config.py` - Added MAX_CONTEXT_TOKENS, BIG_MODEL_PORT, FAST_MODEL_PORT.
- `api/requirements.txt` - Added `transformers` and `huggingface-hub`.
- `api/utils/tokenizer.py` - Added exact tokenizer counting + truncation gate.
- `tests/test_phase20_config.py` - Added settings default tests.
- `tests/test_phase20_truncation.py` - Added truncation behavior tests across model types.
- `api/routes/chats.py` - Added inference context endpoint using `enforce_cap` and warning payload.
- `docker-compose.yml` - Added dual AMD ROCm vLLM service definitions.

## Decisions Made
- Added API-level truncation endpoint path in `chats.py` because no existing inference construction path existed in file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No existing inference-context assembly in `api/routes/chats.py`**
- **Found during:** Task 2 (API Route Integration)
- **Issue:** Plan requested integration at existing construction point, but file had only persistence CRUD routes and no inference payload assembly.
- **Fix:** Added `POST /chats/{session_id}/inference-context` endpoint to construct model-bound context via `enforce_cap` and emit required warning.
- **Files modified:** `api/routes/chats.py`
- **Verification:** `python -c "from pathlib import Path; s=Path('api/routes/chats.py').read_text(encoding='utf-8'); print(s.count('enforce_cap'))"` output `2`.
- **Committed in:** `dd07c67`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Needed for correctness of Task 2 integration target. No scope creep outside required truncation behavior.

## Issues Encountered
None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-endpoint | `api/routes/chats.py` | Added new API endpoint (`/chats/{session_id}/inference-context`) at Client→API boundary; requires ongoing input-size/rate controls in later hardening phase. |

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Ready for `20-02-PLAN.md`.

## Self-Check: PASSED
- FOUND: `api/utils/tokenizer.py`
- FOUND: `tests/test_phase20_config.py`
- FOUND: `tests/test_phase20_truncation.py`
- FOUND: `docker-compose.yml`
- FOUND commit: `fe59737`
- FOUND commit: `dd07c67`
- FOUND commit: `5079b22`

---
*Phase: 20-amd-gpu-infrastructure-setup*
*Completed: 2026-05-09*
