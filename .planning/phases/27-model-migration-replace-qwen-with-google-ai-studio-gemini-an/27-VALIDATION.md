---
phase: 27
slug: model-migration-replace-qwen-with-google-ai-studio-gemini-an
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-18
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.4 |
| **Config file** | `pytest.ini` |
| **Quick run command** | `pytest tests/test_model_migration.py` |
| **Full suite command** | `pytest tests/` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_model_migration.py`
- **After every plan wave:** Run `pytest tests/`
- **Before /gsd:verify-work:** Full suite must be green
- **Max feedback latency:** 120 seconds (due to cloud API calls)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | MR-04 | — | N/A | unit | `pytest tests/test_model_migration.py::test_genai_client_init` | ⏳ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | MR-01, MR-04 | — | N/A | integration | `pytest tests/test_model_migration.py::test_big_model_routing` | ⏳ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | IR-01 | — | N/A | unit | `ls Dockerfile docker-compose.yml` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_model_migration.py` — migration logic verification
- [ ] `pip install google-genai` — SDK installation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual Qwen removal | IR-01 | Destructive | Verify `vllm-deep` and `vllm-fast` are no longer in `docker-compose.yml` and weights deleted from `/app/repo_cache`. |

---

## Validation Sign-Off

- [ ] All tasks have <automated> verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending