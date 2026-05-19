---
phase: 31
slug: memory-curation-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + playwright |
| **Config file** | pytest.ini + playwright.config.ts |
| **Quick run command** | pytest api/tests/test_phase31_memory.py -x |
| **Full suite command** | pytest && npm run test |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest api/tests/test_phase31_memory.py -x`
- **After every plan wave:** Run `pytest`
- **Before /gsd:verify-work:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | MEM-04 | — | N/A | unit | `pytest api/tests/test_phase31_memory.py::test_memory_routes_registered` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | MEM-04 | T-31-01 | bank_id isolation | unit | `pytest api/tests/test_phase31_memory.py::test_memory_list_isolation` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 2 | MEM-04 | — | N/A | integration | `npx playwright test web/tests/memory-dashboard.spec.ts --grep @list` | ❌ W0 | ⬜ pending |
| 31-02-02 | 02 | 2 | MEM-04 | — | N/A | integration | `npx playwright test web/tests/memory-dashboard.spec.ts --grep @edit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/tests/test_phase31_memory.py` — stubs for memory routes and isolation
- [ ] `web/tests/memory-dashboard.spec.ts` — stubs for UI list and edit

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
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
