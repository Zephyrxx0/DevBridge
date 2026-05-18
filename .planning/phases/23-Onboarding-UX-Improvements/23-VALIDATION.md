# Phase 23 Validation: Onboarding UX Improvements

## 1. Test Architecture

### 1.1 Backend Tests
- **Location**: `tests/test_onboarding_agent.py`
- **Focus**:
    - **Personalization**: Verify that the `focus` parameter correctly influences the LLM prompt and result.
    - **Validation & Retries**: Mock invalid LLM output and verify that the agent retries with exponential backoff.
    - **SSE Stream**: Verify that status updates are yielded before the final plan.
    - **Persistence**: Verify that successful plans are stored in `repo_onboarding_plans`.

### 1.2 Frontend Tests
- **Location**: `web/src/hooks/useOnboarding.test.ts`
- **Focus**:
    - **SSE Connection**: Verify that `EventSource` is correctly initialized with the `focus` query parameter.
    - **State Management**: Verify that `status`, `plan`, and `loading` states are updated correctly on SSE messages.
    - **Cleanup**: Verify that the `EventSource` is closed on unmount.

### 1.3 End-to-End (E2E) Tests
- **Location**: `web/tests/onboarding.spec.ts` (Playwright)
- **Focus**:
    - **Complete Flow**: Click Trigger -> Select Focus in Poll -> Observe Loading -> View Final Plan.
    - **Component Integration**: Verify that `@pierre/trees` and `@pierre/diffs` render within the `Onboarding` walkthrough.

## 2. Verification Steps

### 2.1 Quality Checklist
- [ ] SSE endpoint accepts `focus` parameter.
- [ ] Agent implements exponential backoff for retries.
- [ ] UI displays `ChoicePoll` before generation.
- [ ] Walkthrough uses `cult-ui` and `@pierre` components.
- [ ] All components follow Orange Flame brand guidelines.

### 2.2 Final Verification
```bash
# Backend
pytest tests/test_onboarding_agent.py

# Frontend
npm test web/src/hooks/useOnboarding.test.ts
npm run lint web/src/components/onboarding/

# Knowledge Graph
graphify update .
```
