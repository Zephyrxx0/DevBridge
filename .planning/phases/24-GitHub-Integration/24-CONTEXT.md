# Phase 24: GitHub Integration - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the GitHub integration layer, focusing on two main pillars:
1. **GitHub Auth**: Securely retrieving user OAuth tokens from Supabase to perform authenticated API calls.
2. **Issue-to-File Mapping**: Providing semantic associations between GitHub issues and relevant codebase files using `pgvector` cosine similarity.

It delivers a background sync job for issues, a dedicated storage schema, and a new agent-facing tool for issue grounding.

</domain>

<decisions>
## Implementation Decisions

### Auth Mechanism
- **D-01: Postgres RPC Function.** To retrieve the `provider_token` from the protected `auth.identities` table in Supabase, we will implement a PostgreSQL function (RPC). This function will be accessible by the backend using the connection string and will securely return the token for a given user ID.

### Storage Strategy
- **D-02: Dedicated Issues Table.** Create a `repo_github_issues` table in Supabase.
  - Columns: `id` (UUID), `repo_id` (UUID), `issue_number` (INT), `title` (TEXT), `body` (TEXT), `embedding` (VECTOR(768)), `updated_at` (TIMESTAMPTZ).
  - This keeps issue data separate from code chunks while enabling semantic search.

### Synchronization
- **D-03: Daily Background Sync.** Issues will be fetched and vectorized daily. We will introduce `APScheduler` to the FastAPI backend to manage this and future recurring tasks. On-demand sync will be triggered if a user requests info about an un-indexed issue.

### Agent Tooling
- **D-04: `map_issue_to_files` Tool.** A specialized tool for the Agent that:
  1. Fetches the embedding for a specific issue.
  2. Performs a cosine similarity search against the `code_chunks` table for that repository.
  3. Returns the top N files/chunks as grounded context.

### Mapping Strategy
- **D-05: Pure pgvector Cosine Distance.** To avoid large context spikes on the AMD MI300X, the mapping is performed entirely within the database using `pgvector`. The LLM only sees the resulting relevant files, not the entire list of files or issue text during the search phase.

### Claude's Discretion
- The exact name of the RPC function (e.g., `get_github_token_for_user`).
- The specific number of files (N) returned by the mapping tool (default to 5).
- The implementation details of the `APScheduler` setup within the FastAPI lifecycle.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and Schema
- `.planning/ROADMAP.md` — Phase 24 goals.
- `.planning/REQUIREMENTS.md` — FR-04 (GitHub Integration).
- `.planning/phases/05-vector-indexing-hybrid-search/05-CONTEXT.md` — Reference for `pgvector` usage.

### Technical Context
- `api/ingestion/history.py` — Existing GitHub API usage for PRs.
- `api/db/vector_store.py` — Pattern for vector search queries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/routes/repo.py`: Contains `_github_get_json` and slug parsing logic.
- `api/core/secrets.py`: Current `get_github_token` needs refactoring to use the new RPC.

### Established Patterns
- Pydantic models for API payloads.
- LangGraph tools for agent capabilities.

### Integration Points
- `api/main.py`: Hook for `APScheduler` initialization.
- `api/agents/orchestrator.py`: Registering the new `map_issue_to_files` tool.

</code_context>

<specifics>
## Specific Ideas

- Use `text-embedding-004` (via Vertex AI) for issue embeddings to maintain consistency with code chunk embeddings.
- The RPC function should probably reside in a `helpers` or `auth_utils` schema to avoid cluttering the public schema.

</specifics>

<deferred>
## Deferred Ideas

- Webhook-driven real-time issue sync (FR-04 requirement specifies basic mapping first).
- Mapping issues to specific code *symbols* (deferred to after Knowledge Graph maturity).

</deferred>

---

*Phase: 24-GitHub-Integration*
*Context gathered: 2026-05-11*
