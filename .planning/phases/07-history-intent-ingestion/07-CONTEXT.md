# Phase 07: History & Intent Ingestion - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers history and intent ingestion — capturing git history and PR data and linking it to code chunks for intent-aware search.

In scope:
- Ingest git commits, PR descriptions, code diffs, and code review comments.
- Extract rich metadata (author, timestamp, changed files, diff stats, PR numbers, review state, code owners).
- Store history entries in database with links to relevant code chunks.
- Enable intent-aware search that retrieves "why" from commit messages/PR descriptions.

Out of scope for this phase:
- Annotation API for human comments (Phase 8).
- Debug agent / PR Review agent logic (Phase 9).
- Rich frontend for viewing history (later phases).

</domain>

<decisions>
## Implementation Decisions

### History Sources
- **D-01:** Pull from **full history stack** — git commits, PR descriptions, code diffs, and code review comments.
  - Provides richest intent signal for "Why was this changed?" queries.

### Metadata Fields
- **D-02:** Extract **full metadata** — author + timestamp + changed files + diff stats + PR numbers + review state + code owner info.
  - Enables filtering by author, impact, review state for context-aware answers.

### Ingestion Mechanism
- **D-03:** **Reactive (on-demand)** ingestion — triggered when user requests or webhook fires.
  - User-initiated or event-driven (PR close, commit push).
  - More resource-efficient than scheduled batch for lower volume.

### Chunk Linking
- **D-04:** **Dual linking** — file-level links for broad search + symbol-level links for intent drill-down.
  - File links enable "show me recent changes to auth.py"
  - Symbol links enable "why was User.validate() modified?"

### the agent's Discretion
- Exact git CLI commands and output parsing logic.
- Database schema for history entries and chunk links.
- API endpoint design for history ingestion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 07 scope and milestone placement.
- `.planning/REQUIREMENTS.md` - History Analysis and Knowledge System requirements.

### Prior Phase Decisions
- `.planning/phases/05-vector-indexing-hybrid-search/05-CONTEXT.md` - Hybrid search and chunk schema.
- `.planning/phases/04-gcs-pubsub-ingestion-triggers/04-CONTEXT.md` - Ingestion trigger patterns.
- `.planning/phases/03-code-parsing-with-tree-sitter/03-CONTEXT.md` - Chunk schema from Tree-sitter parsing.

### Existing Codebase
- `api/ingest/trigger.py` - Current ingestion trigger path.
- `api/db/vector_store.py` - Existing database operations.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing ingestion trigger pattern in `api/ingest/trigger.py` — can be extended for history.
- Vector store schema for chunk metadata — extend with history link fields.

### Established Patterns
- Reactive workflow from Phase 4: Pub/Sub triggered, not scheduled.
- Async processing compatible with Cloud Run Jobs.

### Integration Points
- New history entries link to existing `code_chunks` table via file_path/symbol references.
- Search queries will need to join across chunks and history for intent-aware results.

</code_context>

<specifics>
## Specific Ideas

- History ingestion should support GitHub API for PR/review data + local git for commits.
- Intent queries like "why was this function changed?" should retrieve related commit/PR context.
- Consider storing extracted intent as searchable text alongside metadata.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-history-intent-ingestion*
*Context gathered: 2026-04-25*