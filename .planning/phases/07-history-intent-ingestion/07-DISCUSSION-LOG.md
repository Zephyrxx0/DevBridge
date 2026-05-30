# Phase 07: History & Intent Ingestion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 07-history-intent-ingestion
**Areas discussed:** History sources, Metadata fields, Ingestion mechanism, Chunk linking

---

## History Sources

| Option | Description | Selected |
|--------|-------------|----------|
| Git metadata only | Commits via git CLI | |
| Git + PR metadata | Commits + PR descriptions + diffs | |
| Full history stack | Commits + PR descriptions + code diffs + review comments | ✓ |

**User's choice:** Full history stack — git commits, PR descriptions, code diffs, and code review comments.
**Notes:** Provides richest intent signal for "Why was this changed?" queries.

---

## Metadata Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal commit fields | commit hash, message, author, timestamp | |
| Commit + impact | Author + timestamp + changed files + diff stats | |
| Full metadata | Above + PR numbers, review state, code owner info | ✓ |

**User's choice:** Full metadata — author + timestamp + changed files + diff stats + PR numbers + review state + code owner info.
**Notes:** Enables filtering by author, impact, review state for context-aware answers.

---

## Ingestion Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Reactive (on-demand) | Ingest when user triggers (manual or webhook) | ✓ |
| Scheduled batch | Periodic sync (hourly/daily) | |
| Hybrid | Scheduled full sync + incremental on PR close | |

**User's choice:** Reactive (on-demand) — triggered when user requests or webhook fires.
**Notes:** More resource-efficient than scheduled batch for lower volume.

---

## Chunk Linking

| Option | Description | Selected |
|--------|-------------|----------|
| File-level linking | Link history entries to code chunks they modified | |
| Symbol-level linking | Link history intent to specific symbols/functions | |
| Dual linking | File links for broad search + symbol links for drill-down | ✓ |

**User's choice:** Dual linking — file-level links for broad search + symbol-level links for intent drill-down.
**Notes:** File links enable "show me recent changes to auth.py", Symbol links enable "why was User.validate() modified?"

---

## the agent's Discretion

- Exact git CLI commands and output parsing logic
- Database schema for history entries and chunk links
- API endpoint design for history ingestion

## Deferred Ideas

None — discussion stayed within phase scope.