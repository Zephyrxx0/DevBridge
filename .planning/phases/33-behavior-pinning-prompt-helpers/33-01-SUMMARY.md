---
phase: 33-behavior-pinning-prompt-helpers
plan: 01
subsystem: ui
tags: [chat, prompt, context, testing]
requires: []
provides:
  - Pure prompt context builder with exact backend formatting
  - Discriminated context chip contracts for snippet/file/folder
affects: [33-02]
tech-stack:
  added: []
  patterns: [pure-helper, discriminated-union, exact-string-regression-tests]
key-files:
  created: [web/src/lib/chat/prompt-context.ts, web/src/lib/chat/prompt-context.test.ts]
  modified: [web/src/components/chat/types.ts]
key-decisions:
  - "Keep loaded snippet/file/folder payloads under Referenced snippets exactly"
  - "Keep @path mentions label-only under Referenced files"
patterns-established:
  - "Prompt assembly in pure helper, not route-local string building"
requirements-completed: [PRMP-01, PRMP-03]
duration: 0min
completed: 2026-05-30
---

# Phase 33 Plan 01 Summary

**Prompt assembly now pure and typed: display text separated from backend-expanded prompt with exact regression pins.**

## Accomplishments
- Added discriminated chip types and kept `SnippetChip` compatibility alias.
- Implemented `buildPromptContext()` and exported heading constants/contracts.
- Added exact tests locking prompt formatting, mention rewrite, and artifact cloning.

## Task Commits
1. `169f9fc`
2. `bbf640b`
3. `733a562`

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
- `fallow --production` reports pre-existing repo-wide findings; not caused by this plan scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for route integration in plan 33-02 using `buildPromptContext`.
