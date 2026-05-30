# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:**
- Frontend unit/integration runner: Jest `^30.4.2` via `web/package.json` script `test`.
- Frontend e2e runner: Playwright `^1.59.1` via `web/package.json` script `test:e2e`.
- Backend runner: Pytest via `pytest.ini` + `tests/` and `api/tests/` suites.
- Config files: `web/jest.config.js`, `web/playwright.config.ts`, `pytest.ini`.

**Assertion Library:**
- Jest + Testing Library assertions (`@testing-library/jest-dom`) in `web/src/components/chat/__tests__/ChatStream.test.tsx`.
- Playwright `expect` in `web/tests/*.spec.ts`.
- Pytest native `assert` style in `api/tests/*.py` and `tests/e2e/*.py`.

**Run Commands:**
```bash
npm run test --prefix web                    # Run frontend Jest tests
npm run test:e2e --prefix web               # Run Playwright browser tests
pytest                                       # Run python tests under pytest.ini testpaths
```

## Test File Organization

**Location:**
- Frontend unit tests are mixed between co-located and near-source:
  - `web/src/components/chat/__tests__/ChatStream.test.tsx`
  - `web/src/hooks/useOnboarding.test.ts`
- Frontend e2e tests are centralized in `web/tests/*.spec.ts`.
- Backend/API tests sit under `api/tests/*.py`.
- Additional root e2e pytest suite uses `tests/e2e/*.py` with shared fixtures in `tests/e2e/conftest.py`.

**Naming:**
- Jest includes `.test.ts(x)` and excludes `.spec.ts` by config (`web/jest.config.js` `testPathIgnorePatterns`).
- Playwright uses `.spec.ts` in `web/tests` (`web/playwright.config.ts` `testDir: './tests'`).
- Pytest uses `test_*.py` patterns in `api/tests/` and `tests/e2e/`.

**Structure:**
```
web/src/**/__tests__/*.test.tsx
web/src/**/*.test.ts
web/tests/*.spec.ts
api/tests/test_*.py
tests/e2e/test_*.py
```

## Test Structure

**Suite Organization:**
```typescript
describe("ChatStream escalation indicator", () => {
  it("renders escalation indicator when metadata is present", () => {
    render(<ChatStream ... />);
    expect(screen.getByTestId("escalation-indicator")).toBeInTheDocument();
  });
});
```
Pattern source: `web/src/components/chat/__tests__/ChatStream.test.tsx`.

**Patterns:**
- Setup pattern: define base fixtures in-closure (`baseMessage`) and render components with minimal prop surface (`web/src/components/chat/__tests__/ChatStream.test.tsx`).
- Teardown pattern: explicit global restore in lifecycle hooks (`beforeAll`/`afterAll`) for global APIs in `web/src/hooks/useOnboarding.test.ts`.
- Assertion pattern: use semantic queries (`getByText`, `getByTestId`, `queryByTestId`) in UI tests.

## Mocking

**Framework:** Jest mock system + Playwright route interception + Pytest monkeypatch

**Patterns:**
```typescript
jest.mock("@/components/chat/ArtifactViewer", () => ({ ArtifactViewer: () => null }));

await page.route("**/api/backend/**", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
});
```
Pattern sources: `web/src/components/chat/__tests__/ChatStream.test.tsx`, `web/tests/escalation-ux.spec.ts`.

```python
monkeypatch.setattr(main.graph, "ainvoke", fake_ainvoke)
monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test-token")
```
Pattern source: `api/tests/test_phase29_memory.py`.

**What to Mock:**
- UI child components not under test (`@/components/ai-elements/*`, feedback/artifact helpers) in `web/src/components/chat/__tests__/ChatStream.test.tsx`.
- Network boundaries in e2e via route stubs for deterministic UI state in `web/tests/escalation-ux.spec.ts`.
- Expensive/side-effecting backend collaborators (`main.graph.ainvoke`, reflection tasks) in `api/tests/test_phase29_memory.py`.

**What NOT to Mock:**
- Do not mock the component/hook under direct behavioral assertion.
- Do not bypass authorization flows in API tests when verifying auth and user isolation (`api/tests/test_phase29_memory.py`).

## Fixtures and Factories

**Test Data:**
```python
def _chat_payload() -> dict:
    return {"message": "hello", "thread_id": "thread-1", "repo_id": None}
```
Pattern source: `api/tests/test_phase29_memory.py`.

```typescript
const repoId = process.env.E2E_REPO_ID ?? "11111111-1111-1111-1111-111111111111";
```
Pattern source: `web/tests/chat.spec.ts`, `web/tests/escalation-ux.spec.ts`.

**Location:**
- Backend helper fixtures are local to file (e.g., `_chat_payload` in `api/tests/test_phase29_memory.py`).
- Cross-suite pytest fixtures live in `tests/e2e/conftest.py` and `tests/conftest.py`.

## Coverage

**Requirements:** None enforced in inspected configs.

**View Coverage:**
```bash
npm run test --prefix web -- --coverage
```

## Test Types

**Unit Tests:**
- React rendering and state logic checks with deep component mocking (`web/src/components/chat/__tests__/ChatStream.test.tsx`, `web/src/hooks/useOnboarding.test.ts`).

**Integration Tests:**
- FastAPI `TestClient` tests validating auth, isolation, reflection dispatch, and DB-adjacent behavior through monkeypatched dependencies (`api/tests/test_phase29_memory.py`, `api/tests/test_phase31_memory.py`, `api/tests/test_phase32_sse.py`).

**E2E Tests:**
- Browser workflow checks with Playwright in `web/tests/*.spec.ts`.
- Additional python e2e suite marked with `@pytest.mark.e2e` and configured via `pytest.ini` + `tests/e2e/conftest.py`.

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
  await result.current.startGeneration("Backend");
});
```
Pattern source: `web/src/hooks/useOnboarding.test.ts`.

```python
async def fake_ainvoke(input_data, config):
    return {"messages": [SimpleNamespace(content="ok")]}
```
Pattern source: `api/tests/test_phase29_memory.py`.

**Error Testing:**
```typescript
act(() => {
  es.onerror?.(new Event("error"));
});
expect(result.current.error).toBe("Connection lost. Please try again.");
```
Pattern source: `web/src/hooks/useOnboarding.test.ts`.

```python
assert response.status_code == 401
assert response.json()["detail"] == "Authentication required"
```
Pattern source: `api/tests/test_phase29_memory.py`.

## Model Assumption Drift: Resolution

**Current runtime model contract (source of truth):**
- Fast path model: `gemma-4-26b-a4b-it` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`.
- Big path model: `gemini-2.5-flash` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`.

**Outdated assumptions resolved:**
- Test fixtures now use `gemini-2.5-flash` and `gemma-4-26b-a4b-it`.
- `model_type` default set to `"gemini"` in runtime request schema.

---

*Testing analysis: 2026-05-20*
