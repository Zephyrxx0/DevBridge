---
status: partial
phase: 22-knowledge-graph-with-internal-resolution
source: [22-VERIFICATION.md]
started: 2026-05-10T15:45:00Z
updated: 2026-05-10T15:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Run real repo re-index and inspect repo_graph row for same repo_id
expected: repo_graph.nodes/edges refreshed after ingestion completion
result: [pending]

### 2. Inspect graph quality on real repo with mixed internal/external calls
expected: CALLS only for internal symbols; unresolvable calls absent; shadow imports only blessed libs
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
