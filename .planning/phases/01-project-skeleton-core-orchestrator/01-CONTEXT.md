# Phase 01: Project Skeleton & Core Orchestrator - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** ROADMAP.md + Hacker Spec

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
- [Locked] Use `npm` for frontend and `poetry` (or `pip` for simplicity in hackathon) for backend. Using `./requirements.txt` for now to fit lightweight CI.

### Backend (FastAPI)
- [Locked] Python 3.12+.
- [Locked] Root endpoint `/` returns system status.
- [Decision] Use `langgraph` and `langchain-google-vertexai`.

### AI Orchestration
- [Locked] Basic ReAct loop: Plan -> Act (Tools) -> Observe -> Final Answer.
- [Decision] Initial tool: `code_search` (mocked in this phase, just returns "Not found yet").

### Frontend (Next.js)
- [Locked] App Router.
- [Locked] Tailwind CSS.
- [Locked] Basic streaming text interface (precursor to SSE).

### the agent's Discretion
- Choice of Pydantic model structure for Agent State.
- Specific directory names for backend routers (`./api/routers`).
</decisions>

<canonical_refs>
## Canonical References

### Specification
- [DEVBRIDGE_SPEC.md](file:///d:/Codes/Personal/DevBridge/DEVBRIDGE_SPEC.md) — High-level architecture.

### Planning
- [PROJECT.md](file:///d:/Codes/Personal/DevBridge/.planning/PROJECT.md) — Core values and active requirements.
- [REQUIREMENTS.md](file:///d:/Codes/Personal/DevBridge/.planning/REQUIREMENTS.md) — Functional/Non-functional specs.

</canonical_refs>

<specifics>
## Specific Ideas
- The Orchestrator should be designed to handle multiple specialized agents in later phases, so keep the state graph modular.
</specifics>

---
*Phase: 01-project-skeleton-core-orchestrator*
*Context gathered: 2026-04-15*
