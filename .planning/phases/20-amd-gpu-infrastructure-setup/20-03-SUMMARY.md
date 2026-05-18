---
phase: 20-amd-gpu-infrastructure-setup
plan: 03
subsystem: embeddings
tags: [vertex-ai, embeddings, configuration, fallback]
requires:
  - phase: 20-01
    provides: Base AMD GPU infra and API runtime
  - phase: 20-02
    provides: Containerized runtime baseline
provides:
  - Vertex AI `text-embedding-004` as default embedding model
  - Configurable embedding backend with local fallback path
  - Automated tests for embedding service selection
affects: [phase-21-dual-model-orchestrator]
tech-stack:
  added: [langchain-google-vertexai]
  patterns: [config-driven embedding provider selection, safe fallback on missing dependency]
key-files:
  created: [tests/test_vertex_embeddings.py]
  modified: [api/core/config.py, api/db/vector_store.py, api/ingestion/history.py, api/requirements.txt, .env.example]
key-decisions:
  - "Default embedding model set to text-embedding-004 to align with D-03."
  - "Use LocalEmbeddings fallback when Vertex dependency unavailable or non-Vertex model configured."
patterns-established:
  - "Expose embedding service selection via VectorStoreManager.get_embedding_service()."
  - "History ingestion uses shared embedding selection path instead of hardcoded local embeddings."
requirements-completed: [IR-01, IR-02, IR-03]
duration: 7 min
completed: 2026-05-10
---

# Phase 20 Plan 03: Vertex embedding continuity Summary

**Embedding defaults now follow D-03: Vertex AI `text-embedding-004` used by default, with explicit local fallback for development and dependency-missing scenarios.**

## Accomplishments
- Updated configuration defaults to Vertex embeddings and added `GOOGLE_CLOUD_PROJECT` support.
- Added `langchain-google-vertexai` dependency and wired provider selection in vector store initialization.
- Refactored history ingestion embedding path to use shared provider selection logic.
- Added targeted tests covering Vertex/default and local/fallback embedding service selection.

## Verification
- `pytest tests/test_phase20_config.py tests/test_vertex_embeddings.py` passed.
- `graphify update .` completed and graph artifacts refreshed.
- `npx --yes fallow --production` executed; existing repository-level health/dead-code issues remain outside this plan scope.

## Deviations from Plan
- No scope deviation. Implementation used a shared helper (`get_embedding_service`) to avoid duplicated provider-selection logic.

## Issues Encountered
- None blocking. Fallow reports pre-existing global issues not introduced by this plan.

## Next Phase Readiness
Phase 20 embedding path ready for downstream orchestration and retrieval features. No blockers from this plan.

---
*Phase: 20-amd-gpu-infrastructure-setup*
*Completed: 2026-05-10*
