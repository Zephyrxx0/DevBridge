---
phase: 32
slug: streaming-escalation-ux
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-20
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + playwright |
| **Config file** | pytest.ini + playwright.config.ts |
| **Quick run command** | pytest api/tests/test_phase32_sse.py -x |
| **Full suite command** | pytest && npm run test |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest api/tests/test_phase32_sse.py -x`
- **After every plan wave:** Run `pytest`
- **Before /gsd:verify-work:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-00 | 01 | 1 | UX-01 | — | N/A | scaffold | `pytest api/tests/test_phase32_sse.py` | ❌ W0 | ⬜ pending |
| 32-01-01 | 01 | 1 | UX-01 | T-32-01 | Sanitize metadata | unit | `pytest api/tests/test_phase32_sse.py` | ✅ | ⬜ pending |
| 32-01-02 | 01 | 1 | UX-01 | — | N/A | build | `npm run build --prefix web` | ✅ | ⬜ pending |
| 32-02-01 | 02 | 2 | UX-01 | — | N/A | build/unit | `npm run build --prefix web && npm run test --prefix web -- ChatStream` | ✅ | ⬜ pending |
| 32-02-02 | 02 | 2 | UX-01 | — | N/A | manual | N/A | ✅ | ⬜ pending |
| 32-02-03 | 02 | 2 | UX-01 | — | N/A | E2E/maint | `npx playwright test web/tests/escalation-ux.spec.ts && graphify update .` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/tests/test_phase32_sse.py` — Created in 32-01-00
- [ ] `web/src/components/chat/__tests__/ChatStream.test.tsx` — Created in 32-02-01
- [ ] `web/tests/escalation-ux.spec.ts` — Created in 32-02-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pulse/Color Animation | UX-01 | Visual feel | Trigger escalation in UI (Task 32-02-02); verify pulse effect is noticeable and smooth. |

---

## Validation Sign-Off

- [x] All tasks have <automated> verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
