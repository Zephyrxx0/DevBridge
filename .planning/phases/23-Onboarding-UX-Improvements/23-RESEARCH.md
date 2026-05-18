# Phase 23 Research: Onboarding UX Improvements

## Overview
Phase 23 focuses on creating an AI-driven onboarding guide for repositories. This involves orchestrating the Big Model (`Qwen2.5-72B`) to analyze the codebase and generate a structured JSON plan, delivered via SSE for real-time progress. High-fidelity UI components from @pierre and cult-ui will be used for visualization.

## Technical Findings

### 1. SSE Status Streaming & User Intent
- **Existing Pattern**: `api/main.py` uses `StreamingResponse` with an `async generator`.
- **Adaptation**: The `GET /repo/{repo_id}/start-here` endpoint will accept query parameters (e.g., `?focus=backend`) captured from the `Choice Poll`.
- **Constraint**: The `event_generator` must incorporate this "focus" into the agent's system prompt to tailor the plan.

### 2. LLM JSON Validation & Retries
- **Constraint**: `Qwen2.5-72B` may hallucinate JSON.
- **Strategy**: Use `OnboardingPlan.model_validate_json` and retry up to 2 times with error feedback.

### 3. High-Fidelity UI Components
- **Diffs Rendering**: `@pierre/diffs` will be used to show code changes in the setup guide. Requires `pnpm i @pierre/diffs`.
- **File Structure**: `@pierre/trees` will replace the simple file list in the onboarding guide for a high-fidelity visualization. Requires `pnpm i @pierre/trees`.
- **Onboarding Stepper**: `cult-ui` Onboarding component for the multi-step flow.
- **Poll & Disclosure**: `cult-ui` Choice Poll for qualification and Intro Disclosure for expandable architecture sections.

### 4. Database Persistence
- **Table**: `repo_onboarding_plans` (repo_id PK, plan JSONB, updated_at).
- **Migration**: `0028_add_onboarding_plans_table.sql`.

## Reusable Assets
- `api/routes/repo.py`: GitHub file fetching helpers.
- `api/agents/utils/llm.py`: Big Model accessor.

## Risks
- **Library Compatibility**: Ensure `@pierre` components work smoothly with Tailwind v4 and React 19.
- **Token Usage**: Passing focus context and detailed file structures might increase prompt size.
