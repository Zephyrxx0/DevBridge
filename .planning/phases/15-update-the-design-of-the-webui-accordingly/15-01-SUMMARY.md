---
phase: 15-update-the-design-of-the-webui-accordingly
plan: 01
subsystem: ui
tags: [nextjs, tailwindcss, design-tokens, typography, oklch]

# Dependency graph
requires: []
provides:
  - Global typography foundation with Syne, Inter, and JetBrains Mono wired via next/font
  - Global dark-first DESIGN.md token system in globals.css (surface, brand, spacing, gradients)
affects: [landing-page, app-shell, chat-ui, repo-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [next/font CSS variable roots, dark-first OKLCH token aliases for shadcn]

key-files:
  created: []
  modified:
    - web/src/app/layout.tsx
    - web/src/app/globals.css

key-decisions:
  - "Attach all three font CSS variables on <html> and keep body class minimal"
  - "Map new DESIGN.md palette through semantic shadcn aliases to avoid API churn in existing UI components"

patterns-established:
  - "Design tokens live in :root with .light overrides; dark remains default"
  - "Typography tokens and spacing tokens centralized in globals.css for phase-wide reuse"

requirements-completed: []

# Metrics
duration: 2 min
completed: 2026-04-27
---

# Phase 15 Plan 01: Design foundation token update Summary

**Dark-first global UI foundation shipped: Syne/Inter/JetBrains typography + OKLCH surface/brand/spacing token system aligned to DESIGN.md.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-27T15:28:25Z
- **Completed:** 2026-04-27T15:30:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced old font pair in `layout.tsx` with DESIGN.md typography stack and proper variable weights.
- Applied font CSS variables to root HTML element while preserving existing `ThemeProvider` flow.
- Replaced default global token set with DESIGN.md dark-first OKLCH palette, semantic aliases, spacing scale, gradients, and `.light` overrides.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DESIGN.md typography tokens** - `1df73ff` (feat)
2. **Task 2: Replace globals.css with DESIGN.md color/spacing tokens** - `75770a0` (feat)

## Files Created/Modified
- `web/src/app/layout.tsx` - Swapped to Syne/Inter/JetBrains Mono and attached variables on `<html>`.
- `web/src/app/globals.css` - Replaced global token system with DESIGN.md sections 2-3 plus type/spacing token scales.

## Decisions Made
- Keep `ThemeProvider` and theme-init script unchanged; only typography/token layer changed in this plan.
- Preserve existing shadcn token API surface by remapping aliases (`--primary`, `--card`, `--muted`, etc.) to new DESIGN.md primitives.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Issues Encountered
- Full `npm run build` surfaced an existing TypeScript error in `web/src/app/repo/[id]/page.tsx` unrelated to this plan’s files.
- Logged to `.planning/phases/15-update-the-design-of-the-webui-accordingly/deferred-items.md` as out-of-scope blocker for full-project typecheck.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Visual foundation ready for page-level redesign tasks in 15-02+.
- Next plan can now apply components/sections against stable global color/space/type tokens.

---
*Phase: 15-update-the-design-of-the-webui-accordingly*
*Completed: 2026-04-27*

## Self-Check: PASSED
