---
phase: 23-Onboarding-UX-Improvements
plan: 01
subsystem: onboarding-backend
tags: [onboarding, sse, agent, pydantic, backoff]
dependency_graph:
  requires: [phase-06-sse, phase-21-dual-model]
  provides: [onboarding-plan-api, onboarding-db-schema]
  affects: [api/routes/repo.py]
tech_stack:
  added: []
  patterns: [async-generator-sse, exponential-backoff, pydantic-validation-loop]
key_files:
  created:
    - sql/migrations/0028_add_onboarding_plans_table.sql
    - api/db/onboarding_models.py
    - api/agents/onboarding.py
    - tests/test_onboarding_agent.py
  modified:
    - api/routes/repo.py
decisions:
  - "Used async generator pattern for SSE streaming (consistent with Phase 21 SSE)"
  - "Exponential backoff delays: 1s, 2s for max 3 attempts total"
  - "Focus-specific code_search queries mapped per role category"
metrics:
  duration: "5m"
  completed: "2026-05-10"
  tasks: 3
  files_created: 4
  files_modified: 1
---

# Phase 23 Plan 01: Backend Onboarding Agent & SSE Endpoint Summary

**One-liner:** Focus-tailored onboarding plan generator with Qwen2.5-72B, Pydantic validation retries with exponential backoff, and SSE streaming endpoint.

## What Was Built

### Database Layer
- **Migration 0028**: `repo_onboarding_plans` table (repo_id UUID PK, plan JSONB, updated_at TIMESTAMPTZ) with index on updated_at.
- **Pydantic models**: `OnboardingPlan`, `OnboardingStep`, `KeyFile` — strict schema for LLM output validation.
- **Helper**: `upsert_onboarding_plan()` for DB persistence with conflict handling.

### Agent Layer
- **`generate_onboarding_plan(repo_id, focus)`**: Async generator yielding SSE events.
- **Focus-tailored prompts**: System prompt dynamically built per focus (Backend, Frontend, Fullstack, Exploring).
- **Discovery phase**: `code_search_for_onboarding()` uses focus-specific queries to find relevant code.
- **Validation loop**: `OnboardingPlan.model_validate_json()` with 2 retries, exponential backoff (1s, 2s).
- **Event types**: `status` (progress updates), `plan` (final validated result), `error` (exhausted retries).

### SSE Endpoint
- **`GET /repo/{repo_id}/start-here?focus=Backend`**: StreamingResponse with `text/event-stream`.
- Validates repo_id against DB before streaming.
- Defaults focus to "Exploring" when omitted.

## Task Execution

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Database Migration and Models | `387f4bd` | sql/migrations/0028_*.sql, api/db/onboarding_models.py |
| 2 (RED) | Failing tests for agent | `119e522` | tests/test_onboarding_agent.py |
| 2 (GREEN) | Focus-aware agent with backoff | `eeb7a53` | api/agents/onboarding.py |
| 3 | SSE Endpoint with Focus Parameter | `10ff5c3` | api/routes/repo.py |

## TDD Gate Compliance

- ✅ RED gate: `119e522` — test(23-01) commit with 9 failing tests
- ✅ GREEN gate: `eeb7a53` — feat(23-01) commit, all 9 tests pass
- ⏭ REFACTOR gate: skipped (code clean enough, no refactor needed)

## Test Results

```
tests/test_onboarding_agent.py ......... [100%]
9 passed in 13.45s
```

**Test coverage:**
- Focus personalization (Backend, Frontend prompt influence)
- Status event focus references
- Exponential backoff timing (≥2.5s for 2 retries)
- Max retries exhaustion → error event
- SSE event type validation
- Plan validates as OnboardingPlan model
- Successful plan triggers DB upsert

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Async generator SSE pattern**: Consistent with Phase 21's streaming approach.
2. **Backoff delays [1s, 2s]**: Total 3s worst-case, reasonable for LLM retry.
3. **Focus query mapping**: Backend→"API routes endpoints server database models", Frontend→"React components pages UI hooks styles", etc.

## Self-Check: PASSED

- All 5 files verified present on disk
- All 4 commits verified in git log
