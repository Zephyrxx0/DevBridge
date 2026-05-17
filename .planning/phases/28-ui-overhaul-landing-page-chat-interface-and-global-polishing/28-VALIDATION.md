---
phase: 28
slug: 28-ui-overhaul-landing-page-chat-interface-and-global-polishing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-18
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x / Playwright |
| **Config file** | `web/jest.config.js` / `web/playwright.config.ts` |
| **Quick run command** | `cd web && npm run test` |
| **Full suite command** | `cd web && npx playwright test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run unit tests for affected component.
- **After every plan wave:** Run Playwright smoke tests for new layout.
- **Before `/gsd:verify-work`:** Full visual regression and E2E suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | FR-07 | — | N/A | visual | `cd web && npx playwright test tests/landing.spec.ts` | ⏳ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | FR-07 | — | N/A | e2e | `cd web && npx playwright test tests/chat.spec.ts` | ⏳ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/tests/landing.spec.ts` — Visual verification stubs for landing overhaul.
- [ ] `web/tests/chat.spec.ts` — E2E streaming verification stubs.
- [ ] `npx ai-elements@latest` — Initialization of registry components.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dithered Gradient Quality | D-01 | Aesthetic | Inspect landing page hero background for dithering artifacts and smooth animation. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
