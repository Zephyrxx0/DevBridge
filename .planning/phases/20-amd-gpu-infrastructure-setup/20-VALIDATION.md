---
phase: 20
slug: amd-gpu-infrastructure-setup
status: active
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-10
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x |
| **Config file** | `pytest.ini` |
| **Quick run command** | `pytest tests/ -m "not e2e"` |
| **Full suite command** | `pytest tests/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -m "not e2e"`
- **After every plan wave:** Run `pytest tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | IR-01, IR-03 | T-20-01 | Truncate over-limit prompts | unit | `pytest tests/test_phase20_config.py tests/test_phase20_truncation.py` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | IR-03 | T-20-01 | App-layer cap enforcement | lint | `grep -v '^#' api/routes/chats.py \| grep -c enforce_cap` | ✅ | ⬜ pending |
| 20-01-03 | 01 | 1 | IR-01 | T-20-02 | Hardware VRAM isolation | infra | `docker compose config` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | IR-02 | T-20-03 | Prevent root-owned caches | infra | `docker compose config` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 2 | IR-02 | — | Fast startup (no on-init pull) | shell | `bash -n scripts/download_models.sh` | ✅ | ⬜ pending |
| 20-03-01 | 03 | 3 | IR-01 | — | Config defaults to Vertex | unit | `pytest tests/test_phase20_config.py` | ✅ | ⬜ pending |
| 20-03-02 | 03 | 3 | IR-01 | — | Runtime service selection | shell | `python -c "from api.db.vector_store import vector_db; from api.core.config import settings; assert settings.embedding_model == 'text-embedding-004'"` | ✅ | ⬜ pending |
| 20-03-03 | 03 | 3 | IR-01 | T-20-02 | Fallback logic verification | unit | `pytest tests/test_vertex_embeddings.py` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/test_phase20_config.py` — existing
- [x] `tests/test_phase20_truncation.py` — existing
- [ ] `tests/test_vertex_embeddings.py` — pending Task 20-03-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual MI300X VRAM util | IR-01 | Hardware dependent | Deploy to ROCm instance, run `rocm-smi` during inference, check % util |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-10
