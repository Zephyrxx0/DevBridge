---
phase: 26
slug: admin-dashboard
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-16
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest / Playwright |
| **Config file** | `pytest.ini` / `playwright.config.ts` |
| **Quick run command** | `pytest tests/test_admin_dashboard.py` |
| **Full suite command** | `pytest tests/` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_admin_auth.py`
- **After every plan wave:** Run `pytest tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | FR-06 | V4 | Validates users.is_admin | unit | `pytest tests/test_admin_auth.py` | ✅ W1 | ✅ green |
| 26-01-02 | 01 | 1 | FR-06 | - | N/A | unit | `pytest tests/test_report_generator.py` | ✅ W1 | ✅ green |
| 26-01-03 | 01 | 1 | FR-06 | V5 | ReportsHub path traversal prevention | e2e | `npx playwright test tests/admin.spec.ts` | ✅ W1 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `sql/migrations/0031_add_is_admin.sql`
- [x] `tests/test_admin_auth.py`
- [x] `tests/test_report_generator.py`
- [x] `web/tests/admin.spec.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | FR-06 | All phase behaviors have automated verification. | |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated — 2026-05-16