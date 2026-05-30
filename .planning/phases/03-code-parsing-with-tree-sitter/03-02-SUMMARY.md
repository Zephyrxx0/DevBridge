---
phase: 03-code-parsing-with-tree-sitter
plan: "02"
subsystem: ingestion
tags: [tree-sitter, semantic-chunking, fallback]
requires:
  - phase: 03-01
    provides: Contracts and discovery filters
provides:
  - Tree-sitter chunker with Python and TypeScript-family language routing
  - Oversized symbol split by logical child nodes
  - Hybrid fallback chunks with structured parse failure metadata
  - Pipeline helpers for chunking repository files and source maps
affects: [api/ingestion, api/requirements.txt, tests]

key-files:
  created:
    - api/ingestion/tree_sitter_chunker.py
    - api/ingestion/pipeline.py
  modified:
    - api/requirements.txt
    - tests/test_chunking_phase03.py

key-decisions:
  - Keep parser dependency loaded lazily in chunker runtime.
  - Preserve parent symbol metadata on split child chunks.
  - Continue ingestion on parser failures by emitting fallback chunks.

requirements-completed:
  - Implement chunking logic for .ts and .py using Tree-sitter
  - Define metadata schema for code chunks

metrics:
  tests_phase03: 4
  tests_total: 9

duration: 25 min
completed: 2026-04-18
status: complete
---

# Phase 03 Plan 02 Summary

Implemented semantic chunk extraction and resilient fallback handling for Phase 03.

## Completed Work

- Added `tree-sitter-language-pack` dependency.
- Implemented language-aware chunking for `.py`, `.ts`, and `.tsx` sources.
- Added oversized-symbol splitting by named AST child nodes.
- Implemented fallback chunks with `parse_status`, `error_type`, `error_message`, and `fallback_mode` fields.
- Added pipeline entrypoints to chunk from filesystem discovery and in-memory source maps.
- Expanded tests to validate semantic extraction and parse-failure fallback behavior.

## Verification

- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_semantic_chunking_python_and_tsx -q` passed
- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_hybrid_fallback_on_parse_failure -q` passed
- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q` passed
- `.venv/Scripts/python.exe -m pytest tests/test_startup_import.py -q` passed
- `.venv/Scripts/python.exe -m pytest tests -q` passed (9 passed)
