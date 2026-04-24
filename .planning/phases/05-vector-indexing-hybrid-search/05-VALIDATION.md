---
phase: 05
slug: vector-indexing-hybrid-search
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
updated: 2026-04-25
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | pytest |
| Config file | none - pytest defaults |
| Quick run command | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py -q` |       
| Full suite command | `.venv/Scripts/python.exe -m pytest tests -q` |
| Estimated runtime | ~10 seconds |

---

## Sampling Rate

- After every task commit: run `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py -q`
- After every plan wave: run `.venv/Scripts/python.exe -m pytest tests -q`
- Before `/gsd-verify-work`: full suite must be green
- Max feedback latency: 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | FR-AI-02 | T-05-01 | Hybrid SQL returns bounded ranked rows and metadata under filters | unit | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py::test_hybrid_search_contract -q` | ✅ W0 | 🟢 green |
| 05-01-02 | 01 | 1 | MR-02 | T-05-02 | Embedding upsert path writes deterministic chunk-linked vectors | unit | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py::test_embedding_upsert_path -q` | ✅ W0 | 🟢 green |
| 05-02-01 | 02 | 2 | MR-01 | T-05-03 | Ingestion enqueue -> worker -> searchable retrieval path executes without mock fallback | integration | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py::test_ingest_to_search_flow_contract -q` | ✅ W0 | 🟢 green |
| 05-02-02 | 02 | 2 | Runtime cloud config consistency | T-05-04 | Canonical env key path used; legacy key accepted with warning | unit | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py::test_project_env_key_alignment -q` | ✅ W0 | 🟢 green |
| 05-02-03 | 02 | 2 | FR-AI-02 | T-05-05 | code_search emits JSON citations + summary string schema | unit | `.venv/Scripts/python.exe -m pytest tests/test_phase05_vector_search.py::test_code_search_output_schema -q` | ✅ W0 | 🟢 green |

Status: pending, green, red, flaky

---

## Wave 0 Requirements

- [x] `tests/test_phase05_vector_search.py` - phase contract tests and fixtures

---

## Manual-Only Verifications

- None planned; phase targets full automation for core behaviors.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity maintained
- [x] Wave 0 created for all missing references
- [x] No watch-mode flags
- [x] Feedback latency under 15 seconds
- [x] `nyquist_compliant: true` set before phase close

Approval: verified
