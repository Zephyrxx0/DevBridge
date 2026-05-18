---
phase: 22
slug: knowledge-graph-with-internal-resolution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x |
| **Config file** | pytest.ini |
| **Quick run command** | `pytest tests/test_phase22_*.py` |
| **Full suite command** | `pytest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_phase22_*.py`
- **After every plan wave:** Run `pytest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | DR-01 | — | N/A | unit | `pytest tests/test_phase22_schema.py` | ⏳ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | FR-02 | — | N/A | unit | `pytest tests/test_phase22_extraction.py` | ⏳ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | FR-02 | T-22-01 | Drop unresolvable external calls | unit | `pytest tests/test_phase22_resolution.py` | ⏳ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | FR-02 | — | N/A | unit | `pytest tests/test_phase22_integration.py` | ⏳ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_phase22_schema.py` — stubs for DB model validation
- [ ] `tests/test_phase22_extraction.py` — stubs for Tree-sitter extraction
- [ ] `tests/test_phase22_resolution.py` — stubs for internal symbol resolution
- [ ] `tests/test_phase22_integration.py` — stubs for pipeline integration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual graph visualization | FR-02 | UI dependent | Open Knowledge Map in browser, verify internal edges appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** {pending / approved 2026-05-10}
