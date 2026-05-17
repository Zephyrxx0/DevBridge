# Phase 27: Model Migration: Replace Qwen with Google AI Studio (Gemini) - Research

**Researched:** 2026-05-18
**Domain:** Model Migration (Local vLLM to Google AI Studio)
**Confidence:** HIGH

## Summary
This phase involves migrating the application's LLM reasoning from local AMD-hosted vLLM instances (Qwen/Gemma) to Google AI Studio (Gemini/Gemma 4). This transition eliminates the need for local GPU infrastructure (MI300X/ROCm) and shifts the reasoning logic to the `google-genai` Python SDK.

**Primary recommendation:** Replace the `ChatOpenAI` based model factory in `api/agents/utils/llm.py` with a native `google-genai` client that handles the specific `thinking_config` requirements for Gemini 2.5 and Gemma 4.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Big Model (Live Chat).** Use `gemini-2.5-flash` with `thinking_budget` of `-1`.
- **D-02: Analysis & Code Model.** Use `gemma-4-26b-a4b-it` with `thinking_level` of `"HIGH"`.
- **D-03: SDK Migration.** Transition backend to direct `google-genai` Python SDK.
- **D-04: Cloud Hosting.** No longer require local MI300X VRAM for inference.
- **D-05: Deep Purge.** Full cleanup of ROCm/AMD layers from Dockerfile/Compose and deletion of weights in `/app/repo_cache`.
- **D-06: Auth Strategy.** `GEMINI_API_KEY` in `.env` and `api/core/config.py`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Model Orchestration | API / Backend | — | Controlled via `google-genai` client in the worker nodes. |
| Intent Classification | API / Backend | — | Router node uses `gemini-2.5-flash` for fast classification. |
| Inference | Cloud (Google) | — | Moves from local GPU to hosted AI Studio. |
| Token Counting | API / Backend | — | Must adapt from `transformers` to SDK-native counting if possible. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-genai` | 2.3.0+ | Unified Gemini API SDK | Official Google SDK supporting "Thinking" configs. |

**Installation:**
```bash
pip install google-genai
```

## Architecture Patterns

### Recommended Project Structure
```
api/
├── agents/
│   ├── utils/
│   │   └── llm.py        # NEW: GenAI Client factory
├── core/
│   └── config.py         # UPDATE: Add GEMINI_API_KEY
├── utils/
│   └── tokenizer.py      # UPDATE/DEPRECATE: Remove local HF tokenizer deps
```

### Pattern 1: Multi-Model Client Factory
The `get_model` function should return a client wrapper or direct SDK client configured with the correct thinking parameters based on the model ID.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `/app/repo_cache/qwen`, `/app/repo_cache/gemma` | Delete weight directories (Deep Purge). |
| Live service config | `vllm-deep`, `vllm-fast` services | Remove from `docker-compose.yml`. |
| Secrets/env vars | `GEMINI_API_KEY` | Add to `.env` and `api/core/config.py`. |
| Build artifacts | ROCm vLLM Docker images | Purge from local registry/cache. |

## Common Pitfalls

### Pitfall 1: API Rate Limits
**What goes wrong:** Moving from local (unlimited) to cloud (limited) results in 429 errors.
**Prevention:** Implement retry logic via `tenacity` (already in workspace) and monitor quota.

### Pitfall 2: Thinking Token Costs
**What goes wrong:** `thinking_budget=-1` can lead to high token usage on complex queries.
**Prevention:** Monitor `usage_metadata.thoughts_token_count` and log reasoning depth.

## Code Examples

### Google GenAI Client with Thinking Config
```python
# Source: [Google GenAI Python SDK Documentation]
from google import genai
from google.genai import types

def get_gemini_client(api_key: str):
    return genai.Client(api_key=api_key)

async def generate_thoughtful_content(client, model_id: str, prompt: str):
    # D-01: Gemini 2.5 Flash
    if "gemini-2.5" in model_id:
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=-1)
        )
    # D-02: Gemma 4
    else:
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="HIGH")
        )
    
    return await client.models.generate_content(
        model=model_id,
        contents=prompt,
        config=config
    )
```

## Open Questions (RESOLVED)

1. **Tokenization Strategy:** Native `count_tokens` from SDK will be used instead of local `transformers`.
2. **AMD Cleanup:** All ROCm-related layers will be stripped from the `Dockerfile`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly based on `package.json` and existing Python imports.
- Architecture: HIGH - Fits neatly into existing APScheduler + Next.js App Router patterns.
- Pitfalls: HIGH - Path traversal and authorization bypasses are the canonical risks here.

**Research date:** 2026-05-18
**Valid until:** 2026-06-16
