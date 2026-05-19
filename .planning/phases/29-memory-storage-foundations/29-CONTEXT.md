# Phase 29 Context: Memory Storage & Foundations

**Domain:** System has persistent biomimetic agent memory using Hindsight without blocking execution

## Decisions

### Database Schema
- Create a dedicated schema (`hindsight`) within the existing Supabase pgvector database for better isolation from DevBridge application tables.

### Context Injection
- Consolidate to State: Use a Typed `AgentState` field for all Hindsight memory to keep it structured and precise, rather than appending as raw `SystemMessage`s to the thread history.

### Retention Trigger
- Two-tiered retention: Call `retain()` to record experiences every user turn, but offload the heavier consolidation/reflection into world facts to the end of the session or idle periods via `APScheduler`.

## Codebase Context
- **Reusable assets:** LangGraph nodes (`fast_worker`, `big_worker`), `SchedulerManager` (for offloading `reflect()`).
- **Established patterns:** RAG-enabled Router-Worker pattern, Agentic Memory (`MemorySaver`), PostgreSQL with pgvector for vector storage.
- **Integration points:** `api/agents/graph.py` (LangGraph state), `api/db/vector_store.py` (Supabase integration).

## Canonical Refs
- None referenced.
