---
phase: 01
slug: project-skeleton-core-orchestrator
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-18
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + Next.js build |
| **Config file** | none — pytest defaults, Next.js app build defaults |
| **Quick run command** | `.venv/Scripts/python.exe -m pytest tests/test_startup_import.py -q` |
| **Full suite command** | `.venv/Scripts/python.exe -m pytest tests -q` + `cd web ; npm run build` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run startup import smoke check
- **After every plan wave:** Run full Python suite and frontend build
- **Before `/gsd-verify-work`:** Full suite/build must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | Orchestrator Agent baseline | — | Backend app imports and initializes orchestrator without startup crash | smoke | `.venv/Scripts/python.exe -m pytest tests/test_startup_import.py -q` | ✅ | ✅ green |
| 01-01-02 | 01 | 1 | Streaming Dashboard scaffold | — | Frontend route compiles and static pages generate | build | `cd web ; npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification for scaffold-level outcomes.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-18

## Validation Audit 2026-04-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
