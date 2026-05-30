---
phase: 21
slug: dual-model-agent-orchestrator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | pytest.ini |
| **Quick run command** | `pytest tests/ -m "not e2e"` |
| **Full suite command** | `pytest tests/` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -m "not e2e"`
- **After every plan wave:** Run `pytest tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | MR-02 | T-21-01 / — | Truncate prompts to VRAM limits | unit | `pytest tests/test_phase21_classifier.py` | ⏳ W0 | ⬜ pending |
| 21-02-01 | 02 | 2 | MR-01 | T-21-02 / — | Hardware-enforced isolation | unit | `pytest tests/test_phase21_reasoning.py` | ⏳ W0 | ⬜ pending |
| 21-03-01 | 03 | 3 | FR-01 | T-21-03 / — | Graceful failover to Fast model | unit | `pytest tests/test_phase21_fallback.py` | ⏳ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_phase21_classifier.py` — stubs for MR-02
- [ ] `tests/test_phase21_reasoning.py` — stubs for MR-01
- [ ] `tests/test_phase21_fallback.py` — stubs for FR-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual MI300X VRAM util | IR-01 | Hardware dependent | Deploy to ROCm instance, run `rocm-smi` during inference |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** {pending / approved 2026-05-10}
