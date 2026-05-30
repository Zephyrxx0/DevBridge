---
phase: 29
slug: memory-storage-foundations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 |
| **Config file** | pytest.ini |
| **Quick run command** | pytest api/tests/test_phase29_memory.py -x |
| **Full suite command** | pytest |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest api/tests/test_phase29_memory.py -x`
- **After every plan wave:** Run `pytest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | MEM-01 | — | N/A | unit | `pytest api/tests/test_phase29_memory.py::test_memory_nodes -x` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | MEM-02 | T-29-01 | bank_id mapping locked to authenticated user context | integration | `pytest api/tests/test_phase29_memory.py::test_embedded_init -x` | ❌ W0 | ⬜ pending |
| 29-01-03 | 01 | 1 | MEM-03 | — | N/A | unit | `pytest api/tests/test_phase29_memory.py::test_reflect_job_scheduled -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/tests/test_phase29_memory.py` — stubs for MEM-01, MEM-02, MEM-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | None | None | All phase behaviors have automated verification. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
