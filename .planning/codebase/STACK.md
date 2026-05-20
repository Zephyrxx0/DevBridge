# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- Python 3.11 - Backend API, jobs, ingestion, agents in `api/*.py` and `api/**/**/*.py` (runtime pinned by `Dockerfile` and `api/Dockerfile`)
- TypeScript - Frontend app/router/components in `web/src/**/*.ts` and `web/src/**/*.tsx`

**Secondary:**
- SQL - Embedded query layer through SQLAlchemy `text(...)` in files like `api/routes/chats.py`, `api/main.py`, `api/reports/generator.py`
- JavaScript (config) - Tooling/config files in `web/jest.config.js`, `web/eslint.config.mjs`, `web/postcss.config.mjs`

## Runtime

**Environment:**
- Python 3.11 slim container for API (`Dockerfile`, `api/Dockerfile`)
- Node.js runtime for Next.js app (`web/package.json` scripts)

**Package Manager:**
- npm (root and web workspaces)
- Lockfile: present (`package-lock.json`, `web/package-lock.json`)

## Frameworks

**Core:**
- FastAPI - HTTP API and route layer (`api/main.py`, `api/routes/*.py`)
- Next.js 16 (App Router) - Web UI and server routes (`web/src/app/**`)
- LangGraph - Agent graph orchestration (`api/agents/graph.py`, `api/agents/orchestrator.py`)

**Testing:**
- Pytest - Python tests in `tests/*.py` and `api/tests/*.py`
- Jest + Testing Library - UI/unit tests (`web/src/**/__tests__/*`, `web/src/hooks/*.test.ts`)
- Playwright - E2E tests (`web/tests/*.spec.ts`, config `web/playwright.config.ts`)

**Build/Dev:**
- Uvicorn - API server dependency in `api/requirements.txt`
- ESLint - Frontend linting in `web/eslint.config.mjs`
- Tailwind CSS v4 - Styling deps in `web/package.json`

## Key Dependencies

**Critical:**
- `google-genai` - Gemini/Gemma remote inference client in `api/agents/utils/llm.py`, `api/utils/tokenizer.py`
- `cascadeflow[langchain]` - Fast/Big model cascade orchestration in `api/agents/nodes/cascade.py`
- `hindsight-all-slim` + `hindsight-langgraph` - Memory/recall integration in `api/db/hindsight.py`, `api/agents/graph.py`

**Infrastructure:**
- `sqlalchemy` + `asyncpg` + `psycopg` - DB access + scheduler job store (`api/db/session.py`, `api/core/scheduler.py`)
- `fastapi-cache2[redis]` - cache abstraction (`api/main.py`, `api/db/cache.py`)
- `@supabase/ssr` + `@supabase/supabase-js` - auth/session + DB access on web (`web/src/utils/supabase/*.ts`)

## Configuration

**Environment:**
- Centralized app settings in `api/core/config.py` via pydantic settings
- Required integration config keys referenced in code:
  - `SUPABASE_CONNECTION_STRING` (`api/core/config.py`, `api/db/session.py`)
  - `GEMINI_API_KEY` (`api/core/config.py`, `api/agents/utils/llm.py`, `api/utils/tokenizer.py`)
  - `GITHUB_WEBHOOK_SECRET` (`api/core/config.py`, `api/routes/webhooks.py`)
  - `GITHUB_TOKEN`/`GITHUB_API_TOKEN`/`GITHUB_SYNC_USER_ID` (`api/ingestion/history.py`, `api/main.py`)
  - `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`web/src/utils/supabase/client.ts`, `web/src/utils/supabase/server.ts`)
- `.env` files are present (`.env`, `web/.env`, `web/.env.local`, `web/.env.vercel.production`) and must remain secret-managed

**Build:**
- API image/build: `Dockerfile`, `api/Dockerfile`, `docker-compose.yml`
- Web build/dev: `web/package.json`, `web/next.config.ts`, `web/tsconfig.json`

## Platform Requirements

**Development:**
- Python 3.11 + pip for API (`Dockerfile`, `api/requirements.txt`)
- Node/npm for web (`web/package.json`)
- Local ports expected by E2E: `3000` web, `8000` API (`web/playwright.config.ts`)

**Production:**
- Containerized API on port 8080 (`Dockerfile`, `api/run_server.py`)
- Supabase Postgres required for runtime DB (`api/core/config.py`, `api/db/session.py`)
- Remote model inference via Google AI Studio/Gemini API key (no local GPU model runtime in active code path)

## Model Inventory & Migration Status

**Current target models (active):**
- Big: `gemini-2.5-flash` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`
- Fast: `gemma-4-26b-a4b-it` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`
- Access mode: remote Gemini API client `genai.Client(api_key=settings.gemini_api_key)` in `api/agents/utils/llm.py`

**Deprecated model references removed:**
- Default model type now `"gemini"` in `api/routes/chats.py` and `api/utils/tokenizer.py`.
- Tests now assert `gemini-2.5-flash` and `gemma-4-26b-a4b-it`.
- Legacy specs updated to AI Studio model pair where applicable.

---

*Stack analysis: 2026-05-20*
