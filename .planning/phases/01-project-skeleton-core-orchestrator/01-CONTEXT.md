# Phase 01: Project Skeleton & Core Orchestrator - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** ROADMAP.md + Prior Context + Discuss Phase

<domain>
## Phase Boundary

This phase delivers the foundational scaffolding for the DevBridge system and a functional, minimal-viable AI Orchestrator that can execute a basic ReAct loop.

Deliverables:
- Monorepo project structure (Next.js frontend, FastAPI backend).
- `Orchestrator` base class using LangGraph.
- Health check endpoints proving E2E connectivity.

</domain>

<decisions>
## Implementation Decisions

### Project Structure
- [Locked] Use a monorepo setup: `./web` for Next.js, `./api` for FastAPI.
- [Locked] Use `npm` for frontend and `requirements.txt` for backend.

### Backend (FastAPI)
- [Locked] Python 3.12+.
- [Locked] Root endpoint `/` returns system status.
- [Decision] Use `langgraph` and `langchain-google-vertexai`.

### AI Orchestration
- [Locked] Basic ReAct loop: Plan -> Act (Tools) -> Observe -> Final Answer.
- [Decision] Initial tool: `code_search` (mocked in this phase).

### Frontend (Next.js)
- [Locked] App Router.
- [Locked] Tailwind CSS.
- [Locked] Basic streaming text interface.

### Error Handling
- **D-01:** Return user-friendly messages + structured error responses.
- **D-02:** User-facing messages should be specific but safe — e.g., "API unavailable", "Invalid request", "Rate limited" (not raw exceptions).
- **D-03:** Detailed server-side logging for debugging — full stack traces, request IDs, variable values.

### the agent's Discretion
- Choice of Pydantic model structure for Agent State.
- Specific directory names for backend routers (`./api/routers`).

</decisions>

<canonical_refs>
## Canonical References

### Specification
- `DEVBRIDGE_SPEC.md` — High-level architecture.

### Planning
- `PROJECT.md` — Core values and active requirements.
- `REQUIREMENTS.md` — Functional/Non-functional specs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/agents/orchestrator.py` — LangGraph ReAct agent with `code_search` tool.
- `api/main.py` — FastAPI app with `/` health and `/chat` endpoint.
- `web/src/app/page.tsx` — Chat UI with dark theme, message bubbles, loading states.

### Established Patterns
- FastAPI with CORS middleware for frontend connectivity.
- LangGraph's `create_react_agent` for orchestration.
- React with useState/useEffect for chat interface.
- Tailwind CSS for styling (dark mode theme).

### Integration Points
- Frontend calls `http://localhost:8000/chat` for responses.
- Thread-based conversation using `thread_id` parameter.

</code_context>

<specifics>
## Specific Ideas
- The Orchestrator should be designed to handle multiple specialized agents in later phases, so keep the state graph modular.
- Error responses should be structured so frontend can display contextual messages.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- None — no todos matched this phase.

[If none: discussion stayed within phase scope]

</deferred>

---

*Phase: 01-project-skeleton-core-orchestrator*
*Context gathered: 2026-04-16*