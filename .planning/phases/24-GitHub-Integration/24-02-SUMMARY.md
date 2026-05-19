---
phase: 24-GitHub-Integration
plan: 02
subsystem: api
tags: [github, apscheduler, pgvector, fastapi, langgraph]

requires:
  - phase: 24-GitHub-Integration
    provides: GitHub issue table and token RPC from 24-01
provides:
  - Daily APScheduler job to sync GitHub issues into repo_github_issues
  - LangGraph tool map_issue_to_files for issue-to-code grounding
affects: [agent-grounding, github-sync, scheduling]

tech-stack:
  added: [APScheduler==3.10.4]
  patterns: [FastAPI lifespan scheduler, on-demand issue sync, pure SQL pgvector cosine join]

key-files:
  created: []
  modified: [api/requirements.txt, api/main.py, api/agents/orchestrator.py]

key-decisions:
  - "Run GitHub issue sync in AsyncIOScheduler from FastAPI lifespan"
  - "Keep issue mapping fully in Postgres using code_chunks.embedding <=> repo_github_issues.embedding"
  - "On-demand sync missing issue before similarity query"

patterns-established:
  - "Background sync pattern: urllib.request + asyncio.to_thread + vector upsert"
  - "Agent grounding pattern: ensure source row exists, then do in-DB cosine ranking"

requirements-completed: [FR-04]

duration: 12 min
completed: 2026-05-10
---

# Phase 24 Plan 02: Scheduler + Issue Mapping Tool Summary

**Daily GitHub issue synchronization and in-database issue-to-file semantic mapping shipped with APScheduler and a new orchestrator tool.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-10T19:53:00Z
- **Completed:** 2026-05-10T20:04:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added APScheduler dependency and FastAPI lifespan scheduler startup/shutdown wiring.
- Implemented async daily `sync_issues` job that fetches GitHub issues, embeds text, and upserts into `repo_github_issues`.
- Added `map_issue_to_files` tool with on-demand missing-issue sync and pure SQL pgvector cosine join against `code_chunks`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add APScheduler and Configure FastAPI Lifespan** - `110ac77` (feat)
2. **Task 2: Implement map_issue_to_files Agent Tool with On-Demand Sync** - `a1642f8` (feat)

**Plan metadata:** pending in this commit

## Files Created/Modified
- `api/requirements.txt` - Adds APScheduler runtime dependency.
- `api/main.py` - Adds scheduler lifecycle, daily `sync_issues`, GitHub fetch + embedding + DB upsert flow.
- `api/agents/orchestrator.py` - Adds `map_issue_to_files` tool, single-issue sync helper, and tool registration.

## Decisions Made
- Used `asyncio.to_thread` around blocking network/embedding operations in sync path to satisfy DoS mitigation and protect ASGI event loop responsiveness.
- Scoped code chunk matching in mapping SQL to repository identifiers derivable from `repositories` table values.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 24 goals now complete: token-backed issue storage exists, daily sync exists, and agent issue mapping tool exists.

## Known Stubs
None.

## Self-Check: PASSED
- Found: `.planning/phases/24-GitHub-Integration/24-02-SUMMARY.md`
- Found commit: `110ac77`
- Found commit: `a1642f8`

---
*Phase: 24-GitHub-Integration*
*Completed: 2026-05-10*
