# Phase 22 Code Review

Date: 2026-05-10
Scope: `api/db/models.py`, `api/db/graph_store.py`, `api/ingestion/graph_builder.py`, `api/routes/repo.py`, `tests/test_phase22_*.py`
Depth: standard

## Verdict

- Overall: **pass with warnings**
- Critical: 0
- Warning: 2
- Info: 2

## Findings

### Warning 1: Deprecated Tree-sitter query API in active path
- **Location:** `api/ingestion/graph_builder.py:117`
- **Problem:** `parser.language.query(query_text)` is deprecated. Current tests pass but emit warnings, and future `tree-sitter` updates can break symbol/relationship extraction at runtime.
- **Impact:** Potential ingestion-time graph extraction failure or drift after dependency bump.
- **Fix:** Switch to non-deprecated Query constructor usage supported by installed runtime. Add regression test/assertion that no deprecation warning is emitted for extraction path.

### Warning 2: Broad exception swallowing hides graph quality regressions
- **Location:** `api/ingestion/graph_builder.py:151-154`, `api/ingestion/graph_builder.py:177-185`
- **Problem:** Extraction and resolution failures are silently swallowed (`except Exception: ...`) without logging or counters.
- **Impact:** Graph can degrade to partial/empty edges with no operational signal, making incident triage hard.
- **Fix:** Keep non-fatal behavior, but emit structured warning logs and counters (files parsed, files failed, errors by language/query).

### Info 1: Type mismatch between caller and callee for `repo_id`
- **Location:** `api/routes/repo.py:743`, `api/db/graph_store.py:13`
- **Problem:** `GraphStoreManager.save_graph` type hints `repo_id: UUID`, caller passes `str` UUID.
- **Impact:** Runtime works due to `str(repo_id)` conversion, but static analysis/type checking noise and future refactor risk.
- **Fix:** Either widen signature to `UUID | str` or cast to `UUID` before call.

### Info 2: Alias query fixed to top 3 candidates
- **Location:** `api/ingestion/graph_builder.py:73-84`
- **Problem:** `_load_source_files` constrains repo alias match to three slots (`:a/:b/:c`).
- **Impact:** If additional alias forms appear later, query can miss rows and under-build graph.
- **Fix:** Replace fixed OR clauses with array-based `IN`/`ANY` binding and pass complete alias set.

## Validation Run

Executed:

```bash
python -m pytest tests/test_phase22_schema.py tests/test_phase22_extraction.py tests/test_phase22_resolution.py tests/test_phase22_integration.py
```

Result: **8 passed**. Warnings observed include Tree-sitter deprecation at `api/ingestion/graph_builder.py:117`.

## Recommended Next Actions

1. Remove deprecated query API usage in `api/ingestion/graph_builder.py`.
2. Add warning-level telemetry for parse/query failures without changing non-fatal ingestion semantics.
3. Tighten `repo_id` typing consistency across route and storage layers.
