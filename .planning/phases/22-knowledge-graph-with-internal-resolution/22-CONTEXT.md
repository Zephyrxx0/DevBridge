# Phase 22: Knowledge Graph with Internal Resolution - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a persistent symbol knowledge graph for repositories, focusing on internal symbol resolution. It implements a graph storage schema using a `repo_graph` table in Supabase, extracts CALLS/DEFINES/IMPORTS relationships via Tree-sitter, and provides a mechanism to drop unresolvable external calls while retaining high-value "Shadow Nodes" for common libraries.

</domain>

<decisions>
## Implementation Decisions

### Graph Granularity
- **D-01: File Level (Coarse).** The initial implementation will focus on file-level relationships (imports, exports, and file-to-file calls). This simplifies the graph structure while providing sufficient context for broad codebase navigation and impact analysis. Deep functional-level granularity is deferred to future optimization phases.

### External Symbol Handling
- **D-02: Shadow Nodes (Contextual).** Instead of silently dropping all unresolvable calls, the system will keep "Shadow Nodes" for high-frequency external libraries (e.g., `react`, `fastapi`, `langchain`). This allows the AI to understand the boundaries of the local codebase and its primary external dependencies.

### Update Strategy
- **D-03: Full Rebuild (Stable).** On every repository re-index or significant update, the system will perform a full rebuild of that repository's graph (Delete then Re-insert). This ensures graph integrity and avoids the complexities of incremental diffing in this foundational phase.

### Node Data Storage
- **D-04: Metadata Cache (Fast).** Nodes in the `JSONB` structure will store not just chunk IDs, but also small metadata snippets (e.g., symbol names, export types, file paths). This enables fast graph traversals and basic reasoning directly from the graph data without requiring expensive joins to the `code_chunks` table for every step.

### Claude's Discretion
- The exact list of libraries that trigger "Shadow Node" creation.
- The internal structure of the `JSONB` adjacency list (e.g., neighbor IDs vs. edge objects).
- Logic for detecting "CALLS" at the file level (e.g., cross-file function invocation detection).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and Schema
- `.planning/ROADMAP.md` — Defines Phase 22 goal and success criteria.
- `.planning/REQUIREMENTS.md` — Specifies FR-02 (Knowledge Graph) and DR-01 (Graph Table schema).

### Technical Context
- `.planning/phases/03-code-parsing-with-tree-sitter/03-CONTEXT.md` — Underlying AST parsing patterns.
- `.planning/phases/05-vector-indexing-hybrid-search/05-CONTEXT.md` — Linkage to stored code chunks.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/ingestion/tree_sitter_chunker.py`: Can be extended to extract import/export statements and call signatures for graph construction.
- `api/db/vector_store.py`: Existing Supabase/Postgres connection logic.

### Established Patterns
- Full-reindex ingestion path: The graph rebuild (D-03) should be hooked into the existing pipeline completion event.
- JSONB usage: The project already uses JSONB for chunk metadata, providing a pattern for the `repo_graph` table.

### Integration Points
- `api/ingestion/pipeline.py`: The orchestrator for ingestion should trigger the graph builder after chunking and embedding are complete.
- `api/agents/orchestrator.py`: Future home for tools that traverse the knowledge graph to enhance reasoning.

</code_context>

<specifics>
## Specific Ideas

- The `repo_graph` table should be added via a new SQL migration in `sql/migrations/`.
- Traversal logic should be optimized for finding "Impacted Files" (files that import or call a given file).

</specifics>

<deferred>
## Deferred Ideas

- Symbol-level (fine-grained) graph granularity.
- Incremental graph updates/diffing.
- Cross-repository graph linking.

</deferred>

---

*Phase: 22-knowledge-graph-with-internal-resolution*
*Context gathered: 2026-05-10*
