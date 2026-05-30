# Phase 05: Vector Indexing & Hybrid Search - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers vector indexing and hybrid search runtime wiring.

In scope:
- Integrate `text-embedding-004` embedding generation into ingestion/index flow.
- Implement PostgreSQL hybrid search function(s).
- Connect orchestrator `code_search` tool to real retrieval path.

Out of scope for this phase:
- Chat UI/SSE streaming UX work (Phase 06).
- Annotation/history intelligence features (later milestones).

</domain>

<decisions>
## Implementation Decisions

### Retrieval Strategy
- **D-01:** Implement **minimal hybrid now** (scope-aligned) using weighted blend scoring in Phase 5.
- **D-02:** Weighted blend formula is baseline (`score = w_semantic * semantic + w_lexical * lexical`) with tunable weights.

### Embedding Pipeline
- **D-03:** Use **async queue worker path** for embedding generation (chunk persist first, embedding job second).
- **D-04:** Preserve ingestion durability: chunk rows must persist even if embedding generation retries/fails temporarily.

### Search Function Contract
- **D-05:** Use single RPC contract: `hybrid_search(query, k, filters_json)`.
- **D-06:** Default filter fields: `repo`, `file_path` prefix, `language`, `symbol_kind`, optional `date/time window`.

### Orchestrator Tool Integration
- **D-07:** `code_search` returns **both** structured JSON citations and human-readable summary.
- **D-08:** JSON citation shape includes: `file_path`, `start_line`, `end_line`, `score`, `snippet`, `reason`.

### Environment Alignment
- **D-09:** Canonical env key is `GOOGLE_CLOUD_PROJECT` across config/runtime.
- **D-10:** Keep legacy read fallback for `GCP_PROJECT_ID` with warning logs during migration window.

### the agent's Discretion
- Exact blend weight defaults and config surface.
- Async worker transport mechanism details (current infra-compatible choice within phase scope).
- SQL ranking normalization math details if output ranking behavior remains stable and explainable.

</decisions>

<specifics>
## Specific Ideas

- Keep Phase 5 scope strict: hybrid retrieval must ship now, not deferred.
- Tool output should be machine-usable (JSON citations) and model-usable (human summary) in same call.
- Filter surface should support repo/path/language/symbol narrowing from day one.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and Milestone Scope
- `.planning/ROADMAP.md` - Phase 05 scope and milestone placement.
- `.planning/REQUIREMENTS.md` - Search agent and RAG requirements + gap-closure acceptance criteria.
- `.planning/v0.1-v0.1-MILESTONE-AUDIT.md` - Active blockers (`MR-01`, `FR-AI-02`) this phase closes.

### Prior Phase Decisions
- `.planning/phases/03-code-parsing-with-tree-sitter/03-CONTEXT.md` - Chunk schema/metadata design upstream.
- `.planning/phases/04-gcs-pubsub-ingestion-triggers/04-CONTEXT.md` - Ingestion trigger flow feeding indexing.
- `.planning/phases/02-data-foundation-secrets-management/02-CONTEXT.md` - Supabase/pgvector + secret sourcing constraints.

### Existing Runtime/DB Anchors
- `api/agents/orchestrator.py` - `code_search` TODO and current mock behavior.
- `api/db/vector_store.py` - existing `PGVectorStore` + `text-embedding-004` manager.
- `api/ingest/trigger.py` - current ingest persistence path to extend with embedding/index queue handoff.
- `api/core/config.py` - current canonical `GOOGLE_CLOUD_PROJECT` settings model.
- `sql/setup_vector_store.sql` - pgvector extension and index notes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/db/vector_store.py`: Existing vector store manager, embedding model wiring, and similarity API scaffold.
- `api/ingest/trigger.py`: Existing ingestion handler with chunk extraction + DB persistence path.
- `api/db/session.py`: Shared async engine lifecycle for queue/worker/read paths.
- `api/agents/orchestrator.py`: ReAct tool entrypoint (`code_search`) ready for real retrieval integration.

### Established Patterns
- Async SQLAlchemy engine lifecycle managed centrally (`init_db_pool`, `get_engine`).
- Ingestion path currently favors idempotent persistence checks before inserts.
- Runtime fallback behavior already present for missing cloud config; migration warning pattern fits existing logger usage.

### Integration Points
- Extend ingestion completion path to enqueue embedding jobs.
- Add DB hybrid RPC path and invoke from `code_search` tool.
- Ensure tool output schema feeds orchestrator reasoning without additional parsing hacks.

</code_context>

<deferred>
## Deferred Ideas

- Full lexical-first or multi-stage rerank beyond minimal weighted hybrid (future optimization phase).
- Rich retrieval signals (ownership, git history, annotation weighting) beyond metadata filters above.
- UI-level search controls and filter UX (Phase 06+).

</deferred>

---

*Phase: 05-vector-indexing-hybrid-search*
*Context gathered: 2026-04-24*
