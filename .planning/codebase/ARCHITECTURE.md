<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Web App (Next.js App Router)                          │
├──────────────────────────────┬───────────────────────────────────────────────┤
│ UI Screens + Chat UX         │ Next Route Handler + Proxy/Middleware       │
│ `web/src/app/repo/[id]/`     │ `web/src/app/api/highlight/route.ts`        │
│ `web/src/components/chat/`   │ `web/src/proxy.ts`                          │
└───────────────────────┬──────┴───────────────────────────────┬──────────────┘
                        │                                      │
                        ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       FastAPI Service (Core API)                            │
│ `api/main.py`, `api/routes/*.py`                                            │
└───────────────────────┬───────────────────────────────┬──────────────────────┘
                        │                               │
                        ▼                               ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────────┐
│ LangGraph + Cascadeflow Agent Graph │   │ Ingestion + Repo/Graph Pipeline  │
│ `api/agents/graph.py`               │   │ `api/routes/repo.py`             │
│ `api/agents/nodes/cascade.py`       │   │ `api/ingestion/*.py`             │
│ `api/agents/utils/llm.py`           │   │ `api/db/graph_store.py`          │
└───────────────────────┬──────────────┘   └──────────────────┬───────────────┘
                        │                                     │
                        ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Supabase Postgres + pgvector + cache                     │
│ `api/db/session.py`, `api/db/models.py`, `api/db/vector_store.py`           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API bootstrap | App lifecycle, middleware, router registration, `/chat` + `/chat/stream` orchestration | `api/main.py` |
| Agent graph | Build recall → cascade → retain state machine | `api/agents/graph.py` |
| Model routing | Fast-first cascade with schema validation and forced escalation | `api/agents/nodes/cascade.py` |
| Model provider adapter | Gemini SDK wrappers + concrete fast/big model selection | `api/agents/utils/llm.py` |
| Chat persistence + context trim | Session CRUD, message history, token-cap endpoint | `api/routes/chats.py` |
| Repo ingestion and code graph | GitHub file fetch, indexing jobs, tree/map endpoints | `api/routes/repo.py` |

## Pattern Overview

**Overall:** Layered service architecture with explicit API boundary and graph-based AI execution.

**Key Characteristics:**
- Thin HTTP handlers in `api/routes/*.py`, heavy lifting delegated to `api/agents/*`, `api/db/*`, and `api/ingestion/*`.
- Single compiled LangGraph instance (`graph`) used by both sync and SSE chat paths.
- Shared infra via module-level managers/singletons (`engine`, `vector_db`, `hindsight_db`).

## Layers

**Presentation Layer (web):**
- Purpose: Render repo workspace, chat, file explorer, onboarding UX.
- Location: `web/src/app/`, `web/src/components/`.
- Contains: Next.js pages/layouts, client components, route handler.
- Depends on: FastAPI backend endpoints under `/api/backend/*`.
- Used by: Browser clients.

**API Layer (backend routes):**
- Purpose: HTTP contract + auth/validation + request-to-service orchestration.
- Location: `api/main.py`, `api/routes/*.py`.
- Contains: FastAPI routers/endpoints, middleware, SSE wiring.
- Depends on: Agent graph, DB session, vector store, ingestion services.
- Used by: Next.js frontend and test harnesses.

**AI Orchestration Layer:**
- Purpose: Build/execute multi-step LLM flow with memory and model escalation.
- Location: `api/agents/graph.py`, `api/agents/nodes/*.py`, `api/agents/utils/*.py`.
- Contains: StateGraph, cascade node, model factory, schema validator.
- Depends on: Google GenAI SDK, Cascadeflow, Hindsight client.
- Used by: `/chat` and `/chat/stream` flows.

**Data + Infra Layer:**
- Purpose: Persistence, vector search, job scheduling, external sync.
- Location: `api/db/*.py`, `api/core/scheduler.py`, `api/jobs/*.py`.
- Contains: SQLAlchemy engine lifecycle, pgvector access, APScheduler jobs.
- Depends on: Supabase Postgres connection and configured env.
- Used by: routes, ingestion, and background jobs.

## Data Flow

### Primary Request Path

1. Web chat sends message to backend (`web/src/app/repo/[id]/page.tsx:110`, `web/src/app/repo/[id]/page.tsx:173`).
2. FastAPI endpoint validates auth and invokes graph (`api/main.py:443`, `api/main.py:448`).
3. Graph executes recall → cascade → retain (`api/agents/graph.py:69`, `api/agents/graph.py:70`, `api/agents/graph.py:71`).
4. Cascade node runs fast model first, escalates on schema failure (`api/agents/nodes/cascade.py:37`, `api/agents/nodes/cascade.py:43`).
5. Response persisted and returned to client (`api/main.py:452`, `api/main.py:457`).

### Streaming Path (SSE)

1. Frontend opens stream endpoint (`web/src/app/repo/[id]/page.tsx` send path via `/chat/stream` behavior).
2. `chat_stream` yields metadata + chunk events (`api/main.py:557`, `api/main.py:580`).
3. Metadata extracted recursively from graph events (`api/main.py:66`, `api/main.py:563`).
4. UI renders escalation badges from `model_used` + `cascaded` (`web/src/components/chat/ChatStream.tsx:172`).

**State Management:**
- Agent state is a `TypedDict` (`api/agents/state.py:7`) merged across nodes.
- Frontend session/UI state held in React component state (`web/src/app/repo/[id]/page.tsx:71`).

## Key Abstractions

**Compiled LangGraph Runtime (`graph`):**
- Purpose: Single execution surface for both normal and streaming chat.
- Examples: `api/main.py:448`, `api/routes/chats.py:19`.
- Pattern: Precompiled module-level graph object.

**ValidatorCascadeAgent:**
- Purpose: Enforce response schema and escalate to big model when needed.
- Examples: `api/agents/nodes/cascade.py:25`, `api/agents/nodes/cascade.py:48`.
- Pattern: Wrapper around `CascadeAgent` with post-run validation.

**Model Factory (`get_model`)**
- Purpose: Centralized fast/big model mapping.
- Examples: `api/agents/utils/llm.py:60`.
- Pattern: Boolean selector (`is_fast`) returning provider-compatible model object.

## Entry Points

**Backend server start:**
- Location: `api/run_server.py`
- Triggers: `python api/run_server.py` / uvicorn launch.
- Responsibilities: Set Windows event loop policy + boot `api.main:app`.

**FastAPI app lifecycle:**
- Location: `api/main.py`
- Triggers: ASGI startup/shutdown.
- Responsibilities: DB init, cache init, scheduler jobs, router binding.

**Web app route root:**
- Location: `web/src/app/repo/[id]/page.tsx`
- Triggers: user navigation to repo workspace.
- Responsibilities: load sessions/files/branches and drive chat UX.

## Model Selection & Routing (Current + Migration Focus)

- Canonical runtime selection lives in `api/agents/utils/llm.py:67-69`.
  - Fast model: `gemma-4-26b-a4b-it`.
  - Big model: `gemini-2.5-flash`.
- Escalation policy lives in `api/agents/nodes/cascade.py:39-46`.
  - First pass validates schema.
  - On failure: `force_direct=True` second pass + `cascaded=True` marker.
- Request-level metadata propagation lives in:
  - extractor: `api/main.py:66-91`
  - SSE emission: `api/main.py:557-567`
  - UI display: `web/src/components/chat/ChatStream.tsx:172-177`

**Deprecated qwen/local-gemma traces removed:**
- Runtime defaults now use `model_type="gemini"` (`api/routes/chats.py`, `api/utils/tokenizer.py`).
- Tests now assert `gemini-2.5-flash` and `gemma-4-26b-a4b-it`.

## Architectural Constraints

- **Threading:** Async event loop core; Windows forces selector policy (`api/main.py:46-47`, `api/run_server.py:9-10`).
- **Global state:** Module singletons in `api/db/session.py:9`, `api/db/vector_store.py:258`, `api/agents/graph.py:74`.
- **Circular imports:** Not detected in scanned core modules; keep `api.main` imports route-only and avoid reverse imports from route modules.
- **Provider abstraction mismatch:** Cascade `ModelConfig.provider="openai"` while actual provider is Google GenAI wrapper (`api/agents/nodes/cascade.py:53`, `api/agents/utils/llm.py:65`). Keep compatibility wrapper stable or align provider label.

## Anti-Patterns

### Legacy Router Drift

**What happens:** Legacy intent router + worker nodes still exist (`api/agents/nodes/router.py`, `api/agents/nodes/fast.py`, `api/agents/nodes/big.py`) while production path uses `cascade_node` graph.
**Why it's wrong:** Confuses contributors about active execution path.
**Do this instead:** Route all new behavior through `api/agents/nodes/cascade.py` + `api/agents/graph.py`; treat old nodes as deprecated compatibility only.

### Model Name Drift in Tests

**What happens:** Tests now align with Gemini/Gemma4 runtime labels.
**Why it's wrong:** False confidence; tests validate obsolete identifiers.
**Do this instead:** Update fixtures/assertions to `gemini-2.5-flash` and `gemma-4-26b-a4b-it` in listed files above.

## Error Handling

**Strategy:** Fail closed for auth, fail soft for optional subsystems (vector/hindsight), and return HTTP 5xx with structured detail.

**Patterns:**
- `try/except` with explicit `HTTPException` pass-through in routes (`api/main.py:462`, `api/routes/chats.py:76`).
- Background/sync tasks log and continue on partial failures (`api/main.py:195-197`, `api/main.py:241-243`).

## Cross-Cutting Concerns

**Logging:** Python `logging` across backend modules (`api/main.py:50`, `api/db/vector_store.py:18`).
**Validation:** Pydantic request models in route modules + schema validator in cascade (`api/routes/chats.py:39`, `api/agents/nodes/cascade.py:22`).
**Authentication:** Internal proxy header verification middleware (`api/main.py:334-356`) + frontend session proxy (`web/src/proxy.ts:4-6`).

---

*Architecture analysis: 2026-05-20*
