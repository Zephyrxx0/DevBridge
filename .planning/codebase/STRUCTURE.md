# Codebase Structure

**Analysis Date:** 2026-05-18

## Directory Layout

```
[project-root]/
├── api/             # Python FastAPI backend service
│   ├── agents/      # LangGraph multi-agent orchestration
│   │   ├── nodes/   # Individual graph nodes (router, workers)
│   │   └── utils/   # Agent-specific helpers (LLM config)
│   ├── core/        # Configuration, secrets, and scheduler
│   ├── db/          # Database models, session management, vector store
│   ├── ingest/      # Legacy ingestion logic
│   ├── ingestion/   # Modern Tree-sitter chunking pipeline
│   ├── jobs/        # Background scheduled tasks (reports, sync)
│   ├── reports/     # Logic for generating automated reports
│   ├── routes/      # FastAPI endpoint routers (repo, chats, admin)
│   └── utils/       # Shared backend utilities
├── infra/           # Google Cloud infrastructure configurations
│   ├── cloudrun/    # Cloud Run service definitions
│   ├── gcs/         # Cloud Storage buckets
│   └── pubsub/      # Pub/Sub topics for events
├── scripts/         # Dev scripts and git hooks
├── sql/             # Database migrations and raw SQL functions
│   └── migrations/  # Versioned schema updates
├── tests/           # Root-level integration and E2E tests
└── web/             # Next.js frontend application
    ├── public/      # Static assets
    └── src/         # Frontend source code
        ├── app/     # App Router (pages and layouts)
        ├── components/# React UI components
        ├── contexts/  # Context API providers
        ├── hooks/     # Custom React hooks
        ├── lib/       # API clients and shared logic
        └── utils/     # Frontend helper functions
```

## Directory Purposes

**`api/agents/`:**
- Purpose: Modern agentic brain of the system.
- Contains: LangGraph graph definitions and specialized agent nodes.
- Key files: `api/agents/graph.py`, `api/agents/nodes/router.py`, `api/agents/state.py`

**`api/db/`:**
- Purpose: All persistence and retrieval logic.
- Contains: SQLAlchemy models and the pgvector-powered vector store manager.
- Key files: `api/db/vector_store.py`, `api/db/models.py`, `api/db/session.py`

**`api/routes/`:**
- Purpose: API surface area.
- Contains: Endpoint definitions for the frontend.
- Key files: `api/routes/chats.py`, `api/routes/repo.py`, `api/routes/admin.py`

**`web/src/app/`:**
- Purpose: Frontend routing and UI structure.
- Contains: Next.js pages organized by directory structure.
- Key files: `web/src/app/repo/[id]/page.tsx`, `web/src/app/layout.tsx`

**`sql/`:**
- Purpose: Database-side logic and schema.
- Contains: Hybrid search SQL function and migration history.
- Key files: `sql/hybrid_search.sql`, `sql/setup_vector_store.sql`

## Key File Locations

**Entry Points:**
- `api/main.py`: Backend FastAPI startup.
- `web/src/app/page.tsx`: Frontend landing page.

**Configuration:**
- `api/core/config.py`: Centralized environment variable management.
- `web/next.config.ts`: Next.js build and routing config.

**Core Logic:**
- `api/agents/graph.py`: Main LangGraph orchestration flow.
- `api/ingestion/pipeline.py`: Codebase ingestion and chunking logic.

**Testing:**
- `tests/test_phase21_e2e.py`: End-to-end integration test for agent flow.
- `web/tests/`: Playwright frontend tests.

## Naming Conventions

**Files:**
- Backend: `snake_case.py` (e.g., `orchestrator_history.py`).
- Frontend: `kebab-case.tsx` or `kebab-case.ts`.

**Directories:**
- Use singular or plural nouns, `kebab-case` if multiple words.

## Where to Add New Code

**New Agent Capability:**
- Implement the node in `api/agents/nodes/`.
- Add to the graph in `api/agents/graph.py`.
- Define state changes in `api/agents/state.py`.

**New Database Table:**
- Create migration in `sql/migrations/`.
- Define model in `api/db/models.py`.

**New Frontend Page:**
- Add directory to `web/src/app/`.
- Add shared components to `web/src/components/`.

**New Background Job:**
- Define job in `api/jobs/`.
- Register in `SchedulerManager` within `api/main.py` (lifespan).

## Special Directories

**`api/ingestion/` vs `api/ingest/`:**
- `api/ingestion/` is the active pipeline for tree-sitter based chunking.
- `api/ingest/` contains legacy or secondary ingestion components.

**`graphify-out/`:**
- Contains the generated knowledge graph used by dev tools (do not edit manually).

---

*Structure analysis: 2026-05-18*
