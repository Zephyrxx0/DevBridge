---
phase: 03-code-parsing-with-tree-sitter
plan: "02"
type: execute
wave: 2
depends_on: ["01"]
files_modified:
  - api/requirements.txt
  - api/ingestion/tree_sitter_chunker.py
  - api/ingestion/pipeline.py
  - tests/test_chunking_phase03.py
autonomous: true
requirements:
  - "Implement chunking logic for .ts and .py using Tree-sitter"
  - "Define metadata schema for code chunks"

must_haves:
  truths:
    - "Python and TypeScript-family source files are parsed into semantic chunks using Tree-sitter."
    - "Oversized top-level symbols are split by logical AST child nodes while preserving parent symbol metadata."
    - "When parsing fails, ingestion still emits fallback chunks with structured failure metadata."
  artifacts:
    - path: "api/ingestion/tree_sitter_chunker.py"
      provides: "Tree-sitter parser loading and semantic chunk extraction"
    - path: "api/ingestion/pipeline.py"
      provides: "Integration entrypoint that applies discovery + chunking for file inputs"
    - path: "tests/test_chunking_phase03.py"
      provides: "Semantic extraction, oversized split, and hybrid fallback coverage"
  key_links:
    - "api/ingestion/tree_sitter_chunker.py consumes contracts from api/ingestion/types.py (Plan 01)"
    - "api/ingestion/pipeline.py composes discovery + chunker so in-scope files yield normalized chunks"
    - "Fallback metadata (`parse_status`, `error_type`, `error_message`, `fallback_mode`) is propagated in emitted chunks"
---

<objective>
Implement the Tree-sitter chunking engine and ingestion integration that converts in-scope Python and TypeScript-family files into deterministic semantic chunks with resilient fallback behavior.

Purpose: deliver the core Phase 03 parser behavior while honoring locked decisions on chunking granularity, metadata, and failure handling.
Output: parser/chunker implementation, ingestion composition module, and automated tests proving semantic and fallback paths.
</objective>

<execution_context>
@.github/get-shit-done/workflows/execute-plan.md
@.github/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-code-parsing-with-tree-sitter/03-CONTEXT.md
@.planning/phases/03-code-parsing-with-tree-sitter/03-RESEARCH.md
@.planning/phases/03-code-parsing-with-tree-sitter/01-PLAN.md

<interfaces>
From `api/ingestion/types.py` (Plan 01): exported chunk contract and deterministic ID helpers.
From `api/ingestion/discovery.py` (Plan 01): source-only candidate enumeration and exclusion filtering.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add parser dependency and implement language-aware chunk extraction</name>
  <files>api/requirements.txt, api/ingestion/tree_sitter_chunker.py, tests/test_chunking_phase03.py</files>
  <behavior>
    - .py, .ts, and .tsx files are parsed with Tree-sitter-backed language loaders.
    - Primary chunks are top-level class/function definitions per D-01.
    - Chunk metadata uses the schema from Plan 01.
  </behavior>
  <action>Add `tree-sitter-language-pack` to `api/requirements.txt`. Create `api/ingestion/tree_sitter_chunker.py` with language selection and parser initialization for Python/TypeScript-family files. Implement semantic chunk extraction around top-level class/function nodes (D-01), deriving line spans and chunk metadata from Plan 01 contract. Extend tests with Python and TSX fixture snippets that assert semantic chunk output and metadata shape.</action>
  <verify>
    <automated>.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_semantic_chunking_python_and_tsx -q</automated>
  </verify>
  <done>Tree-sitter chunker emits semantic chunks for Python and TSX with required metadata fields.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement oversized-symbol split and hybrid fallback behavior</name>
  <files>api/ingestion/tree_sitter_chunker.py, api/ingestion/pipeline.py, tests/test_chunking_phase03.py</files>
  <behavior>
    - Oversized symbols split by logical direct AST child nodes while preserving parent symbol metadata per D-02.
    - Parse failures emit coarse fallback chunks and structured failure metadata per D-05 and D-06.
    - Pipeline composition keeps ingestion running even when individual files fail parse.
  </behavior>
  <action>Add configurable size threshold logic in `api/ingestion/tree_sitter_chunker.py` to split oversized top-level symbols by child AST ranges (D-02). Implement fallback emission when parser/language load fails or parse status is invalid: coarse line-range chunk(s) with `parse_status=error`, `error_type`, trimmed `error_message`, and `fallback_mode` (D-05/D-06). Create `api/ingestion/pipeline.py` entrypoint that consumes discovery output and returns all chunks (semantic or fallback) without aborting the full run.</action>
  <verify>
    <automated>.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_hybrid_fallback_on_parse_failure -q</automated>
  </verify>
  <done>Oversized split and hybrid fallback behavior are both implemented and covered by passing tests.</done>
</task>

</tasks>

<verification>
- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q`
- `.venv/Scripts/python.exe -m pytest tests/test_startup_import.py -q`
</verification>

<success_criteria>
- Semantic chunk extraction works for `.py`, `.ts`, and `.tsx` inputs.
- Oversized symbol splitting preserves symbol ancestry metadata while reducing chunk size.
- Parse failures do not stop ingestion and always emit fallback chunks with structured diagnostics.
- Output chunk objects align exactly with schema introduced in Plan 01.
</success_criteria>

<output>
After completion, create `.planning/phases/03-code-parsing-with-tree-sitter/03-02-SUMMARY.md`.
</output>
