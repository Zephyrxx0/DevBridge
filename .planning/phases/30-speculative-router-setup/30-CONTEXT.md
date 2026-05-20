# Phase 30 Context: Speculative Router Setup

**Domain:** System dynamically routes to the large model only when necessary to preserve compute resources

## Decisions

### Validation Strategy
- **D-30-01: Schema Validation:** Use Pydantic/JSON schema to detect malformed or incomplete outputs from the "Fast" model (Gemma 4) before deciding to escalate to "Big" (Gemini 2.5 Flash).

### Concurrency Enforcement
- **D-30-02: Remote Model (AI Studio):** Strict local concurrency limits (Semaphores/Redis) are not required as inference is offloaded to Google AI Studio. Standard rate-limit handling applies.

### Escalation Scope
- **D-30-03: Per-Turn Escalation:** Only escalate the specific turn that failed validation. This minimizes compute usage while allowing subsequent turns to attempt speculative execution again.

## Codebase Context
- **Reusable assets:** `api/agents/graph.py` (LangGraph graph), `api/agents/nodes/router.py` (Intent Router), `api/agents/nodes/fast.py` (Fast Worker), `api/agents/nodes/big.py` (Big Worker).
- **Established patterns:** Router-Worker pattern with dual models (Gemini 2.5 Flash + Gemma 4).
- **Integration points:** `api/agents/graph.py` (where Cascadeflow speculative routing logic will be integrated).

## Canonical Refs
- None referenced.
