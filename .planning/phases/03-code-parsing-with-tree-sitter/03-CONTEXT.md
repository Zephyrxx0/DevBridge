# Phase 03: Code Parsing with Tree-sitter - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers semantic code parsing and chunk generation for Python and TypeScript-family source files using Tree-sitter.

In scope:
- Parse source files and produce chunks based on syntax structure.
- Define and emit chunk metadata schema.
- Handle parse failures with explicit fallback behavior.

Out of scope for this phase:
- Vector embedding/indexing and search wiring (planned for Phase 05).
- Ingestion triggers/orchestration from storage events (planned for Phase 04).

</domain>

<decisions>
## Implementation Decisions

### Chunk Boundary Rules
- **D-01:** Use semantic-first chunking: primary chunks are top-level function/class definitions; add module-level chunks only when meaningful top-level executable code exists.
- **D-02:** For oversized symbols, split by logical AST child nodes while preserving parent symbol metadata.

### Metadata Schema
- **D-03:** Use a core schema in Phase 03: `repo`, `file_path`, `language`, `symbol_name`, `symbol_kind`, `start_line`, `end_line`, `chunk_type`, `content_hash`.
- **D-04:** Add stable deterministic chunk IDs now using file path + symbol path + range + content hash.

### Failure and Fallback Behavior
- **D-05:** Use hybrid fallback: attempt best-effort parse, and when parsing fails, emit coarse fallback chunks with parse error metadata so ingestion continues.
- **D-06:** Track structured failure fields: `parse_status`, `error_type`, trimmed `error_message`, and `fallback_mode`.

### File Discovery Scope
- **D-07:** Default parse scope is source-only: `api/**/*.py` and `web/src/**/*.ts(x)`.
- **D-08:** Exclude generated/vendor/system directories: `node_modules`, `.next`, `dist`, `build`, `.venv`, and other generated artifacts.
- **D-09:** Include `.tsx` in Phase 03 (treated as TypeScript-family input) rather than deferring.

### the agent's Discretion
- Tree-sitter package/runtime wiring details and parser loading strategy.
- Exact large-symbol threshold values and overlap constants.
- Internal chunk object typing and module boundaries in the backend package layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and Product Requirements
- `.planning/ROADMAP.md` - Phase 03 goal and milestone sequencing.
- `.planning/PROJECT.md` - Product context, constraints, and semantic chunking intent.
- `.planning/REQUIREMENTS.md` - Functional requirement for code ingestion and chunking.
- `DEVBRIDGE_SPEC.md` - Architecture intent and system-level design context.

### Prior Decisions and Research
- `.planning/phases/02-data-foundation-secrets-management/02-CONTEXT.md` - Phase 02 decision that vector search wiring remains deferred to Phase 05.
- `.planning/research/INITIAL_RESEARCH.md` - Initial chunking guidance (function/class boundaries, contextual metadata goals).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/db/vector_store.py`: existing `Document`-oriented vector pipeline that future phases will consume after chunk emission is available.
- `api/db/session.py`: shared async engine lifecycle for ingestion-time persistence.
- `api/core/config.py`: established settings pattern for environment/secret-backed runtime configuration.

### Established Patterns
- FastAPI lifespan-managed startup/shutdown and centralized DB initialization in `api/main.py` + `api/db/session.py`.
- Phase-based deferral already encoded as TODO markers in `api/agents/orchestrator.py`.

### Integration Points
- New parser/chunking module should be introduced in backend ingestion path and produce normalized chunk payloads compatible with downstream vector indexing.
- Chunk metadata fields should map cleanly to future retrieval/filtering requirements in Phase 05.

</code_context>

<specifics>
## Specific Ideas

- Prioritize semantic quality over maximum chunk count.
- Keep failure behavior observable without stopping entire ingestion runs.
- Ensure identifiers are deterministic now so annotations/history can bind to chunks later.

</specifics>

<deferred>
## Deferred Ideas

- Expand parse scope to test files by default.
- Add maximal metadata (complexity/call graph/ownership) during parsing.
- Introduce vector embedding + search consumption wiring (Phase 05).

</deferred>

---

*Phase: 03-code-parsing-with-tree-sitter*
*Context gathered: 2026-04-18*
