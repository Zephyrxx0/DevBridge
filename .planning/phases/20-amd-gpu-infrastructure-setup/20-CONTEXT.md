# Phase 20: AMD GPU Infrastructure Setup - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the core infrastructure for serving the multi-agent AI system on a single AMD MI300X GPU. It covers VRAM partitioning (60% Big Model, 20% Fast Model, 20% OS/overhead), Docker configuration for local caching, and enforcement of a strict 48,000 token context limit to prevent KV cache out-of-memory errors.

</domain>

<decisions>
## Implementation Decisions

### Inference Architecture
- **D-01:** **Separate vLLM Containers.** Run two independent vLLM containers with strict `--gpu-memory-utilization` flags (e.g., 0.60 and 0.20) rather than a single multi-model instance, ensuring strict VRAM isolation and avoiding fragmentation between models.
- **D-02:** **Direct Endpoint Calling.** The FastAPI API Gateway will route requests via application logic by explicitly targeting the separate ports (e.g., 8000 and 8001) of the two containers.
- **D-03:** **Vertex AI API for Embeddings.** Use Google's hosted `text-embedding-004` for embedding tasks instead of a local container. This preserves the remaining 20% VRAM pool entirely for OS overhead and KV cache spikes.
- **D-04:** **Docker Orchestration.** Use a single `docker-compose.yml` to spin up the FastAPI backend, the database, and both vLLM containers together.

### Context Cap Enforcement
- **D-05:** **Enforcement Layer.** Enforce the 48K token cap at both layers, but the FastAPI Gateway acts as the primary layer.
- **D-06:** **Rejection Behavior.** Instead of a hard 400 rejection, perform **Truncation + Warning**. The user gets the answer but is warned that context was trimmed, allowing them to refine their prompt.
- **D-07:** **Truncation Priority.** Drop older conversational history first, keeping codebase chunks. Retrieved code context is prioritized for accuracy.
- **D-08:** **Token Estimation.** Use the **Exact HuggingFace Tokenizers** for Qwen2.5 and Gemma-2 at the FastAPI layer, ensuring perfectly accurate token counting despite slight overhead.

### Cache Storage Strategy
- **D-09:** **Cache Structure.** Use **Isolated Directories** (e.g., `/app/repo_cache/qwen` and `/app/repo_cache/gemma`) for the models to prevent lock contention between the two vLLM containers.
- **D-10:** **Eviction Policy.** Let the cache grow for now. Do not add cron scripts; **Leave for Phase 25**, which is dedicated to adding APScheduler for cache cleanup.
- **D-11:** **Permissions.** Use **Host User Mapping**. Bind mount the `/app/repo_cache` Docker volume with the host user's UID/GID for easier inspection from the host without `sudo`.
- **D-12:** **Weights Download.** Use a **Pre-download Script** via `huggingface-cli` to explicitly download the large model weights before starting vLLM, avoiding timeout and OOM issues during startup.

### Claude's Discretion
None - explicit choices were made for all gray areas.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Infrastructure Constraints
- `.planning/ROADMAP.md` — Defines Phase 20 scope, requirements IR-01, IR-02, and IR-03.
- `.planning/REQUIREMENTS.md` — Specifies the 60/20/20 partition constraints, the 48K context limit, and exact model names (`Qwen2.5-72B-Instruct-AWQ` and `Gemma-2-9B-it`).
- `.planning/PROJECT.md` — Architecture context and budget constraints for the single MI300X.

### Existing Configurations
- `.planning/codebase/ARCHITECTURE.md` — Overall architectural patterns (Next.js + FastAPI + Postgres).
- `.planning/codebase/STACK.md` — Core technology stack dependencies.
- `api/core/config.py` — Current FastAPI configuration where new token limits and model routing ports must be added.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/core/config.py`: The settings model provides a clean integration point for adding `MAX_CONTEXT_TOKENS=48000`, `BIG_MODEL_PORT=8000`, and `FAST_MODEL_PORT=8001`.
- `api/db/vector_store.py`: Embedding logic already uses `text-embedding-004` (Phase 05 decision) via Vertex AI, aligning with decision D-03.

### Established Patterns
- Containerized deployments via Docker are standard in this project (as seen in `Dockerfile` and `api/Dockerfile`).
- Token extraction and environment variables are already strictly mapped.

### Integration Points
- FastAPI routing functions (like `api/routes/chats.py` or the `Orchestrator`) will need to query the HuggingFace tokenizers, count tokens, truncate history if necessary, and dispatch to the correct model port.

</code_context>

<specifics>
## Specific Ideas

- The system must explicitly append a warning flag or message to the response when context truncation occurs.
- The pre-download script for model weights should be easily executable before running `docker-compose up`.

</specifics>

<deferred>
## Deferred Ideas

- Cache eviction and automated disk cleanup (Deferred to Phase 25: Task Scheduling).

</deferred>

---

*Phase: 20-amd-gpu-infrastructure-setup*
*Context gathered: 2026-05-09*