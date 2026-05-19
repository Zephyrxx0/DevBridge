---
phase: 32
slug: streaming-escalation-ux
status: draft
nyquist_compliant: false
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
| 32-01-01 | 01 | 1 | UX-01 | — | N/A | unit | `pytest api/tests/test_phase32_sse.py::test_custom_event_dispatch` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | UX-01 | — | N/A | integration | `pytest api/tests/test_phase32_sse.py::test_sse_metadata_packet` | ❌ W0 | ⬜ pending |
| 32-02-01 | 02 | 2 | UX-01 | — | N/A | unit | `npm run test web/src/components/chat/__tests__/ChatStream.test.tsx` | ❌ W0 | ⬜ pending |
| 32-02-02 | 02 | 2 | UX-01 | — | N/A | integration | `npx playwright test web/tests/escalation-ux.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `api/tests/test_phase32_sse.py` — stubs for custom event dispatch and SSE packets
- [ ] `web/tests/escalation-ux.spec.ts` — stubs for pulse/color shift visual checks

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pulse/Color Animation | UX-01 | Visual feel | Trigger escalation in UI; verify pulse effect is noticeable and smooth. |

---

## Validation Sign-Off

- [ ] All tasks have <automated> verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
