# Phase 23 Context: Onboarding UX Improvements

## Goals
Implement an AI-powered onboarding plan generator for repositories. The feature will provide a structured "Getting Started" guide to help developers understand the codebase quickly.

## Implementation Decisions

### 1. Endpoint & UX
- **Endpoint**: `GET /repo/{repo_id}/start-here`
- **Protocol**: Server-Sent Events (SSE)
- **Flow**:
  1. Frontend initiates SSE request.
  2. Backend sends status updates (e.g., `type: "status"`, `content: "Analyzing architecture..."`).
  3. Backend invokes the Big Model (`Qwen2.5-72B`) to generate the plan.
  4. Backend validates the output against the Pydantic schema.
  5. If validation fails, backend retries (max 2 retries).
  6. Final plan is delivered via `type: "plan"` event.
  7. Final `type: "done"` event closes the stream.

### 2. Plan Schema (Pydantic)
```python
from pydantic import BaseModel, Field

class OnboardingStep(BaseModel):
    title: str = Field(description="Short title of the onboarding step")
    description: str = Field(description="Detailed explanation of what to do or look at")
    files: list[str] = Field(description="Relevant file paths for this step")
    complexity: str = Field(description="Low, Medium, or High")

class KeyFile(BaseModel):
    path: str
    description: str

class OnboardingPlan(BaseModel):
    repo_name: str
    summary: str = Field(description="High-level summary of the repository's purpose")
    architecture_overview: str = Field(description="Textual description of the system architecture")
    setup_commands: list[str] = Field(description="Commands for install, build, and test")
    key_files: list[KeyFile] = Field(description="Top 5-10 most important files")
    guided_steps: list[OnboardingStep] = Field(description="Sequential steps to understand the codebase")
```

### 3. Database Schema
A new table `repo_onboarding_plans` will be created to cache the results.
```sql
CREATE TABLE repo_onboarding_plans (
    repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    plan JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Agent Configuration
- **Model**: Big Model (`Qwen2.5-72B-Instruct-AWQ`).
- **Tools**:
  - `code_search`: To find entry points and setup commands.
  - `trace_call_chain`: To understand architecture.
  - `get_repo_graph`: (If available from Phase 22) To see module interactions.
- **Prompting**: Use a system prompt that enforces strict JSON output format.

## Gray Areas Resolved
- **SSE vs Polling**: SSE preferred for real-time feedback during long-running LLM generation.
- **Validation**: Post-generation validation with retries.
- **Scope**: Includes setup guide and architecture overview as requested.

## Next Steps
1. Create migration for `repo_onboarding_plans`.
2. Implement the specialized Onboarding Agent/Prompt.
3. Implement the `/repo/{repo_id}/start-here` SSE endpoint.
4. Add frontend components to display the generated plan.
