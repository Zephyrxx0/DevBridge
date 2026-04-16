# Phase 02: Data Foundation & Secret Management - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** ROADMAP.md + Hacker Spec

<domain>
## Phase Boundary

This phase establishes the bedrock for data persistence and security. It will set up mechanisms to:
1. Store vector representations of code robustly so the Orchestrator can perform semantic search.
2. Securely store and retrieve API keys, moving away from local `.env` files where possible to ensure cloud safety.

Deliverables:
- Supabase Integration: Configuration and setup of `pgvector`.
- GCP Secret Manager Integration: Securely access `GEMINI_API_KEY` and other sensitive parameters at runtime.
- Code Analysis: Incorporate `fallow` to analyze the Next.js frontend code health, and `code-review-graph` to maintain structural knowledge.
- The `entire` CLI will remain the standard tool to checkpoint state.
</domain>

<decisions>
## Implementation Decisions

### Vector Database
- [Locked] Supabase with `pgvector` enabled.
- [Decision] Use `langchain-postgres` combined with generic `psycopg` to integrate LangGraph tools with Supabase PostgreSQL without heavy ORMs.

### API Keys
- [Locked] Google Cloud Secret Manager.
- [Decision] Use the `google-cloud-secret-manager` python client. To optimize costs and latency, retrieve keys on startup or implement an LRU cache.

### Tooling Enforced
- Use **fallow** (from `mcp` / cli) to analyze the TypeScript/JavaScript project for unused code and cyclic dependencies before committing.
- Use **code-review-graph** (CLI) to incrementally update graph representations of the codebase.
- Use **entire** (CLI) to snapshot work.

</decisions>

<canonical_refs>
## Canonical References

### Planning
- [ROADMAP.md](file:///d:/Codes/Personal/DevBridge/.planning/ROADMAP.md) — Current state of Phase 2 progress.

</canonical_refs>

---
*Phase: 02-data-foundation-secrets-management*
*Context gathered: 2026-04-16*
