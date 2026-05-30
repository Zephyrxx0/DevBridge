---
phase: 34-chat-shell-session-boundaries
plan: 04
subsystem: ui
tags: [react, nextjs, chat, callbacks, regression-tests]
requires:
  - phase: 34-03
    provides: ChatShell extraction and route-to-shell ownership boundary
provides:
  - Runtime-safe ChatShell remove callback dependencies
  - Regression test for ChatShell mount + remove callback execution path
affects: [phase-34-verification, chat-shell-runtime, session-boundaries]
tech-stack:
  added: []
  patterns: [lexical-hook-dependency-discipline, callback-regression-coverage]
key-files:
  created: [web/src/components/chat/__tests__/ChatShell.test.tsx]
  modified: [web/src/components/chat/ChatShell.tsx]
key-decisions:
  - "Remove out-of-scope `router` from callback dependencies instead of introducing new routing dependency."
  - "Regression test triggers `onRemoveRepo` through mocked HistorySidebar to pin exact blocker path."
patterns-established:
  - "Hook dependency arrays must include only identifiers defined in callback lexical scope."
  - "Destructive sidebar actions require mount-level callback execution regression tests."
requirements-completed: [SHELL-04]
duration: 19min
completed: 2026-05-30
---

# Phase 34 Plan 04: ChatShell Runtime Blocker Closure Summary

**ChatShell remove-repository callback now uses lexical-safe deps and regression test guards mount + callback execution against undefined-symbol crashes.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-30T16:43:00Z
- **Completed:** 2026-05-30T17:02:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- Removed undefined `router` dependency from `removeRepoFromWorkspace` callback in `ChatShell`.
- Added `ChatShell.test.tsx` with deterministic mount + `onRemoveRepo` callback execution coverage.
- Verified lint/test gates for plan scope with updated lint invocation compatible with current ESLint CLI.

## Task Commits

1. **Task 1: Remove undefined ChatShell callback dependency blocker** - `e1ccfd5` (fix)
2. **Task 2 (TDD RED): Add failing ChatShell callback regression spec** - `1087ece` (test)
3. **Task 2 (TDD GREEN): Add passing callback safety regression coverage** - `53bb251` (feat)

## Files Created/Modified
- `web/src/components/chat/ChatShell.tsx` - removed out-of-scope `router` symbol from callback dependency list.
- `web/src/components/chat/__tests__/ChatShell.test.tsx` - regression test mounts shell, triggers remove callback, asserts no throw + key side effects.

## Decisions Made
- Kept callback behavior unchanged (confirm, DELETE repo, clear localStorage, redirect). Changed dependencies only.
- Chose focused shell-level mocks to isolate runtime callback path from heavy UI/editor subcomponents.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Planned lint flag incompatible with flat ESLint config**
- **Found during:** Task 1 (verification)
- **Issue:** `npm run lint --prefix web -- --file src/components/chat/ChatShell.tsx` fails because `--file` unsupported with current ESLint config.
- **Fix:** Ran equivalent scoped lint command `npm run lint --prefix web -- src/components/chat/ChatShell.tsx`.
- **Files modified:** None (verification command adjustment only)
- **Verification:** Scoped lint completed with warnings only, zero errors.
- **Committed in:** `e1ccfd5` task flow (no file diff required)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. Verification command adapted to current toolchain semantics.

## Issues Encountered

- JSDOM logs navigation "not implemented" when callback calls `window.location.assign`; non-fatal, test still passes and callback path fully executes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 34 blocker from `34-VERIFICATION.md` resolved: undefined `router` callback dependency removed.
- Regression protection in place for mount/remove callback runtime path.

## Self-Check: PASSED

- FOUND: `.planning/phases/34-chat-shell-session-boundaries/34-04-SUMMARY.md`
- FOUND: `e1ccfd5`
- FOUND: `1087ece`
- FOUND: `53bb251`

---
*Phase: 34-chat-shell-session-boundaries*
*Completed: 2026-05-30*
