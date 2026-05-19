---
phase: 30
slug: speculative-router-setup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest |
| **Config file** | pytest.ini |
| **Quick run command** | pytest tests/test_phase30_routing.py -x |
| **Full suite command** | pytest |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_phase30_routing.py -x`
- **After every plan wave:** Run `pytest`
- **Before /gsd:verify-work:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | ROUT-01 | — | N/A | unit | `pip show cascadeflow` | ✅ | ⬜ pending |
| 30-01-02 | 01 | 1 | ROUT-01 | — | N/A | integration | `pytest tests/test_phase30_routing.py::test_gemma_path` | ⬜ W0 | ⬜ pending |
| 30-01-03 | 01 | 2 | ROUT-02 | — | N/A | integration | `pytest tests/test_phase30_routing.py::test_escalation_path` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_phase30_routing.py` — stubs for ROUT-01, ROUT-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | None | None | All phase behaviors have automated verification. |

---

## Validation Sign-Off

- [ ] All tasks have <automated> verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
