---
phase: 03-code-parsing-with-tree-sitter
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - api/ingestion/__init__.py
  - api/ingestion/types.py
  - api/ingestion/discovery.py
  - tests/test_chunking_phase03.py
autonomous: true
requirements:
  - "Implement chunking logic for .ts and .py using Tree-sitter"
  - "Define metadata schema for code chunks"

must_haves:
  truths:
    - "Parser pipeline has a single chunk contract with deterministic IDs and required metadata fields."
    - "Only source files in api/**/*.py and web/src/**/*.ts(x) are discovered by default."
    - "Generated/vendor/system directories are excluded from parse input."
  artifacts:
    - path: "api/ingestion/types.py"
      provides: "Chunk metadata schema and deterministic ID helpers"
    - path: "api/ingestion/discovery.py"
      provides: "File discovery and exclusion logic for Phase 03 scope"
    - path: "tests/test_chunking_phase03.py"
      provides: "Automated checks for schema and discovery rules"
  key_links:
    - "api/ingestion/discovery.py enforces D-07/D-08 scope so chunking receives only in-scope source files"
    - "api/ingestion/types.py deterministic ID helper implements D-04 using normalized path + symbol path + range + content hash"
---

<objective>
Create the Phase 03 ingestion contracts first: a stable chunk metadata schema, deterministic chunk IDs, and source-only file discovery filters that match locked user decisions.

Purpose: lock interfaces before parser implementation so downstream chunk extraction can be implemented without re-deciding shape or scope.
Output: reusable ingestion contract module + discovery module + tests that freeze schema/scope behavior.
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
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Define chunk contracts and deterministic metadata IDs</name>
  <files>api/ingestion/__init__.py, api/ingestion/types.py</files>
  <behavior>
    - Chunk records expose required fields from D-03: repo, file_path, language, symbol_name, symbol_kind, start_line, end_line, chunk_type, content_hash.
    - Chunk ID generation follows D-04 and is deterministic for identical inputs.
    - Chunk records carry parse status fields needed by D-06.
  </behavior>
  <action>Create a typed chunk contract module (dataclass or TypedDict) in `api/ingestion/types.py` and export it from `api/ingestion/__init__.py`. Include helper utilities that normalize file paths and build deterministic `chunk_id` values from file path + symbol path + line range + content hash (per D-04). Include parse failure fields (`parse_status`, `error_type`, `error_message`, `fallback_mode`) in the contract per D-06.</action>
  <verify>
    <automated>.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_chunk_schema_and_deterministic_id -q</automated>
  </verify>
  <done>Chunk type contract and deterministic ID helper exist and tests prove required fields and deterministic behavior.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement source-only file discovery with exclusion rules</name>
  <files>api/ingestion/discovery.py, tests/test_chunking_phase03.py</files>
  <behavior>
    - Discovery includes only api/**/*.py and web/src/**/*.ts(x) paths per D-07.
    - Discovery excludes node_modules, .next, dist, build, .venv, and generated artifacts per D-08.
    - .tsx is included explicitly per D-09.
  </behavior>
  <action>Add discovery helpers in `api/ingestion/discovery.py` that accept repo root + candidate paths and return normalized parse candidates. Ensure filtering is deterministic and cross-platform (Windows path separators handled). Extend `tests/test_chunking_phase03.py` with fixture paths covering in-scope, out-of-scope, excluded-dir, and `.tsx` cases.</action>
  <verify>
    <automated>.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_file_discovery_scope_filters -q</automated>
  </verify>
  <done>Discovery returns only in-scope parse candidates and all excluded directories are filtered out.</done>
</task>

</tasks>

<verification>
Run `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q` and confirm schema/discovery tests pass in the project venv.
</verification>

<success_criteria>
- Chunk schema fields and deterministic `chunk_id` contract are fixed and tested.
- File discovery behavior exactly matches D-07, D-08, and D-09 decisions.
- Plan 02 can consume these interfaces without redefining metadata or scope.
</success_criteria>

<output>
After completion, create `.planning/phases/03-code-parsing-with-tree-sitter/03-01-SUMMARY.md`.
</output>
