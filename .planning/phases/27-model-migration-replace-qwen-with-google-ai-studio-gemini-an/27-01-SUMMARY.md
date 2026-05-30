---
phase: 27-model-migration-replace-qwen-with-google-ai-studio-gemini-an
plan: 01
subsystem: api
tags: [google-genai, gemini, gemma, tokenizer, migration]

requires:
  - phase: 21-agent-orchestration-dual-model-routing
    provides: Existing router/worker node orchestration with get_model contract
provides:
  - Google AI Studio model factory for big/fast model roles
  - GEMINI_API_KEY configuration path in backend settings
  - SDK-native token counting through google-genai
affects: [agents, routing, token-budget-enforcement, model-inference]

tech-stack:
  added: [google-genai]
  patterns: [GeminiModel wrapper with ainvoke, thinking_config by model role, API-key driven client factory]

key-files:
  created: [tests/test_model_migration.py]
  modified: [api/requirements.txt, api/core/config.py, api/agents/utils/llm.py, api/utils/tokenizer.py, api/agents/nodes/router.py]

key-decisions:
  - "Use gemini-2.5-flash for non-fast path with thinking_budget=-1."
  - "Use gemma-4-26b-a4b-it for fast/analysis path with thinking_level=HIGH."
  - "Use google-genai models.count_tokens instead of local transformers tokenizers."

patterns-established:
  - "LLM wrapper returns AIMessage via ainvoke for node compatibility."
  - "Token counting degrades to lightweight local split count when key unavailable."

requirements-completed: [MR-01, MR-04]

duration: 43 min
completed: 2026-05-17
---

# Phase 27 Plan 01: Model Migration Summary

**Gemini/Gemma cloud inference now wired through google-genai with model-role thinking config and SDK-native token counting.**

## Performance

- **Duration:** 43 min
- **Started:** 2026-05-17T00:00:00Z
- **Completed:** 2026-05-17T00:43:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added `google-genai` dependency and created dedicated migration test suite.
- Implemented Google AI Studio model integration with `GeminiModel` wrapper and `GEMINI_API_KEY` settings support.
- Replaced `transformers` tokenizer path with SDK `count_tokens`, updated router handling, and refreshed graphify graph.

## Task Commits

1. **Task 1: Scaffolding and Dependencies** - `841e49a` (chore)
2. **Task 2 (TDD RED): Config and SDK Integration tests** - `a6da548` (test)
3. **Task 2 (TDD GREEN): Config and SDK Integration implementation** - `e2a2d58` (feat)
4. **Task 3: Tokenizer, Node Alignment, and Quality Checks** - `20a139c` (feat)

## Files Created/Modified
- `api/requirements.txt` - Added `google-genai`; removed local tokenizer package deps (`transformers`, `huggingface-hub`).
- `tests/test_model_migration.py` - Added migration tests for settings, model mapping, thinking config, and SDK token counting.
- `api/core/config.py` - Added `gemini_api_key` setting mapped to `GEMINI_API_KEY`.
- `api/agents/utils/llm.py` - Replaced local vLLM/OpenAI wrapper with Google GenAI `GeminiModel` wrapper and retrying async invocation.
- `api/utils/tokenizer.py` - Migrated token counting to `client.models.count_tokens` with model-role mapping.
- `api/agents/nodes/router.py` - Aligned timeout to settings and normalized response content parsing.

## Decisions Made
- Chose direct `google.genai.Client` integration (not langchain wrapper) to guarantee `thinking_config` control.
- Preserved agent-node interface by returning `AIMessage` from `ainvoke` in wrapper.
- Added bounded retries in `GeminiModel.ainvoke` to mitigate transient API failures (T-27-02 mitigation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added bounded retry behavior for cloud inference calls**
- **Found during:** Task 2 (Config and SDK Integration)
- **Issue:** Initial cloud-call implementation had no resilience against transient API failures.
- **Fix:** Added 3-attempt retry loop in `GeminiModel.ainvoke` before bubbling error.
- **Files modified:** `api/agents/utils/llm.py`
- **Verification:** `pytest tests/test_model_migration.py -k "test_get_model"`
- **Committed in:** `e2a2d58`

**2. [Rule 3 - Blocking] Quality command surfaces pre-existing fallow violations outside task scope**
- **Found during:** Task 3 (Quality Checks)
- **Issue:** `npx --yes fallow --production` fails due large pre-existing dead-code/dependency issues in `web/` unrelated to this migration.
- **Fix:** Executed required command, confirmed failures are out-of-scope and not introduced by plan files.
- **Files modified:** None
- **Verification:** Command output captured during execution.
- **Committed in:** N/A (report-only)

---

**Total deviations:** 2 (1 missing critical auto-fix, 1 blocking out-of-scope report)
**Impact on plan:** Core migration goals completed; out-of-scope quality debt remains in existing web module.

## Issues Encountered
- `fallow --production` reports pre-existing project-wide issues and exits non-zero.

## User Setup Required

External service setup required:
- Set `GEMINI_API_KEY` from https://aistudio.google.com/app/apikey in runtime environment.

## Next Phase Readiness
- Backend model path now cloud-based and test-covered.
- Ready for plan 27-02 cleanup/decommission tasks.

## Self-Check: PASSED

- FOUND: `.planning/phases/27-model-migration-replace-qwen-with-google-ai-studio-gemini-an/27-01-SUMMARY.md`
- FOUND: `841e49a`, `a6da548`, `e2a2d58`, `20a139c`
