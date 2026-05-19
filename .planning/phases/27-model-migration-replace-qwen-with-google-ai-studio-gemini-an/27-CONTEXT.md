# Phase 27: Model Migration: Replace Qwen with Google AI Studio (Gemini) and Clean Up Local Dependencies - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase transitions the application's reasoning engines from local Qwen models (MI300X) to cloud-hosted models via Google AI Studio. It involves replacing the "Big Model" and "Fast Model" logic, cleaning up the ROCm/AMD infrastructure dependencies, and integrating the new `google-genai` Python SDK.
</domain>

<decisions>
## Implementation Decisions

### Model Selection & Orchestration
- **D-01: Big Model (Live Chat).** Use `gemini-2.5-flash` (native audio preview 12-2025 version) as the primary reasoning engine for chat. It will use a `thinking_budget` of `-1`.
- **D-02: Analysis & Code Model.** Use `gemma-4-26b-a4b-it` for background code analysis and report generation. It will use a `thinking_level` of `"HIGH"`.
- **D-03: SDK Migration.** Transition the backend from standard `langchain` integrations (where applicable) to the new `google-genai` Python SDK for direct control over thinking configurations and streaming.

### Infrastructure & Cleanup
- **D-04: Cloud Hosting.** Both the Big and Fast paths will move to Google AI Studio. The application will no longer require local MI300X VRAM for inference.
- **D-05: Deep Purge.** Perform a full cleanup of local inference dependencies. This includes stripping ROCm/AMD-specific layers from the `Dockerfile` and `docker-compose.yml`, removing local model loading logic, and deleting cached weights from `/app/repo_cache`.
- **D-06: Auth Strategy.** The `GEMINI_API_KEY` will be managed via a standard `.env` file and integrated into the `api/core/config.py` Pydantic settings.

### Claude's Discretion
- The specific refactoring of the `api/agents/nodes/router.py` to adapt to the new model names and capabilities.
- The exact order of Docker layer removal to ensure build stability.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` — Phase 27 goals and success criteria.
- `.planning/REQUIREMENTS.md` — MR-01, MR-02 (Refactored for cloud hosting).

### Technical Context
- `api/agents/graph.py` — Current orchestrator structure to be updated.
- `api/core/config.py` — Location for new `GEMINI_API_KEY` setting.
- `Dockerfile` & `docker-compose.yml` — Targets for infra cleanup.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/agents/nodes/`: Existing intent classification and worker patterns will be reused but updated for the new models.
- `api/core/config.py`: Pattern for loading environment variables into Pydantic settings.

### Integration Points
- `api/agents/utils/llm.py`: Likely location for the new `genai.Client` initialization and model factory.
</code_context>

<specifics>
## Specific Ideas

### Python SDK Integration Pattern
The user provided the following pattern for the new `google-genai` SDK:
```python
import os
from google import genai
from google.genai import types

def generate():
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    # For Gemini 2.5 Flash
    config = types.GenerateContentConfig(thinking_config=types.ThinkingConfig(thinking_budget=-1))
    # For Gemma 4
    # config = types.GenerateContentConfig(thinking_config=types.ThinkingConfig(thinking_level="HIGH"))
```
</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.
</deferred>

---

*Phase: 27-model-migration-replace-qwen-with-google-ai-studio-gemini-an*
*Context gathered: 2026-05-18*
