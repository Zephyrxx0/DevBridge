---
phase: 33
slug: behavior-pinning-prompt-helpers
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 33 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest `30.4.2` + ts-jest `29.4.9` + React Testing Library `16.3.2` + jest-dom `6.9.1` |
| **Config file** | `web/jest.config.js` |
| **Quick run command** | `npm run test --prefix web -- prompt-context ChatInput ChatStream useOnboarding` |
| **Full suite command** | `npm run test --prefix web` |
| **Estimated runtime** | ~30 seconds quick, project-dependent full suite |

---

## Sampling Rate

- **After every task commit:** Run `npm run test --prefix web -- prompt-context ChatInput ChatStream useOnboarding`
- **After every plan wave:** Run `npm run test --prefix web`
- **Before `/gsd-verify-work`:** `npm run test --prefix web && npx --yes fallow --production` must be green or explicitly documented
- **Max feedback latency:** 60 seconds for quick feedback

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | PRMP-01 | T-33-01 | Prompt builder preserves display/backend separation and explicit failure notes | unit | `npm run test --prefix web -- prompt-context` | No - Wave 0 creates `web/src/lib/chat/prompt-context.test.ts` | pending |
| 33-01-02 | 01 | 1 | PRMP-02 | T-33-02 | `ChatInput` submit callback carries typed text only; no `FormEvent` leaves component | component unit | `npm run test --prefix web -- ChatInput` | No - Wave 0 creates `web/src/components/chat/__tests__/ChatInput.test.tsx` | pending |
| 33-01-03 | 01 | 1 | PRMP-03 | T-33-03 | Chip labels expose type/scope/caps and immediate removal | component unit | `npm run test --prefix web -- ChatInput` | No - Wave 0 creates `web/src/components/chat/__tests__/ChatInput.test.tsx` | pending |
| 33-01-04 | 01 | 1 | SHELL-03 | T-33-04 | Onboarding full flow states, cached plan reuse, reopen, and completion remain unchanged | hook/render unit | `npm run test --prefix web -- useOnboarding ChatStream` | Yes - extend existing files | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `web/src/lib/chat/prompt-context.test.ts` - covers PRMP-01 prompt builder cases.
- [ ] `web/src/components/chat/__tests__/ChatInput.test.tsx` - covers PRMP-02 and PRMP-03.
- [ ] Extend `web/src/components/chat/__tests__/ChatStream.test.tsx` - covers SHELL-03 first-run/reopen/completion.
- [ ] Extend `web/src/hooks/useOnboarding.test.ts` - covers cached plan, cancel, try-again/error, EventSource close.

Existing infrastructure covers test runner/config dependencies.

---

## Manual-Only Verifications

All phase behaviors have automated verification targets. Manual smoke in browser is optional after tests pass.

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency target below 60s for quick suite
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-29
