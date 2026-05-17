# Testing Patterns

**Analysis Date:** 2026-05-24

## Test Framework

**Runner:**
- Backend: `pytest` 8.x (configured in `pytest.ini`)
- Frontend: `Jest` (for unit tests, configured in `web/jest.config.js`) and `Playwright` (for E2E tests, configured in `web/playwright.config.ts`)

**Assertion Library:**
- Python: Built-in `assert`
- TypeScript: `expect` (Jest/Playwright)

**Run Commands:**
```bash
pytest                  # Run backend tests
pytest -m e2e           # Run backend E2E tests
npm test                # Run frontend unit tests (Jest)
npm run test:e2e        # Run frontend E2E tests (Playwright)
```

## Test File Organization

**Location:**
- Backend: `tests/` directory at root (e.g., `tests/test_annotations.py`).
- Frontend Unit: Co-located with implementation (e.g., `web/src/hooks/useOnboarding.test.ts`).
- Frontend E2E: `web/tests/` (e.g., `web/tests/admin.spec.ts`).

**Naming:**
- Backend: `test_*.py`
- Frontend Unit: `*.test.ts` or `*.test.tsx`
- Frontend E2E: `*.spec.ts`

**Structure:**
```
[project-root]/
├── tests/              # Backend tests
│   ├── e2e/            # Backend E2E
│   └── conftest.py     # Pytest fixtures
└── web/
    ├── src/
    │   └── hooks/
    │       └── name.test.ts  # Co-located unit tests
    └── tests/          # Frontend E2E tests
```

## Test Structure

**Suite Organization:**
```python
# Backend (pytest)
@pytest.mark.asyncio
async def test_feature_name(monkeypatch):
    # Setup
    # Execute
    # Assert
```

```typescript
// Frontend (Jest)
describe("ComponentOrHook", () => {
  it("should do something", () => {
    // Setup
    // Execute
    // Assert
  });
});
```

**Patterns:**
- **Async Testing:** Use `@pytest.mark.asyncio` in Python and `async/await` with `act` in React.
- **Setup:** Use `beforeEach` in Jest and `conftest.py` or direct setup in pytest functions.

## Mocking

**Framework:**
- Python: `monkeypatch` (pytest fixture).
- TypeScript: `jest.fn()` and manual class mocks.

**Patterns:**
```python
# Backend: Mocking DB engine in routes
def test_something(monkeypatch):
    conn = FakeConnection()
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: FakeEngine(conn))
```

```typescript
// Frontend: Mocking global EventSource
class MockEventSource { ... }
beforeAll(() => {
  (global as any).EventSource = MockEventSource;
});
```

**What to Mock:**
- Database connections (`FakeConnection`).
- External APIs (GitHub, EventSource).
- Environment variables.

**What NOT to Mock:**
- Pydantic models and data structures.
- Internal utility functions (unless they hit network/disk).

## Fixtures and Factories

**Test Data:**
```python
# Manual creation of dicts/models in tests
created = await annotation_routes.create_annotation(
    annotation_routes.AnnotationCreate(
        repo_id=str(uuid4()),
        file_path="api/main.py",
        comment="Test",
    ),
    request=make_request("user-123"),
)
```

**Location:**
- Backend fixtures often in `tests/conftest.py` (though currently sparse).

## Coverage

**Requirements:** Not strictly enforced in visible configs, but `fallow` is used for general health checks.

**View Coverage:**
```bash
pytest --cov=api tests/
```

## Test Types

**Unit Tests:**
- Backend: Testing route handlers and logic with faked dependencies.
- Frontend: Testing hooks (`renderHook`) and utility functions.

**Integration Tests:**
- Backend: Testing model interactions and complex flows (e.g., `test_assemble_context_includes_annotations`).

**E2E Tests:**
- Playwright: Testing API endpoints and UI flows from a browser perspective.
- Backend E2E: Markers used in pytest for network-heavy or long-running tests.

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
  await result.current.startGeneration("Backend");
});
```

**Error Testing:**
```python
with pytest.raises(HTTPException) as exc:
    await annotation_routes.update_annotation(...)
assert exc.value.status_code == 403
```

---

*Testing analysis: 2026-05-24*
