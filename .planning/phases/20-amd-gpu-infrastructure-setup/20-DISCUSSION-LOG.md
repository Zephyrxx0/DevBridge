# Phase 20: AMD GPU Infrastructure Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 20-amd-gpu-infrastructure-setup
**Areas discussed:** Inference Architecture, Context Cap Enforcement, Cache Storage Strategy

---

## Inference Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Separate vLLM Containers | Two containers with strict --gpu-memory-utilization flags (e.g., 0.60 and 0.20). Ensures models don't crash each other due to VRAM fragmentation. | ✓ |
| Single vLLM Instance | Use vLLM's multi-model serving. Saves base overhead but riskier for differing quantization types (AWQ vs standard). | |

| Option | Description | Selected |
|--------|-------------|----------|
| Direct Endpoint Calling | FastAPI backend explicitly knows the two different ports (e.g., 8000 for Big, 8001 for Fast) and routes at the application layer. Simpler setup, fewer moving parts. | ✓ |
| Reverse Proxy / LB | Use Nginx or Traefik to route `/v1/chat/completions` based on the `model` parameter in the payload. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Vertex AI API | Use Google's hosted `text-embedding-004`. Saves local VRAM entirely for OS overhead and spikes. Avoids managing a third inference container locally. | ✓ |
| Local Container | Run a local embedding server (e.g., Text Embeddings Inference) pinned to a small memory fraction. No external API costs, but tighter VRAM margins. | |

| Option | Description | Selected |
|--------|-------------|----------|
| docker-compose.yml | A single declarative file containing the backend, database, and both vLLM containers. Easy to spin up and tear down. | ✓ |
| Bash Script | A setup script running separate `docker run` commands with explicit ROCm/GPU flags. More control over start order, but harder to maintain. | |

**User's choice:** Picked recommended options for all four questions.
**Notes:** Decided on separate containers, direct endpoint calling, Vertex AI for embeddings, and docker-compose.yml.

---

## Context Cap Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| FastAPI Gateway Layer | Count tokens in FastAPI before sending to vLLM. Reject with 400 Bad Request if exceeded. Fails fast, clear user feedback, protects vLLM from OOM attempts. | |
| vLLM Inference Layer | Pass `--max-model-len 48000` to vLLM and let it reject requests. Simpler, but might return opaque errors to the client. | |

**User's choice:** "basically both , but fastAPI is primary"
**Notes:** User chose to use both but primary enforcement is at the FastAPI layer.

| Option | Description | Selected |
|--------|-------------|----------|
| Hard Rejection (400) | Instantly return an error telling the user to narrow their search. Simple and predictable behavior. | |
| Silent Truncation | Truncate the context (e.g., dropping older history or chunks) to fit within 48K. More robust, but might degrade answer quality silently. | |

**User's choice:** "User gets answer + knows it was trimmed, so that they try with a refined prompt next time"
**Notes:** Decided on Truncation + Warning mechanism.

| Option | Description | Selected |
|--------|-------------|----------|
| Drop older history first | Prioritize retrieved code context over conversational history. Code is usually needed for accurate answers. | ✓ |
| Drop code chunks first | Prioritize conversational continuity over deep codebase context. | |

| Option | Description | Selected |
|--------|-------------|----------|
| tiktoken (proxy) | Use OpenAI's fast tokenizer as a proxy. Very fast, but slightly inaccurate (approx. ±5% difference). | |
| HF Exact Tokenizers | Use the exact HuggingFace tokenizers for Qwen2.5 and Gemma-4. Perfectly accurate, but adds slight overhead and dependencies. | ✓ |

---

## Cache Storage Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Cache Directory | Both models read from the exact same huggingface cache directory. Simpler, but might cause lock contention. | |
| Isolated Directories | Separate subdirectories for Qwen and Gemma (e.g. `/app/repo_cache/qwen`). Prevents lock contention between two vLLM containers. | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave for Phase 25 | Let the cache grow for now. Phase 25 is dedicated to adding APScheduler for cache cleanup jobs. Keeps Phase 20 focused. | ✓ |
| Simple Cron Container | Add a basic cron container in the docker-compose setup to `rm` old files now. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Host User Mapping | Bind mount with the host user's UID/GID. Easier to inspect and manage files from the host environment without `sudo`. | ✓ |
| Root Ownership | Let Docker manage permissions as root. Simpler setup but requires `sudo` for host inspection. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-download Script | Create a script to explicitly download weights using `huggingface-cli` before starting vLLM. Avoids timeout/OOM issues during huge downloads. | ✓ |
| Lazy Download | Let the vLLM containers pull the weights on first startup. Easier setup, but might cause startup failures. | |

**User's choice:** Picked options that avoid lock contention, map host users, use pre-downloads, and leave cleanup for Phase 25.

---

## Claude's Discretion

None

## Deferred Ideas

- Cache cleanup and eviction cron jobs (Deferred to Phase 25)
