---
phase: 23-Onboarding-UX-Improvements
verified: 2026-05-10T19:13:46Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/11
  gaps_closed:
    - "Previously generated onboarding plans are retrievable via GET /api/backend/repo/{id}/onboarding-plan."
    - "Reusable wrapper component OnboardingStepCard exists and is wired into OnboardingGuide."
    - "Backend and Frontend share unified OnboardingPlan contract (setup_commands, key_files.description)."
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run onboarding flow from repo page with focus selection"
    expected: "Choice Poll → streaming status updates → final stepper plan"
    why_human: "Real-time UX flow and visual transitions need browser validation"
  - test: "Trigger SSE failure path"
    expected: "Error message renders from SSE `message` payload and recovery works via Try Again"
    why_human: "Interactive error rendering and recovery affordance are UI-behavior checks"
---

# Phase 23: Onboarding UX Improvements Verification Report

**Phase Goal:** AI-powered onboarding plan generator for repositories with SSE status updates and strict JSON validation.
**Verified:** 2026-05-10T19:13:46Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Frontend receives intermediate loading states | ✓ VERIFIED | `useOnboarding.ts` appends SSE `status` events to `status`; `OnboardingGuide.tsx` renders `StatusStream` while `STREAMING/loading`. |
| 2 | Generated plan conforms to JSON schema | ✓ VERIFIED | `api/agents/onboarding.py:130` uses `OnboardingPlan.model_validate_json(raw_content)` before emitting `plan`. |
| 3 | Retry with exponential backoff on failure | ✓ VERIFIED | `BACKOFF_DELAYS=[1.0,2.0]`, retry loop + `asyncio.sleep(delay)` in `api/agents/onboarding.py:115-153`; test coverage in `tests/test_onboarding_agent.py`. |
| 4 | Cached plans retrievable via standard GET | ✓ VERIFIED | `GET /repo/{repo_id}/onboarding-plan` implemented in `api/routes/repo.py:852-887`; frontend fetches it first in `useOnboarding.ts:65-71`. |
| 5 | Backend and Frontend share unified OnboardingPlan contract (`setup_commands`, `key_files.description`) | ✓ VERIFIED | Backend model fields in `api/db/onboarding_models.py:38-42`; frontend type in `web/src/hooks/useOnboarding.ts:9-22`; prompt schema aligned in `api/agents/onboarding.py:55-61`. |
| 6 | SSE error events emit `message` key | ✓ VERIFIED | Error yield uses `{"type":"error","message":...}` in `api/agents/onboarding.py:158-161`; frontend reads `data.message || data.content` in `useOnboarding.ts:100`. |
| 7 | OnboardingGuide avoids render-phase state updates | ✓ VERIFIED | Transition to `PLAN_READY` moved to `useEffect` with timer in `OnboardingGuide.tsx:22-29`, not render branch. |
| 8 | OnboardingStepCard exists and is wired | ✓ VERIFIED | `OnboardingStepCard.tsx` exists with real `Onboarding`+`FileTree`+`CodeDiff` rendering; imported/used in `OnboardingGuide.tsx:7,80,104`. |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `api/routes/repo.py` | Retrieval endpoint for cached onboarding plans | ✓ VERIFIED | Endpoint exists, resolves repo, queries `repo_onboarding_plans`, returns normalized plan. |
| `web/src/components/onboarding/OnboardingStepCard.tsx` | Reusable wrapper for onboarding steps | ✓ VERIFIED | 46-line substantive component; renders step header + `@pierre/trees`/`@pierre/diffs`; used by guide. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `web/src/hooks/useOnboarding.ts` | `/api/backend/repo/{id}/onboarding-plan` | fetch in `startGeneration` | ✓ WIRED | `fetch(`/api/backend/repo/${repoId}/onboarding-plan`)` at line 65; success short-circuits SSE and sets `plan`. |
| `api/routes/repo.py` | `api/agents/onboarding.py` | function call with `focus` | ✓ WIRED | `start_here()` imports and iterates `generate_onboarding_plan(actual_id, focus=focus)` (lines 821, 838). |
| `api/agents/onboarding.py` | Pydantic strict schema validation | `model_validate_json` before emit | ✓ WIRED | Invalid JSON never emitted as `plan`; only validated model dump is sent. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `web/src/hooks/useOnboarding.ts` | `plan` | `GET /api/backend/repo/{id}/onboarding-plan` then SSE `plan` event fallback | DB-backed GET in route query + validated AI plan path | ✓ FLOWING |
| `api/routes/repo.py` | `plan` row from DB | `SELECT plan FROM repo_onboarding_plans` | Real SQL query result + legacy-key normalization | ✓ FLOWING |
| `web/src/components/onboarding/OnboardingGuide.tsx` | `plan.steps`, `plan.setup_commands` | Hook state from API/SSE | Rendered into stepper + setup guide | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| OnboardingPlan contract fields exist | `python -c "from api.db.onboarding_models import OnboardingPlan; print('setup_commands' in OnboardingPlan.model_fields and 'key_files' in OnboardingPlan.model_fields)"` | `True` | ✓ PASS |
| Agent entry is async generator (SSE producer contract) | `python -c "from api.agents.onboarding import generate_onboarding_plan; import inspect; print(inspect.isasyncgenfunction(generate_onboarding_plan))"` | `True` | ✓ PASS |
| Retrieval + SSE route handlers exported | `python -c "import api.routes.repo as r; print(hasattr(r,'get_onboarding_plan') and hasattr(r,'start_here'))"` | `True` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| FR-03 | 23-01, 23-02, 23-03 | Onboarding UX plan generation via polling/SSE, strict JSON, backoff | ✓ SATISFIED | SSE endpoint + focus status stream + strict `model_validate_json` + backoff + frontend integration verified above. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `web/src/components/onboarding/OnboardingGuide.tsx` | 135 | `return null` fallback | ℹ️ Info | Guard fallback only; not a stub because primary flow has explicit branches. |

### Human Verification Required

### 1. End-to-end realtime onboarding UX

**Test:** Open repo page, click Start Onboarding, select each focus option, observe progression.
**Expected:** Status updates stream while loading, then tailored stepper content appears.
**Why human:** Real-time UX and visual correctness (timing, transitions, readability) cannot be proven by static code checks.

### 2. SSE error rendering path

**Test:** Simulate backend SSE `error` event and use Try Again path.
**Expected:** UI shows message payload and resets to IDLE on retry action.
**Why human:** Interaction feedback and recovery affordance need browser behavior validation.

### Gaps Summary

No remaining blocker gaps from prior verification. All previously failed must-haves now implemented and wired.

---

_Verified: 2026-05-10T19:13:46Z_
_Verifier: the agent (gsd-verifier)_
