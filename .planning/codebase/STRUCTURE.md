# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```text
DevBridge-AMD/
├── api/                    # FastAPI backend, agents, DB access, ingestion, jobs
├── web/                    # Next.js frontend (App Router) + UI components
├── tests/                  # Backend/integration regression suite (root-level)
├── sql/                    # SQL functions/migrations scripts used by backend features
├── scripts/                # Dev automation + git hooks
├── supabase/               # Supabase project artifacts/config
├── graphify-out/           # Generated knowledge graph outputs
├── .planning/              # GSD planning artifacts and codebase maps
└── config/                 # Local config assets (contains sensitive key files)
```

## Directory Purposes

**`api/`:**
- Purpose: Backend runtime and service logic.
- Contains: `main.py`, routers, agent graph, DB adapters, ingest pipelines.
- Key files: `api/main.py`, `api/agents/graph.py`, `api/routes/repo.py`, `api/db/session.py`.

**`api/agents/`:**
- Purpose: LLM orchestration and agent utilities.
- Contains: state model, cascade node, legacy orchestrator tools.
- Key files: `api/agents/nodes/cascade.py`, `api/agents/utils/llm.py`, `api/agents/orchestrator.py`.

**`api/routes/`:**
- Purpose: HTTP route contracts grouped by domain.
- Contains: repo, chats, annotations, PR, webhooks, admin, memory routes.
- Key files: `api/routes/chats.py`, `api/routes/repo.py`, `api/routes/memory.py`.

**`api/db/`:**
- Purpose: Persistence adapters and storage abstractions.
- Contains: SQLAlchemy engine lifecycle, vector search, graph storage, models.
- Key files: `api/db/session.py`, `api/db/vector_store.py`, `api/db/models.py`.

**`web/src/app/`:**
- Purpose: Next.js App Router pages/layouts and server route handlers.
- Contains: repo workspace routes, dashboard/profile pages, `api/highlight` route.
- Key files: `web/src/app/repo/[id]/page.tsx`, `web/src/app/repo/[id]/layout.tsx`, `web/src/app/api/highlight/route.ts`.

**`web/src/components/`:**
- Purpose: Reusable UI blocks and chat feature components.
- Contains: chat stream/input/layout, onboarding, ui primitives.
- Key files: `web/src/components/chat/ChatStream.tsx`, `web/src/components/chat/ChatInput.tsx`, `web/src/components/ui/*`.

**`tests/` and `api/tests/`:**
- Purpose: Regression tests spanning routing, model migration, truncation, SSE, security.
- Contains: Pytest suites and Playwright tests under `web/tests/`.
- Key files: `tests/test_model_migration.py`, `tests/test_phase30_routing.py`, `api/tests/test_phase32_sse.py`, `web/tests/escalation-ux.spec.ts`.

## Key File Locations

**Entry Points:**
- `api/run_server.py`: Backend process launcher.
- `api/main.py`: FastAPI app construction + route wiring.
- `web/src/app/layout.tsx`: Frontend app root layout.

**Configuration:**
- `api/core/config.py`: Backend environment settings schema.
- `api/requirements.txt`: Backend dependency manifest.
- `web/package.json`: Frontend dependencies/scripts.
- `pytest.ini`: Pytest defaults and e2e markers.

**Core Logic:**
- `api/agents/graph.py`: compiled LangGraph runtime.
- `api/agents/nodes/cascade.py`: fast/big cascade routing.
- `api/agents/utils/llm.py`: Gemini/Gemma model binding.
- `api/routes/repo.py`: repository ingestion + tree/index endpoints.
- `api/routes/chats.py`: chat sessions/messages/context APIs.

**Testing:**
- `tests/`: root backend tests.
- `api/tests/`: API-focused test modules.
- `web/tests/`: Playwright e2e UX tests.
- `web/src/components/chat/__tests__/`: UI unit tests.

## Naming Conventions

**Files:**
- Backend modules use snake_case: `api/agents/utils/llm.py`.
- Frontend components use PascalCase for component files: `web/src/components/chat/ChatStream.tsx`.
- Next route segments follow App Router conventions: `web/src/app/repo/[id]/page.tsx`.

**Directories:**
- Domain-centric grouping under `api/routes/`, `api/jobs/`, `api/ingestion/`.
- Feature-centric grouping under `web/src/components/chat/`, `web/src/components/onboarding/`.

## Where to Add New Code

**New backend API feature:**
- Primary code: add endpoint module in `api/routes/` and include in `api/main.py`.
- Tests: add route tests in `api/tests/` or `tests/` (integration behavior).

**New model-routing behavior (Gemini/Gemma4 migration-safe):**
- Primary code: `api/agents/nodes/cascade.py` and `api/agents/utils/llm.py`.
- Metadata/UI contract updates: `api/main.py` (`_extract_metadata`, SSE path) and `web/src/components/chat/ChatStream.tsx`.
- Migration cleanup for deprecated identifiers: update tests in `tests/test_phase30_routing.py`, `api/tests/test_phase32_sse.py`, `web/tests/escalation-ux.spec.ts`, `web/src/components/chat/__tests__/ChatStream.test.tsx`.

**New frontend workspace module:**
- Implementation: new route under `web/src/app/repo/[id]/<feature>/page.tsx`.
- Shared presentation components: `web/src/components/<feature>/`.

**Utilities:**
- Backend shared helpers: `api/utils/`.
- Frontend shared helpers/hooks: `web/src/lib/`, `web/src/hooks/`, `web/src/utils/`.

## Special Directories

**`graphify-out/`:**
- Purpose: Generated knowledge graph report/community data.
- Generated: Yes.
- Committed: Yes (present in repo).

**`.planning/`:**
- Purpose: Planning state, phase docs, and codebase map outputs.
- Generated: Mixed (manual + generated).
- Committed: Yes.

**`config/`:**
- Purpose: Local service config assets.
- Generated: No.
- Committed: Yes.

**`node_modules/`, `.venv/`, `__pycache__/`:**
- Purpose: Local dependency/runtime artifacts.
- Generated: Yes.
- Committed: No (or should remain untracked except accidental artifacts).

---

*Structure analysis: 2026-05-20*
