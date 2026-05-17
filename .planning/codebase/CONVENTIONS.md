# Coding Conventions

**Analysis Date:** 2026-05-24

## Naming Patterns

**Files:**
- Python: `snake_case.py` (e.g., `api/main.py`, `api/agents/orchestrator.py`)
- TypeScript/React: `kebab-case.tsx` or `kebab-case.ts` (e.g., `web/src/components/hero-dithering-card.tsx`, `web/src/hooks/useOnboarding.ts`)
- Tests: `test_*.py` for Python, `*.test.ts` or `*.spec.ts` for TypeScript.

**Functions:**
- Python: `snake_case` (e.g., `sync_issues`, `_repo_slug_from_github_url`)
- React Components: `PascalCase` (e.g., `HomePage`, `SectionHeading`)
- TypeScript Helpers/Hooks: `camelCase` (e.g., `useOnboarding`, `getGithubToken`)

**Variables:**
- Python: `snake_case` (e.g., `allowed_origins`, `client_is_trusted`)
- TypeScript: `camelCase` (e.g., `cachedPlan`, `mockPlan`)
- Constants: `UPPER_CASE` (e.g., `BIG_MODEL_PORT` in `api/core/config.py`)

**Types:**
- Python (Pydantic): `PascalCase` (e.g., `ChatRequest`, `Settings`)
- TypeScript: `PascalCase` for Interfaces and Types (e.g., `interface StatusStep` in `useOnboarding.ts`)

## Code Style

**Formatting:**
- Python: Ruff (indicated by `.ruff_cache`)
- Frontend: Prettier (implied by Next.js defaults and `package.json`)

**Linting:**
- Python: Ruff
- Frontend: ESLint with `eslint-config-next` (configured in `web/eslint.config.mjs`)

## Import Organization

**Order (Python):**
1. Standard library imports
2. Third-party library imports
3. Local module imports (using `api.*` prefix)

**Order (TypeScript):**
1. External React/Next.js imports
2. Third-party libraries (e.g., `lucide-react`, `motion`)
3. Internal components (`@/components/...`)
4. UI primitives (`@/components/ui/...`)
5. Internal hooks/utils (`@/hooks/...`, `@/utils/...`)

**Path Aliases:**
- `@/*` maps to `web/src/*` (configured in `web/tsconfig.json`)

## Error Handling

**Patterns:**
- Backend: Use `logger.exception("...")` for internal errors and raise `fastapi.HTTPException` for client-facing errors.
- Frontend: Use try/catch blocks within hooks and async functions, setting local `error` states to display in the UI.

## Logging

**Framework:** `logging` (Standard Python library)

**Patterns:**
- Use module-level loggers: `logger = logging.getLogger(__name__)`.
- Log exceptions with stack traces using `logger.exception()`.
- Use `logger.info()` and `logger.warning()` for significant lifecycle events.

## Comments

**When to Comment:**
- Use docstrings for major functions and background jobs (e.g., `api/main.py`'s `sync_issues`).
- Use block comments for major sections in large files (e.g., `web/src/app/page.tsx`).

**JSDoc/TSDoc:**
- Minimal usage, primarily relying on TypeScript types for documentation.

## Function Design

**Size:** React components are often modularized into smaller sub-components within the same file or moved to `src/components`.

**Parameters:**
- Python: Extensive use of Type Hinting and Pydantic models for request bodies.
- TypeScript: Use of object destructuring for component props with explicit type definitions.

**Return Values:**
- Python: Type-hinted return values, often `dict`, `StreamingResponse`, or Pydantic models.

## Module Design

**Exports:**
- React: Prefer `export default function Name()` for the main component of a file.
- TypeScript: Named exports for utilities and constants.
- Python: Direct imports from modules, using `__init__.py` (if present) to manage package visibility.

**Barrel Files:**
- Limited usage (e.g., `api/routes/__init__.py` might exist but routes are often imported individually in `api/main.py`).

---

*Convention analysis: 2026-05-24*
