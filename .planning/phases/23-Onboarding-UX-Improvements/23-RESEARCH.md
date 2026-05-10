# Phase 23 Research: Onboarding UX Improvements

## Overview
Phase 23 focuses on creating an AI-driven onboarding guide for repositories. This involves orchestrating the Big Model (`Qwen2.5-72B`) to analyze the codebase and generate a structured JSON plan, delivered via SSE for real-time progress.

## Technical Findings

### 1. SSE Status Streaming
- **Existing Pattern**: `api/main.py` uses `StreamingResponse` with an `async generator` for chat streaming.
- **Adaptation**: For Phase 23, the generator should yield status updates (e.g., `{"type": "status", "content": "Analyzing entry points..."}`) while the LLM is working.
- **Constraint**: The `event_generator` must handle the state machine: Status -> Generation -> Validation -> Final Plan or Error.

### 2. LLM JSON Validation & Retries
- **Constraint**: `Qwen2.5-72B` (via `vLLM` or similar local serving) may sometimes hallucinate JSON structure if the prompt is complex.
- **Strategy**:
  - Use a strict Pydantic model (`OnboardingPlan`) for validation.
  - Implement a `try-except` block around the JSON parsing.
  - On failure, include the error message in the next prompt and retry (up to 2 times).
  - Yield status updates for each retry attempt to keep the user informed.

### 3. Onboarding Knowledge Extraction
- **Discovery Tools**:
  - `code_search`: Search for "main", "init", "entrypoint", "App", "Server" to find starting points.
  - `get_repository_file`: Fetch `README.md`, `package.json`, `requirements.txt`, `Dockerfile` to extract setup commands.
  - `trace_call_chain`: Trace from identified entry points to understand core logic flow.
- **Integration**: A specialized `OnboardingAgent` (or a specific LangGraph node) should manage these tool calls before synthesis.

### 4. Database Persistence
- **Table**: `repo_onboarding_plans` (repo_id PK, plan JSONB, updated_at).
- **Migration**: Create `sql/migrations/0028_add_onboarding_plans_table.sql`.
- **Pattern**: Upsert on generation success.

## Reusable Assets
- `api/routes/repo.py`: `_github_get_json` and `_fetch_github_file` for fetching non-indexed files like `README.md`.
- `api/agents/utils/llm.py`: `get_model(is_fast=False)` for Big Model access.
- `api/db/models.py`: Dataclasses for consistent data structures.

## Proposed Schema
```python
class OnboardingPlan(BaseModel):
    repo_name: str
    summary: str
    architecture_overview: str
    setup_commands: list[str]
    key_files: list[KeyFile]
    guided_steps: list[OnboardingStep]
```

## Risks
- **Big Model Latency**: Generation might take 30-60s. SSE status messages are critical to prevent client timeout.
- **VRAM Contention**: High concurrent requests for onboarding plans could spike VRAM usage on the MI300X.
