# Phase 23 Context: Onboarding UX Improvements

## Goals
Implement an AI-powered onboarding plan generator for repositories. The feature will provide a structured "Getting Started" guide tailored to the developer's focus (captured via a Choice Poll).

## Implementation Decisions

### 1. Endpoint & UX
- **Endpoint**: `GET /repo/{repo_id}/start-here`
- **Protocol**: Server-Sent Events (SSE)
- **Flow**:
  1. Frontend presents a `Choice Poll` (Role: Frontend, Backend, etc.).
  2. Frontend initiates SSE request with `?focus={role}`.
  3. Backend sends status updates (e.g., `type: "status"`, `content: "Analyzing [role] entry points..."`).
  4. Backend invokes the Big Model (`Qwen2.5-72B`) to generate a tailored plan.
  5. Backend validates output via Pydantic; retries up to 2 times on failure.
  6. Final plan delivered via `type: "plan"` event.
  7. Frontend displays the plan using `cult-ui` Onboarding stepper and `@pierre` high-fidelity components.

### 2. Plan Schema (Pydantic)
- Standard `OnboardingPlan` (Summary, Architecture, Setup, Key Files, Guided Steps).
- Tailored content based on the `focus` parameter.

### 3. Database Schema
- `repo_onboarding_plans` (repo_id PK, plan JSONB, updated_at).

### 4. UI Library Integration
- `@pierre/diffs`: Code change visualization.
- `@pierre/trees`: File structure visualization.
- `cult-ui`: Onboarding, ChoicePoll, IntroDisclosure components.

## Gray Areas Resolved
- **User Intent**: Captured via Choice Poll before generation.
- **Library Selection**: @pierre and cult-ui confirmed for high-fidelity UX.
- **Validation**: Post-generation validation remains the strategy.
