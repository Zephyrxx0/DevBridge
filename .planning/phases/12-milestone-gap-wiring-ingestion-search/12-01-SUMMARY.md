---
phase: 12-milestone-gap-wiring-ingestion-search
plan: "01"
subsystem: ingestion
tags: [wiring, milestone, observability]
requires:
  - MR-01: Wiring blocker - Ingestion complete but not wired to search
  - FR-AI-02: Wiring blocker - Orchestrator search disconnected from vector store
provides:
  - ingestion_jobs table for tracking status and errors
  - Repo extraction from GCS object paths
  - Citation enforcement in search responses
  - Phase 03 verification artifact
affects: [api/ingest, api/agents, sql]

key-files:
  created:
    - sql/migrations/0017_create_ingestion_jobs.sql
    - .planning/phases/03-code-parsing-with-tree-sitter/03-VERIFICATION.md
  modified:
    - api/ingest/trigger.py
    - api/agents/orchestrator.py

key-decisions:
  - D-01: GCS path format owner/repo/path
  - D-02: Path parsing splits first two components as repo
  - D-03: ingestion_jobs table with status tracking
  - D-04: Schema includes id, repo, file_path, status, chunk_count, error_message
  - D-05: Job upsert at start/processing/end of ingestion
  - D-06: state_modifier requires citations in system prompt
  - D-07: GOOGLE_CLOUD_PROJECT canonical env var

requirements-completed:
  - MR-01: Wiring blocker - Ingestion complete but not wired to search
  - FR-AI-02: Wiring blocker - Orchestrator search disconnected from vector store

metrics:
  tasks: 3
  commits: 3
  duration: 15 min

dependencies:
  - Phase 03 (code parsing)
  - Phase 05 (vector search)

status: complete
---

# Phase 12 Plan 01 Summary

Closed wiring gaps for the v0.1 milestone audit.

## Completed Work

### Task 1: Infrastructure & Documentation Foundation
- Created `ingestion_jobs` table in Supabase with status tracking
- Deployed `pgvector` extension and `hybrid_search` function
- Consolidated Phase 03 evidence into `03-VERIFICATION.md`

### Task 2: Update Ingestion Trigger Logic
- Implemented `_parse_repo_path` to extract `owner/repo` and `file_path` from GCS object names
- Updated `handle_pubsub_event` to insert job records at ingestion start
- Updated `_ingest_file` to track status, chunk_count, and error_message
- Added `GOOGLE_CLOUD_PROJECT` context per D-07

### Task 3: Refine Orchestrator Citation Enforcement
- Added `SYSTEM_PROMPT` requiring file and line number citations
- Added `state_modifier` to inject system prompt into agent messages
- Included guidance for using PR/Commit history for "why" questions

## Deviations from Plan

None - executed as written.

## Auth Gates

None.

## Known Stubs

None.

## Verification

- `ingestion_jobs` table deployed with schema verified via Supabase
- `hybrid_search` function deployed and verified via Supabase
- Phase 03 verification artifact created from 03-01 and 03-02 SUMMARIES
- trigger.py syntax verified via py_compile
- orchestrator.py syntax verified via py_compile

---

*Plan: 12-01*
*Completed: 2026-04-26*
*Tasks: 3/3*