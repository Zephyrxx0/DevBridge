---
phase: 03-code-parsing-with-tree-sitter
plan: "01"
subsystem: ingestion
tags: [tree-sitter, chunk-contracts, discovery]
requires: []
provides:
  - Chunk metadata schema with deterministic chunk IDs
  - Source-only discovery for api/**/*.py and web/src/**/*.ts(x)
  - Coverage tests for schema and discovery filters
affects: [api/ingestion, tests]

key-files:
  created:
    - api/ingestion/__init__.py
    - api/ingestion/types.py
    - api/ingestion/discovery.py
    - tests/test_chunking_phase03.py
  modified: []

key-decisions:
  - Preserve deterministic chunk identity using file path, symbol path, line range, and content hash.
  - Keep discovery restricted to source paths and exclude generated/vendor/system directories.

requirements-completed:
  - Implement chunking logic for .ts and .py using Tree-sitter
  - Define metadata schema for code chunks

duration: 20 min
completed: 2026-04-18
status: complete
---

# Phase 03 Plan 01 Summary

Implemented the foundational ingestion interfaces for Phase 03.

## Completed Work

- Added a strongly-typed code chunk contract with required metadata fields.
- Added deterministic chunk ID construction and normalized path helpers.
- Implemented source candidate discovery constrained to `api/**/*.py` and `web/src/**/*.ts(x)`.
- Added tests for schema correctness, deterministic IDs, and discovery filters.

## Verification

- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_chunk_schema_and_deterministic_id -q` passed
- `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_file_discovery_scope_filters -q` passed
