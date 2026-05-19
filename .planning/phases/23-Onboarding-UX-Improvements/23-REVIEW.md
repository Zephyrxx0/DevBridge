# Phase 23 Code Review

Date: 2026-05-11
Scope: Phase 23 (plans 01 + 02)
Depth: standard (per-file analysis)

## Verdict

- Status: **CHANGES REQUIRED**
- Critical: 1
- Warning: 3
- Info: 2

## Findings

### [CRITICAL] Frontend/Backend contract mismatch breaks onboarding UI

- Files: `web/src/hooks/useOnboarding.ts`, `web/src/components/onboarding/OnboardingGuide.tsx`, `api/db/onboarding_models.py`
- Problem:
  - Backend plan schema uses `setup: string` and `key_files[].why`.
  - Frontend expects `setup_commands: string[]` and `key_files[].description`.
  - Result: setup step often not rendered (`plan.setup_commands` undefined) and key-file descriptions not available.
- Evidence:
  - Backend model: `api/db/onboarding_models.py` defines `setup` + `why`.
  - Frontend types/rendering: `web/src/hooks/useOnboarding.ts` and `web/src/components/onboarding/OnboardingGuide.tsx` rely on `setup_commands`.
- Fix:
  - Align single schema across backend + frontend.
  - Preferred: backend emits `setup_commands: string[]` and `key_files[].description` (or frontend maps fallback from `setup`/`why`).
  - Add contract test to lock shape.

### [WARNING] SSE error payload key mismatch hides real error

- File: `web/src/hooks/useOnboarding.ts`
- Problem:
  - Hook reads `data.message` for `type === "error"`.
  - Backend emits error payload in `content` (`{"type":"error","content":"..."}`).
  - UI shows generic fallback instead of actual backend reason.
- Evidence:
  - Frontend: `setError(data.message || "An error occurred")`.
  - Backend: `yield {"type": "error", "content": ...}` in `api/agents/onboarding.py`.
- Fix:
  - Read `data.content ?? data.message` in hook.
  - Extend hook tests to cover backend-style error events.

### [WARNING] React state update during render in `OnboardingGuide`

- File: `web/src/components/onboarding/OnboardingGuide.tsx`
- Problem:
  - Component calls `setFlowState("PLAN_READY")` directly inside render branch.
  - This is render-phase side effect; can cause strict-mode warnings and rerender loops.
- Evidence:
  - `if (flowState === "STREAMING" && !loading && plan) { setFlowState("PLAN_READY"); }`
- Fix:
  - Move transition into `useEffect` watching `[flowState, loading, plan]`.

### [WARNING] Phase summary references missing file

- File: `.planning/phases/23-Onboarding-UX-Improvements/23-02-SUMMARY.md`
- Problem:
  - Summary lists `web/src/components/onboarding/OnboardingStepCard.tsx` as created.
  - File does not exist in tree.
- Risk:
  - Documentation drift; future audits/changelogs inaccurate.
- Fix:
  - Either create file if intended, or update summary manifest.

### [INFO] Internal API usage on vector store

- File: `api/agents/onboarding.py`
- Note:
  - Uses `vector_db._vectorstore` (private attribute).
  - Private internals can break on refactor.
- Suggestion:
  - Expose stable `is_initialized()` or safe accessor on vector DB wrapper.

### [INFO] Test fidelity gap in frontend hook tests

- File: `web/src/hooks/useOnboarding.test.ts`
- Note:
  - Plan fixture uses `setup_commands`/`description`, but backend currently emits `setup`/`why`.
  - Tests pass while integration contract fails.
- Suggestion:
  - Add integration-style fixture from backend schema or shared typed contract package.

## Suggested fix order

1. Unify onboarding plan schema + update frontend rendering/types.
2. Fix SSE error key handling (`content` vs `message`).
3. Move flow state transition to `useEffect`.
4. Clean phase summary file list.
5. Optional hardening: vector store API cleanup + stronger contract tests.
