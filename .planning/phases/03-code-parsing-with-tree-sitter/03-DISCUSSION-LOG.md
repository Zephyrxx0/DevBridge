# Phase 03: Code Parsing with Tree-sitter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md`.

**Date:** 2026-04-18
**Phase:** 03-code-parsing-with-tree-sitter
**Areas discussed:** Chunk Boundary Rules, Metadata Schema Depth, Failure + Fallback Behavior, File Discovery Scope

---

## Chunk Boundary Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic-first | Top-level function/class chunks, module-level only when meaningful | ✓ |
| Semantic + module preamble | Always include a module preamble chunk | |
| Fine-grained blocks | Aggressive splitting by nested blocks/lambdas | |

**User's choice:** Semantic-first
**Notes:** For oversized symbols, split by logical AST child nodes (not fixed token windows).

---

## Metadata Schema Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Core schema baseline | Core file/symbol/range/hash metadata | ✓ |
| Core + relationship fields | Adds parent/import/export/doc fields | |
| Maximal schema | Adds complexity, call graph, ownership, and extra derivations | |

**User's choice:** Core schema baseline
**Notes:** Stable deterministic chunk IDs should be included in this phase.

---

## Failure + Fallback Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid fallback | Best-effort parse, fallback chunk on failures, continue processing | ✓ |
| Strict skip | Skip files that fail parse | |
| Text-only fallback always | Always use coarse text windows on parse quality issues | |

**User's choice:** Hybrid fallback
**Notes:** Include structured failure metadata with status, error type/message, and fallback mode.

---

## File Discovery Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Source-only default | Parse `api/**/*.py` and `web/src/**/*.ts(x)`; exclude generated/system dirs | ✓ |
| Source + tests | Include test files by default | |
| Repo-wide by extension | Parse all `.py`/`.ts`/`.tsx` unless ignored | |

**User's choice:** Source-only default
**Notes:** `.tsx` should be included now in Phase 03.

---

## the agent's Discretion

- Tree-sitter loader/runtime implementation details.
- Exact size thresholds for oversized symbol splitting.
- Internal backend module names and object typing.

## Deferred Ideas

- Include tests in default parse scope.
- Expand metadata to complexity and call-graph hints in a later phase.
