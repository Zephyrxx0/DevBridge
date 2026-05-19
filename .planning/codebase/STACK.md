# Technology Stack

**Analysis Date:** 2025-05-15

## Languages

**Primary:**
- Python 3.11 - Backend API and Agents (`api/`)
- TypeScript - Frontend and Shared Types (`web/`, `api/`)

**Secondary:**
- SQL - Database migrations and hybrid search logic (`sql/`, `supabase/`)
- Shell/Bash - Build and utility scripts (`scripts/`)

## Runtime

**Environment:**
- Node.js (version not explicitly pinned, typically >= 18 for Next.js 16)
- Python 3.11 (specified in `api/Dockerfile`)

**Package Manager:**
- npm - Frontend package management (`web/`)
- pip - Backend package management (`api/requirements.txt`)
- Lockfile: `package-lock.json` (root/web), `api/requirements.txt` (versions pinned for some deps)

## Frameworks

**Core:**
- Next.js 16.2.3 - Frontend Framework (`web/`)
- FastAPI - Backend API Framework (`api/main.py`)
- LangGraph 1.1.7 - LLM Orchestration and Agent workflows (`api/agents/`)

**Testing:**
- Pytest - Backend unit and integration testing (`tests/`, `pytest.ini`)
- Jest - Frontend unit testing (`web/jest.config.js`)
- Playwright - End-to-end testing (`web/playwright.config.ts`)

**Build/Dev:**
- Docker - Containerization (`Dockerfile`, `docker-compose.yml`)
- Tailwind CSS 4 - Utility-first CSS framework (`web/`)

## Key Dependencies

**Critical:**
- Pydantic / Pydantic Settings - Data validation and configuration management (`api/core/config.py`)
- SQLAlchemy / asyncpg - Database ORM and async driver (`api/db/`)
- pgvector - Vector similarity search in PostgreSQL (`api/db/vector_store.py`)
- LangChain - LLM abstractions and tools (`api/agents/orchestrator.py`)
- Tree-sitter - Code parsing for chunking and analysis (`api/ingest/`)

**Infrastructure:**
- Radix UI - Primitive UI components (`web/`)
- Framer Motion (motion) - Animation library (`web/`)
- Tiptap - Rich-text editor components (`web/`)
- Shiki - Syntax highlighting (`web/`)

## Configuration

**Environment:**
- `.env` files (managed via `python-dotenv` in API, Next.js built-in for Web)
- `api/core/config.py` - Centralized Pydantic-based configuration

**Build:**
- `next.config.ts` - Next.js build configuration
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` / `docker-compose.yml` - Container orchestration

## Platform Requirements

**Development:**
- Docker Desktop or equivalent
- Node.js environment
- Python 3.11 environment
- Local LLM server (optional, e.g., Ollama/vLLM) for big/fast model routing

**Production:**
- Google Cloud Platform (Cloud Run recommended based on `Procfile` and `Dockerfile` patterns)
- Supabase (PostgreSQL + pgvector)

---

*Stack analysis: 2025-05-15*
