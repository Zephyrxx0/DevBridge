<!-- refreshed: 2026-05-18 -->
# Architecture

**Analysis Date:** 2026-05-18

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│                  `web/src/app`                              │
├──────────────────┬──────────────────┬───────────────────────┤
│   Knowledge Map  │   Chat Interface │    Repo Management    │
│  `web/src/app/map`│ `web/src/app/repo`│ `web/src/app/dashboard`│
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                      │
│                `api/main.py`, `api/routes/`                 │
└─────────────────────────────────────────────────────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Agent Orchestration (LangGraph)              │
│                     `api/agents/graph.py`                   │
├──────────────────┬──────────────────┬───────────────────────┤
│   Intent Router  │   Fast Worker    │    Big Worker         │
│ `api/agents/nodes`│ `api/agents/nodes`│  `api/agents/nodes`   │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Data Store (PostgreSQL + pgvector)                         │
│  `api/db/vector_store.py`, `api/db/models.py`               │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API Entry | FastAPI application and middleware | `api/main.py` |
| Agent Graph | LangGraph definition for agent flow | `api/agents/graph.py` |
| Intent Router | Classifies queries as FAST or DEEP | `api/agents/nodes/router.py` |
| Fast Worker | Handles greetings and clarifications | `api/agents/nodes/fast.py` |
| Big Worker | Performs deep code analysis and search | `api/agents/nodes/big.py` |
| Vector Store | Hybrid search (vector + BM25) logic | `api/db/vector_store.py` |
| Ingestion | Tree-sitter parsing and chunking | `api/ingestion/pipeline.py` |

## Pattern Overview

**Overall:** RAG-enabled Multi-Agent System (Agentic RAG)

**Key Characteristics:**
- **Router-Worker Pattern:** Queries are routed to specialized agents (Fast/Big) based on complexity.
- **Hybrid Retrieval:** Combines pgvector semantic search with keyword-based filters and SQL functions.
- **Agentic Memory:** Thread-based conversation history managed via LangGraph `MemorySaver`.
- **Streaming UI:** Server-Sent Events (SSE) for real-time model token delivery.

## Layers

**Frontend (Next.js):**
- Purpose: User interaction, code visualization, and chat UI.
- Location: `web/`
- Contains: React components, Next.js App Router, Tailwind CSS.
- Depends on: `api/` via HTTP/SSE.

**API Layer (FastAPI):**
- Purpose: Request handling, auth, caching, and background job scheduling.
- Location: `api/`
- Contains: `api/routes/`, `api/main.py`.
- Depends on: `api/agents/`, `api/db/`.

**Agent Layer (LangGraph):**
- Purpose: Orchestrates AI reasoning, tool usage, and state management.
- Location: `api/agents/`
- Contains: `graph.py`, `nodes/`, `state.py`.
- Depends on: `api/db/vector_store.py`, LangChain.

**Persistence Layer:**
- Purpose: Stores code chunks, embeddings, PR history, and chat messages.
- Location: `api/db/`
- Contains: `vector_store.py`, `models.py`, `session.py`.
- Depends on: PostgreSQL (Supabase).

## Data Flow

### Primary Request Path (Chat)

1. **Entry:** Client calls `POST /chat/stream` in `api/main.py`.
2. **Routing:** `api.agents.graph.graph` starts; `intent_classifier` (`api/agents/nodes/router.py`) determines depth.
3. **Execution:** `big_worker` or `fast_worker` invokes LLM with tools like `code_search`.
4. **Retrieval:** `code_search` calls `vector_db.hybrid_search` in `api/db/vector_store.py`.
5. **Streaming:** Tokens are yielded back via `stream_graph_events` in `api/routes/chats.py` to `api/main.py`.
6. **Persistence:** `_persist_chat_turn` saves the turn to `chat_messages` table in `api/main.py`.

### Repository Ingestion

1. **Trigger:** `api/routes/repo.py` or background job calls ingestion.
2. **Parsing:** `api/ingestion/pipeline.py` uses Tree-sitter to chunk code.
3. **Embedding:** `api/utils/local_embeddings.py` or VertexAI generates vectors.
4. **Storage:** Chunks and vectors are saved to `code_chunks` table via `api/db/vector_store.py`.

## Key Abstractions

**AgentState:**
- Purpose: Shared state across LangGraph nodes.
- Examples: `api/agents/state.py`
- Pattern: TypedDict with `Annotated` reducers.

**HybridSearch:**
- Purpose: Combines semantic and lexical search in a single SQL call.
- Examples: `sql/hybrid_search.sql`, `api/db/vector_store.py`.
- Pattern: PostgreSQL Function.

## Entry Points

**FastAPI App:**
- Location: `api/main.py`
- Triggers: Uvicorn server.
- Responsibilities: Routing, Lifespan (DB/Cache init), Middleware.

**Next.js App:**
- Location: `web/src/app/page.tsx`
- Triggers: User browser navigation.
- Responsibilities: Root layout, routing, client-side state.

## Architectural Constraints

- **Threading:** Python backend uses `asyncio`. Windows development requires `WindowsSelectorEventLoopPolicy` for `psycopg`.
- **Global state:** `vector_db` singleton in `api/db/vector_store.py`; `settings` in `api/core/config.py`.
- **Model Fallback:** `MockLLM` used when cloud providers are unavailable (`api/agents/utils/llm.py`).

## Anti-Patterns

### Legacy Orchestrator
**What happens:** Using `api/agents/orchestrator.py` for new features.
**Why it's wrong:** It is marked as legacy; the system has migrated to the LangGraph router-worker pattern in `api/agents/graph.py`.
**Do this instead:** Invoke `api.agents.graph.graph` directly.

### Heavy Processing in Main Thread
**What happens:** Running embeddings or large parsing tasks synchronously.
**Why it's wrong:** Blocks the FastAPI event loop.
**Do this instead:** Use `asyncio.to_thread` or background jobs via `SchedulerManager`.

## Error Handling

**Strategy:** Standardized SSE error events and FastAPI exception handlers.

**Patterns:**
- `{"type": "error", "message": "..."}` for streaming failures.
- Timeouts on all external tool calls (e.g., `asyncio.wait_for(..., timeout=10.0)`).

## Cross-Cutting Concerns

**Logging:** Standard `logging` module with structured `extra` fields.
**Validation:** Pydantic models for request/response schemas.
**Authentication:** Token-based identity injection via `inject_user_context` middleware.

---

*Architecture analysis: 2026-05-18*
