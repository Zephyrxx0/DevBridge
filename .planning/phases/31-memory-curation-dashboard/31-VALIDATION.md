---
phase: 31
slug: memory-curation-dashboard
status: draft
nyquist_compliant: true
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
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest api/tests/test_phase31_memory.py -x` (backend) or `npx playwright test web/tests/memory-dashboard.spec.ts` (frontend)
- **After every plan wave:** Run `pytest`
- **Before /gsd:verify-work:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-00 | 01 | 1 | MEM-04 | — | N/A | test-stub | `pytest api/tests/test_phase31_memory.py` | ❌ W0 | ⬜ pending |
| 31-01-01 | 01 | 1 | MEM-04 | T-31-01 | Auth/Isolation | unit | `pytest api/tests/test_phase31_memory.py` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | MEM-04 | — | N/A | config | `grep -q "memory_router" api/main.py` | ✅ | ⬜ pending |
| 31-02-00 | 02 | 1 | MEM-04 | — | N/A | test-stub | `npx playwright test web/tests/memory-dashboard.spec.ts` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 1 | MEM-04 | — | N/A | navigation | `grep -q "/dashboard/memory" web/src/components/floating-header.tsx` | ✅ | ⬜ pending |
| 31-02-02 | 02 | 1 | MEM-04 | T-31-04 | Navigation Check | integration | `npx playwright test web/tests/memory-dashboard.spec.ts` | ❌ W0 | ⬜ pending |
| 31-03-01 | 03 | 2 | MEM-04 | T-31-05 | Semantic Display | integration | `npx playwright test web/tests/memory-dashboard.spec.ts --grep @list` | ❌ W0 | ⬜ pending |
| 31-03-02 | 03 | 2 | MEM-04 | T-31-06 | Deletion Check | integration | `npx playwright test web/tests/memory-dashboard.spec.ts --grep @delete` | ❌ W0 | ⬜ pending |
| 31-04-01 | 04 | 3 | MEM-04 | T-31-07 | PUT isolation | unit | `pytest api/tests/test_phase31_memory.py` | ❌ W0 | ⬜ pending |
| 31-04-02 | 04 | 3 | MEM-04 | T-31-08 | Edit Sanitization | integration | `npx playwright test web/tests/memory-dashboard.spec.ts --grep @edit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/tests/test_phase31_memory.py` — stubs for memory routes, isolation, and update (Plan 01 Task 0)
- [ ] `web/tests/memory-dashboard.spec.ts` — stubs for UI navigation, list, delete, and edit (Plan 02 Task 0)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Expandable UI | MEM-04 | Visual Feel | Open /dashboard/memory, verify long text can be expanded/collapsed smoothly. |

---

## Validation Sign-Off

- [x] All tasks have <automated> verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
