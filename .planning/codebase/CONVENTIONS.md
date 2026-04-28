# Coding Conventions

**Analysis Date:** 2024-05-18

## Naming Patterns

**Files:**
- Frontend: `kebab-case.tsx` for components (e.g., `web/src/components/ui/button.tsx`, `web/src/components/add-repo-modal.tsx`) and Next.js special files (`page.tsx`, `layout.tsx`).
- Backend (Python): `snake_case.py` for modules (e.g., `api/db/vector_store.py`, `api/db/session.py`).

**Functions:**
- Python: `snake_case` (e.g., `init_db_pool`, `_conninfo_to_url`).
- TypeScript (Frontend): `PascalCase` for React components (`Button`, `CodebaseGraph`), `camelCase` for utilities.

**Variables:**
- Python: `snake_case`.
- TypeScript: `camelCase`.

**Types:**
- Python: Uses standard library typing and Pydantic models (`PascalCase` like `ChatRequest`).
- TypeScript: `PascalCase` for Interfaces and Types.

## Code Style

**Formatting:**
- Backend: Ruff (inferred via `.ruff_cache` in the directory). Uses standard Python formatting with type hints.
- Frontend: ESLint, Prettier (implied by standard Next.js setups). Tailored styling with Tailwind CSS v4.

**Linting:**
- Backend: Ruff (caching observed).
- Frontend: ESLint (via `web/eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` and `typescript`.
- Automated Analysis: `fallow` runs automatically via `scripts/hooks/post-analysis` to check dead code, complexity, and duplication.

## Import Organization

**Order:**
- Python: 
  1. `__future__` imports
  2. Standard library (`os`, `json`, `asyncio`, `logging`)
  3. Third-party (`fastapi`, `langchain`, `sqlalchemy`)
  4. Internal modules (`api.db.models`, `api.core.config`)
- Frontend:
  1. React/Next.js imports (`next/link`)
  2. Third-party UI/Icons (`lucide-react`, `@base-ui/react`)
  3. Internal Components (`@/components/...`)
  4. Utilities (`@/lib/utils`)

**Path Aliases:**
- Frontend: Uses `@/` prefix to resolve paths relative to `web/src`.
- Backend: Absolute imports from root (e.g., `from api.db.session import...`).

## Error Handling

**Patterns:**
- Backend: Raises explicit standard exceptions like `ValueError` or `RuntimeError` internally. FastAPI route endpoints catch errors and raise `HTTPException(status_code=..., detail=...)`.
- Frontend: Relying on standard React patterns, API route fetches handle errors conditionally based on responses.

## Logging

**Framework:** `logging` standard Python library.

**Patterns:**
- Instantiated at the module level: `logger = logging.getLogger(__name__)`.
- Used extensively for info/warnings/errors (`logger.info(...)`, `logger.exception(...)`).

## Comments

**When to Comment:**
- Docstrings are used for major classes/methods (e.g., `"""Placeholder tests for..."""`).
- Inline comments used primarily for complex logic explanation or marking future work (`# TODO(phase-02): replace with real AsyncEngine`).
- `fallow` enforces low complexity and readable code, keeping inline comments minimal and focused on "why".

**JSDoc/TSDoc:**
- Used sparingly on React components or configuration objects (e.g., `web/playwright.config.ts`).

## Function Design

**Size:** Enforced by `fallow` complexity checks; methods are typically single-responsibility and lean.

**Parameters:** 
- Python: Strict type hints required (`def _conninfo_to_url(connection_string: str) -> str:`).
- TypeScript: Strongly typed component props extending primitive types when applicable.

## Module Design

**Exports:** 
- Python: Direct import from module (`from api.db.session import init_db_pool`). No strict barrel files.
- TypeScript: Direct named exports or default exports for Next.js route components. Barrel pattern not strictly enforced.

---

*Convention analysis: 2024-05-18*
