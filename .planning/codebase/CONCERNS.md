# Codebase Concerns

**Analysis Date:** 2024-05-18

## Tech Debt

**Legacy Orchestrator:**
- Issue: `api/agents/orchestrator.py` is marked as a "Legacy orchestrator module" in the docstring. It uses a `MockLLM` by default and contains hardcoded logic that has been superseded by the `api/agents/graph.py` implementation.
- Files: `api/agents/orchestrator.py`
- Impact: Maintenance burden and potential confusion for developers. Tests still reference this module, creating a dependency on legacy code.
- Fix approach: Migrate all tests and tools to use the `api.agents.graph` system and remove the legacy module.

**Hardcoded LLM Infrastructure:**
- Issue: LLM model ports, base URLs, and model names are partially hardcoded in the codebase instead of being purely configuration-driven.
- Files: `api/agents/utils/llm.py`, `api/core/config.py`
- Impact: Difficult to deploy in environments where ports 8000/8001 are occupied or where model names differ. Hardcoding `localhost` prevents easy containerization/scaling of the model server.
- Fix approach: Move all model server settings (base URL, ports, specific model names) into `.env` and `api/core/config.py` with no local-only defaults.

**Simplified Intent Classification:**
- Issue: The router uses a very basic string-based classification ("FAST" or "DEEP") which may not be robust enough for complex queries.
- Files: `api/agents/nodes/router.py`
- Impact: Queries might be routed to the wrong worker, leading to either slow responses for simple queries or poor analysis for complex ones.
- Fix approach: Implement a more robust classifier using structured output (Pydantic) or a few-shot prompting strategy.

## Security Considerations

**Header-based User Context:**
- Risk: The API trusts the `X-User-Id` header if an `INTERNAL_AUTH_TOKEN` is present and the client IP is in a trusted list.
- Files: `api/main.py`
- Current mitigation: Basic check of `INTERNAL_AUTH_TOKEN` and `TRUSTED_PROXY_IPS`.
- Recommendations: Implement a more robust JWT-based authentication for user identity or ensure strict network-level isolation (e.g., VPC) if relying on header injection.

**Hardcoded Local API Keys:**
- Risk: Using `api_key="local-dev"` in production-like configurations.
- Files: `api/agents/utils/llm.py`
- Current mitigation: None.
- Recommendations: Ensure all API keys are loaded from environment variables and never have "dev" defaults in production mode.

## Performance Bottlenecks

**Sequential Issue Sync:**
- Problem: The GitHub issue sync process iterates through all repositories and all issues sequentially, performing embeddings one by one.
- Files: `api/main.py` (sync_issues)
- Cause: Lack of batching in embedding generation and sequential processing.
- Improvement path: Implement batch embedding calls and use `asyncio.gather` for repository-level parallelism.

**Blocking Embedding Calls:**
- Problem: Embedding generation is a CPU/network intensive task called synchronously within an async environment.
- Files: `api/db/vector_store.py`
- Cause: `self._vectorstore.embedding_service.embed_query` is synchronous.
- Improvement path: Use a truly async embedding client or move the calls to a dedicated worker pool with `asyncio.to_thread` (already partially done, but should be consistent).

**Large Frontend Component:**
- Problem: The main repository workspace page is a single large component (~800 lines) handling chat, file tree, file viewing, and branch management.
- Files: `web/src/app/repo/[id]/page.tsx`
- Cause: Consolidation of too many responsibilities in one component.
- Improvement path: Decompose into smaller, focused components (e.g., `ChatContainer`, `FileTreeSidebar`, `SourceViewer`).

## Fragile Areas

**Database Normalization Logic:**
- Files: `api/db/session.py`
- Why fragile: Complex regex and string manipulation for connection strings (`_normalize_connection_string`, `_conninfo_to_url`) are prone to edge-case failures.
- Safe modification: Add exhaustive unit tests for various connection string formats (Supabase, local PG, PgBouncer).
- Test coverage: Partially covered in `tests/test_db_session_normalization.py`.

**Vector Store Initialization:**
- Files: `api/db/vector_store.py`
- Why fragile: Uses `loop.create_task` for table creation during initialization, which could allow the app to start accepting requests before the schema is ready.
- Safe modification: Ensure initialization is fully awaited before the API starts accepting traffic.
- Test coverage: Gaps in startup race condition testing.

## Scaling Limits

**Postgres Cache Backend:**
- Current capacity: Limited by DB storage and single-table performance.
- Limit: Large volumes of chat history and cached responses will eventually slow down the `cache_entries` table.
- Scaling path: Implement a TTL-based cleanup job (already exists in `api/jobs/cleanup.py`) and consider Redis for high-throughput caching if DB load becomes a bottleneck.

## Test Coverage Gaps

**Streaming Response Errors:**
- What's not tested: Failure modes of SSE (Server-Sent Events) when the LLM stream is interrupted.
- Files: `api/main.py` (`chat_stream`), `web/src/app/repo/[id]/page.tsx`
- Risk: UI might hang or show incomplete states if the stream breaks.
- Priority: Medium

**Branch Indexing Race Conditions:**
- What's not tested: Rapid switching between branches while indexing is in progress.
- Files: `web/src/app/repo/[id]/page.tsx`
- Risk: File tree might show inconsistent states or data from the wrong branch.
- Priority: High

---

*Concerns audit: 2024-05-18*
