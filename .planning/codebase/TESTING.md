# Testing Patterns

**Analysis Date:** 2024-05-18

## Test Framework

**Runner:**
- Backend: `pytest` (v9.x) with `pytest-asyncio`. Configured via `pytest.ini`.
- Frontend/E2E: `Playwright` (v1.59.1). Configured via `web/playwright.config.ts`.

**Assertion Library:**
- Backend: Built-in `assert`.
- Frontend: `@playwright/test` `expect`.

**Run Commands:**
```bash
# Backend
pytest                      # Run all non-E2E tests (if markers configured)
pytest -m "not e2e"         # Exclude E2E tests explicitly
pytest -m e2e               # Run E2E tests

# Frontend
cd web && npm run test:e2e  # Run Playwright E2E tests
```

## Test File Organization

**Location:**
- Backend: Separate `tests/` directory at the project root.
- Frontend: Separate `web/tests/` directory for Playwright specs.

**Naming:**
- Backend: `test_*.py` (e.g., `tests/test_vector_db.py`, `tests/test_webhooks.py`).
- Frontend: `*.spec.ts` (e.g., `web/tests/ingestion_loop.spec.ts`).

**Structure:**
```
[project-root]/
├── tests/                 # Backend and API tests
│   ├── e2e/               # E2E specific Python tests
│   └── test_*.py
└── web/
    └── tests/             # Frontend Playwright specs
        └── *.spec.ts
```

## Test Structure

**Suite Organization:**
- Python: Flat functions prefixed with `test_` or grouped in classes.
- TypeScript: Uses `test.describe('...', () => { test('...', async () => {}) })`.

**Patterns:**
- Python Setup/Teardown: Uses `pytest` fixtures with `yield` for setup/teardown (e.g., `@pytest.fixture`).
- TypeScript Setup/Teardown: `test.beforeAll` and `test.afterAll` hooks (often invoking python CLI scripts like `scripts/cleanup_e2e.py`).

## Mocking

**Framework:** `pytest` built-in `monkeypatch`.

**Patterns:**
```python
@pytest.fixture
def webhook_secret(monkeypatch):
    secret = "test_secret"
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", secret)
    # Mocking settings config
    from api.core.config import settings
    monkeypatch.setattr(settings, "github_webhook_secret", secret)
    return secret
```

**What to Mock:**
- Environment variables.
- External API calls (e.g., GitHub webhooks, LLM integrations like Vertex AI fallback mock).

## Fixtures and Factories

**Test Data:**
- Simple payloads mocked inline:
```python
payload = {"action": "opened", "pull_request": {"number": 1}}
```

**Location:**
- Root `tests/conftest.py` and `tests/e2e/conftest.py` are utilized for shared fixtures.

## Coverage

**Requirements:** None enforced explicitly in the files viewed, though `.fallow` handles codebase health metrics automatically on commit.

## Test Types

**Unit Tests:**
- Heavy focus on individual API modules (e.g., `tests/test_webhooks.py`). Uses FastAPI `TestClient` for endpoint unit testing.

**Integration Tests:**
- Database tests verify connection string parsing and configurations without executing network I/O (`tests/test_vector_db.py`).

**E2E Tests:**
- Python: Uses `@pytest.mark.e2e`. URL and repo configured in `pytest.ini` (`e2e_api_url`, `e2e_test_repo`).
- Frontend: Playwright tests (`web/tests/ingestion_loop.spec.ts`) execute full browser automation, triggering real python worker scripts and verifying Next.js UI updates.

## Common Patterns

**Async Testing:**
- Playwright uses `async`/`await` extensively.
- Python tests use `pytest.mark.asyncio` when testing async backend operations or FastAPI endpoints.

**E2E Script Coordination:**
- The Playwright tests coordinate with Python CLI tools directly via `child_process.execSync` to seed data or perform cleanup operations.
```typescript
execSync(`python ${path.join(rootDir, 'scripts/cleanup_e2e.py')} --repo ${repoName}`);
```

---

*Testing analysis: 2024-05-18*
