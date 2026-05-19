# Domain Pitfalls

**Domain:** DevBridge AMD Edition (Cascadeflow & Hindsight)
**Researched:** 2026-05-20

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Tool Schema Inconsistency Across Cascade
**What goes wrong:** Gemma (9B) and Qwen (72B) interpret function calling schemas differently. If Cascadeflow escalates mid-tool-call, state gets corrupted.
**Why it happens:** Different models have different tool-following capabilities.
**Consequences:** LangGraph tool execution crashes with `ValidationError`.
**Prevention:** Let the Fast model draft the *entire* response. If it fails, restart the reasoning loop with the Big model, rather than transferring half-finished tool calls.
**Detection:** Frequent validation errors in `api/agents/graph.py` logs.

### Pitfall 2: Context Window Overflow (48K Limit)
**What goes wrong:** Hindsight's `recall()` injects too many "World Facts" and "Experiences", leaving no room for the pgvector code chunks.
**Why it happens:** Hindsight memory grows over time.
**Consequences:** MI300X vLLM backend throws OOM or truncates the prompt.
**Prevention:** Implement strict token counting on Hindsight payloads. Prioritize Hindsight "Mental Models" over raw "Experiences".
**Detection:** Responses cut off mid-sentence or 400 Bad Request from vLLM.

## Moderate Pitfalls

### Pitfall 1: Double Indexing
**What goes wrong:** RAG chunks are ingested into both pgvector and Hindsight.
**Prevention:** Distinct pipelines: `api/ingestion/` goes to pgvector. `api/agents/graph.py` turn history goes to Hindsight.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Cascadeflow Setup** | Validation latency eats up the speed gains of the Fast model. | Use a lightweight validation prompt, or heuristics (e.g. string length, tool success) instead of LLM-as-a-judge for the draft. |
| **Hindsight Integration** | `retain()` blocking the HTTP response. | Run `retain()` in `asyncio.create_task()` or via `APScheduler` so the user gets their answer immediately. |

## Sources

- LLM Orchestration best practices
- VRAM management constraints from PROJECT.md