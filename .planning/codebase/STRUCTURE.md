# Codebase Structure

**Analysis Date:** 2024-05-24

## Directory Layout

```
[project-root]/
├── api/             # Python FastAPI backend service
│   ├── agents/      # LLM orchestration and LangChain logic
│   ├── core/        # Central configurations and secrets
│   ├── db/          # Database connection, caching, and ORM models
│   ├── ingest/      # Queue and worker logic for chunking tasks
│   ├── ingestion/   # Code extraction and Tree-sitter chunking pipeline
│   ├── routes/      # FastAPI endpoint definitions
│   └── tests/       # Backend automated testing
├── config/          # Global application or agent configuration
├── infra/           # Terraform configurations
│   ├── cloudrun/    # Infrastructure for Google Cloud Run
│   ├── gcs/         # Infrastructure for Google Cloud Storage
│   └── pubsub/      # Infrastructure for Google Pub/Sub
├── scripts/         # Bash/Python scripts for git hooks, testing, and CI
├── sql/             # Database schemas and setup scripts
│   └── migrations/  # Supabase/PostgreSQL schema migrations
├── supabase/        # Supabase local development configuration
├── tests/           # Integration and End-to-End tests (often shared or pytest based)
│   └── e2e/         # End to end workflows testing ingestion to search
└── web/             # Next.js frontend application
    ├── public/      # Static assets and icons
    ├── src/         # Frontend React source code
    │   ├── app/     # Next.js App Router pages and layouts
    │   ├── components/# Reusable React components (shadcn/ui, Layouts)
    │   ├── contexts/# React Context providers
    │   └── lib/     # Frontend utilities
    └── tests/       # Playwright or frontend specific tests
```

## Directory Purposes

**`api/`:**
- Purpose: Contains the primary backend intelligence logic.
- Contains: FastAPI app, LangGraph agents, vector store integration, code ingestion logic.
- Key files: `api/main.py`, `api/agents/orchestrator.py`, `api/db/vector_store.py`

**`web/`:**
- Purpose: Contains the customer-facing interface and visual codebase map.
- Contains: Next.js App router features, Tailwind stylesheets, React components.
- Key files: `web/src/app/page.tsx`, `web/src/app/layout.tsx`

**`infra/`:**
- Purpose: Infrastructure as Code (IaC).
- Contains: Terraform `.tf` files defining Google Cloud resources.
- Key files: `infra/cloudrun/ingestion-job.tf`

**`sql/`:**
- Purpose: Core persistence schematics.
- Contains: pgvector setup scripts, SQL functions for hybrid search.
- Key files: `sql/hybrid_search.sql`, `sql/migrations/0017_create_ingestion_jobs.sql`

## Key File Locations

**Entry Points:**
- `api/main.py`: Main FastAPI application initialization.
- `web/src/app/page.tsx`: Landing page and Next.js initialization.

**Configuration:**
- `api/core/config.py`: Backend Pydantic settings loading env variables.
- `web/next.config.ts`: Next.js web build and routing configurations.

**Core Logic:**
- `api/agents/orchestrator.py`: Configures the LLM, the system prompt, and connects external tools to LangGraph.
- `api/ingestion/pipeline.py`: Orchestrates reading raw code and generating parseable semantic chunks.

**Testing:**
- `tests/`: Contains root-level backend integrations (`test_batch_ingestion.py`, `test_vector_db.py`).
- `web/tests/`: E2E frontend specifications via Playwright (`ingestion_loop.spec.ts`).

## Naming Conventions

**Files:**
- Backend uses `snake_case.py` (e.g., `vector_store.py`, `tree_sitter_chunker.py`).
- Frontend uses `kebab-case.tsx` (e.g., `add-repo-modal.tsx`, `auth-button.tsx`) or `kebab-case.ts`.

**Directories:**
- Use `kebab-case` or simple singular/plural words (e.g., `agents`, `cloudrun`, `components`).

## Where to Add New Code

**New Frontend Feature:**
- Primary code: Add a new route directory in `web/src/app/[feature]/page.tsx`
- Components: `web/src/components/[feature]-component.tsx`

**New API Endpoint:**
- Router: Add a router file in `api/routes/[feature].py`
- Registration: Include router in `api/main.py`
- Implementation Logic: Keep business logic inside `api/core/` or `api/agents/`.

**New AI Tool / Capability:**
- Agent modification: Add a tool decorator function inside `api/agents/[agent].py` (like `orchestrator.py`) and bind it to the toolset array.

**Database Schema Changes:**
- Migrations: Add sequential SQL files to `sql/migrations/` and apply via Supabase.
- ORM: Update models in `api/db/models.py`.

## Special Directories

**`scripts/hooks/`:**
- Purpose: Pre-commit, post-commit hooks triggering `entire`, `fallow`, and `graphify` agents.
- Generated: No
- Committed: Yes

**`graphify-out/`:**
- Purpose: Knowledge graph output created automatically for context awareness.
- Generated: Yes
- Committed: No (often ignored)

---

*Structure analysis: 2024-05-24*