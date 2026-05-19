---
status: partial
phase: 30-speculative-router-setup
source: [30-VERIFICATION.md]
started: 2026-05-19T20:46:06Z
updated: 2026-05-19T20:46:06Z
---

## Current Test

awaiting human testing

## Tests

### 1. Live escalation rerun
expected: Wrapper performs second pass (`force_direct=True` path), final content from big model, `model_used` big model, `cascaded=true`.
result: pending

### 2. End-to-end graph chat run
expected: `recall -> cascade -> retain` executes, response returned, routing metadata preserved.
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
