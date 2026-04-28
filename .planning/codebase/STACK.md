# Technology Stack

**Analysis Date:** 2026-04-28

## Languages

**Primary:**
- TypeScript - Frontend and proxy logic in `web/`
- Python - Backend API, agents, and ingestion in `api/` and `scripts/`

**Secondary:**
- SQL - Database migrations and vector store setup in `sql/` and `supabase/`

## Runtime

**Environment:**
- Node.js (v20+) - For Next.js frontend
- Python (v3.x) - For FastAPI backend

**Package Manager:**
- npm - Used in `web/package.json` and root
- Lockfile: present (`package-lock.json` in root and `web/`)

## Frameworks

**Core:**
- Next.js 16.2.3 - Frontend React framework (`web/package.json`)
- FastAPI - Backend API framework (`api/main.py`)

**Testing:**
- Playwright - E2E testing for frontend (`web/playwright.config.ts`)
- Pytest - Backend testing framework (`pytest.ini`, `tests/`)

**Build/Dev:**
- Tailwind CSS 4 - Utility-first styling
- ESLint 9 - Code linting (`web/eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@supabase/ssr` / `@supabase/supabase-js` - Supabase integration on the frontend
- `langchain_google_vertexai` / `langchain_core` - AI orchestration and tool usage (`api/ingestion/history.py`)
- `sqlalchemy` - ORM for backend Postgres database (`api/routes/annotations.py`)

**Infrastructure:**
- `@base-ui/react`, `@radix-ui/*` - Accessible unstyled components (`web/components/ui/`)
- `lucide-react` - Icons
- `fastapi-cache2` - Backend response caching (`api/main.py`)

## Configuration

**Environment:**
- Environment variables defined in `.env` and `.env.example`
- Core settings loaded via `pydantic` in `api/core/config.py`

**Build:**
- Frontend: `web/next.config.ts`, `web/postcss.config.mjs`, `web/eslint.config.mjs`, `web/tsconfig.json`

## Platform Requirements

**Development:**
- Node.js 20+, Python 3.x
- Local Supabase instance or remote connection

**Production:**
- Google Cloud Run (defined in `infra/cloudrun/`)

---

*Stack analysis: 2026-04-28*