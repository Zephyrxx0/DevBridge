---
phase: 03
slug: code-parsing-with-tree-sitter
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest |
| **Config file** | none — pytest defaults |
| **Quick run command** | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q` |
| **Full suite command** | `.venv/Scripts/python.exe -m pytest tests -q` |
| **Estimated runtime** | ~4 seconds |

---

## Sampling Rate

- **After every task commit:** Run `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q`
- **After every plan wave:** Run `.venv/Scripts/python.exe -m pytest tests -q`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | Define metadata schema for code chunks | T-03-03 | Deterministic IDs and stable chunk metadata avoid ambiguous identity and overexposed parser diagnostics | unit | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_chunk_schema_and_deterministic_id -q` | ✅ | ✅ green |
| 03-01-02 | 01 | 1 | Implement chunking logic for .ts and .py using Tree-sitter | T-03-01 | Discovery is constrained to source paths and excludes generated/vendor directories | unit | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_file_discovery_scope_filters -q` | ✅ | ✅ green |
| 03-02-01 | 02 | 2 | Implement chunking logic for .ts and .py using Tree-sitter | T-03-01 | Semantic chunk extraction only for intended file types and top-level symbols | unit | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_semantic_chunking_python_and_tsx -q` | ✅ | ✅ green |
| 03-02-02 | 02 | 2 | Define metadata schema for code chunks | T-03-02 / T-03-03 | Parse failure path is non-fatal and emits structured, bounded diagnostics in fallback chunks | unit | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_hybrid_fallback_on_parse_failure -q` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-18

## Validation Audit 2026-04-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
