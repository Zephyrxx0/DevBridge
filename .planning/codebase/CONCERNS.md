# Codebase Concerns

**Analysis Date:** 2026-05-20

## Tech Debt

**Model reference drift (target vs legacy labels):**
- Status: Resolved. Runtime + tests now aligned to AI Studio names (`gemini-2.5-flash`, `gemma-4-26b-a4b-it`).
- Follow-up: Keep a single source of truth for model IDs to prevent regressions.

**Legacy routing path still present beside cascade graph:**
- Issue: Cascade path is active in `api/agents/graph.py`, but legacy router/worker modules remain and expose incompatible control flow.
- Files: `api/agents/graph.py`, `api/agents/nodes/router.py`, `api/agents/nodes/fast.py`, `api/agents/nodes/big.py`, `api/agents/utils/fallback.py`, `api/agents/orchestrator.py`
- Impact: Mixed routing behavior risk during refactors/tests; stale imports can reintroduce deprecated path by accident.
- Fix approach: Remove or hard-deprecate legacy nodes; keep single graph entry (`cascade`) and delete dead `goto` targets.

## Known Bugs

**Fallback command targets non-existent node in current graph:**
- Symptoms: If `fallback_to_fast_worker()` command path is executed, command points to `fast_worker`, but compiled graph only contains `recall`, `cascade`, `retain`.
- Files: `api/agents/utils/fallback.py`, `api/agents/graph.py`
- Trigger: Any runtime path invoking `fallback_to_fast_worker()` with current graph wiring.
- Workaround: Avoid command-goto fallback in current graph; perform fallback inside `cascade_node`/model adapter and return normal state update.

## Security Considerations

**Model metadata is client-visible and trust boundary is weakly typed:**
- Risk: `model_used` is emitted to clients via SSE from nested event payload scans; unexpected provider payload shape could leak confusing or spoofed metadata labels.
- Files: `api/main.py`, `api/tests/test_phase32_sse.py`, `web/src/app/repo/[id]/page.tsx`
- Current mitigation: Allowlist extraction in `_extract_metadata` limits fields to `fallback`, `model_used`, `cascaded`.
- Recommendations: Enforce enum/regex validation for `model_used` before emit; add contract tests for approved model IDs only.

## Performance Bottlenecks

**Duplicate model invocation path in streaming fallback:**
- Problem: `/chat/stream` consumes `graph.astream_events`; when no chunks, endpoint invokes `graph.ainvoke` again.
- Files: `api/main.py`, `api/routes/chats.py`
- Cause: Streaming provider modes with no incremental chunks trigger second full graph execution.
- Improvement path: Persist final state from first stream pass or use terminal event payload to avoid second invocation.

## Fragile Areas

**Frontend/backend route indirection split across rewrites and direct fetch strings:**
- Files: `web/next.config.ts`, `web/src/app/repo/[id]/page.tsx`, `web/src/app/repo/[id]/files/page.tsx`, `web/src/app/dashboard/memory/page.tsx`, `web/src/components/RepoConfig.tsx`
- Why fragile: Many hardcoded `/api/backend` callsites depend on rewrite behavior and env-specific `BACKEND_URL`; drift breaks subsets of pages.
- Safe modification: Centralize API base path helper in `web/src/lib` and route all fetch calls through it.
- Test coverage: E2E mocks cover selected routes (`web/tests/escalation-ux.spec.ts`, `web/tests/memory-dashboard.spec.ts`) but not full route matrix.

## Scaling Limits

**Schema evolution currently migration-script heavy with no runtime version gate:**
- Current capacity: SQL files present through `sql/migrations/0032_create_hindsight_schema.sql`.
- Limit: App startup (`api/main.py` lifespan) does not verify required migration level before serving endpoints.
- Scaling path: Add startup schema-version check and fail-fast for missing required migrations tied to chat/model metadata contracts.

## Dependencies at Risk

**cascadeflow 1.1.0 compatibility shim locked in production path:**
- Risk: `ValidatorCascadeAgent` exists to patch missing validator hooks in `cascadeflow==1.1.0`.
- Impact: Upgrade or behavior change in cascadeflow can break escalation guarantees or double-run logic.
- Migration plan: Track cascadeflow API upgrades; replace shim when native validator injection supported.
- Files: `api/agents/nodes/cascade.py`, `api/requirements.txt`

## Missing Critical Features

**Migration artifact for model metadata persistence in chat history:**
- Problem: Runtime/UI handle `model_used` + `cascaded`, but `chat_messages` schema migration has no columns for model metadata.
- Blocks: Durable audit/history of actual model routing per assistant turn; postmortem and analytics on escalation quality.
- Files: `sql/migrations/0022_add_chat_sessions_tables.sql`, `api/routes/chats.py`, `web/src/app/repo/[id]/page.tsx`

**Target-model configuration policy not codified:**
- Problem: No single declarative mapping for “fast” and “big” model targets for AI Studio rollout.
- Blocks: Safe migration to `gemini-2.5-flash` + Gemma4 across runtime/tests.
- Files: `api/agents/utils/llm.py`, `api/core/config.py`, `api/tests/test_phase32_sse.py`, `web/tests/escalation-ux.spec.ts`

## Test Coverage Gaps

**Routing compatibility tests focus on metadata, not graph/node integrity:**
- What's not tested: Assertion that all command `goto` targets exist in compiled graph.
- Files: `api/agents/graph.py`, `api/agents/utils/fallback.py`, `api/tests/test_phase32_sse.py`, `tests/test_phase30_routing.py`
- Risk: Dead-path command failures surface only at runtime.
- Priority: High

**Model migration tests not aligned to target IDs:**
- What's not tested: End-to-end assertion with canonical target pair (Gemini-2.5-flash + Gemma4 AI Studio IDs).
- Files: `api/tests/test_phase32_sse.py`, `web/tests/escalation-ux.spec.ts`, `web/src/components/chat/__tests__/ChatStream.test.tsx`
- Risk: Stale fixture names hide rollout regressions.
- Priority: High

---

*Concerns audit: 2026-05-20*
