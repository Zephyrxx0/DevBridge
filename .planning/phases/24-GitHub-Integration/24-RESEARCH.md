<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Postgres RPC Function.** To retrieve the `provider_token` from the protected `auth.identities` table in Supabase, implement a PostgreSQL function (RPC).
- **D-02: Dedicated Issues Table.** Create a `repo_github_issues` table in Supabase with columns: `id` (UUID), `repo_id` (UUID), `issue_number` (INT), `title` (TEXT), `body` (TEXT), `embedding` (VECTOR(768)), `updated_at` (TIMESTAMPTZ).
- **D-03: Daily Background Sync.** Issues will be fetched and vectorized daily. Introduce `APScheduler` to the FastAPI backend to manage this.
- **D-04: `map_issue_to_files` Tool.** A specialized tool for the Agent that fetches the embedding for an issue, performs cosine similarity against `code_chunks`, and returns top N files.
- **D-05: Pure pgvector Cosine Distance.** Mapping is performed entirely within the database using `pgvector`.

### the agent's Discretion
- The exact name of the RPC function (e.g., `get_github_token_for_user`).
- The specific number of files (N) returned by the mapping tool (default to 5).
- The implementation details of the `APScheduler` setup within the FastAPI lifecycle.

### Deferred Ideas (OUT OF SCOPE)
- Webhook-driven real-time issue sync.
- Mapping issues to specific code *symbols*.
</user_constraints>

# Phase 24: GitHub Integration - Research

**Researched:** 2026-05-11
**Domain:** External API Integration, Vector Search, Background Scheduling
**Confidence:** HIGH

## Summary

This phase introduces GitHub issue fetching, background synchronization, and a new Agent tool for grounding LLM queries against issue history. It requires modifying the Supabase database schema to include a dedicated issue tracking table with `VECTOR(768)` embeddings (consistent with the existing `text-embedding-004` setup), and exposing an RPC function to read user OAuth tokens securely. `APScheduler` will be introduced to handle recurring daily synchronization. 

**Primary recommendation:** Use `APScheduler` via an `AsyncIOScheduler` hooked into FastAPI's `lifespan` manager, and avoid heavy ORMs for the synchronization layer by utilizing the existing `get_engine` raw SQL patterns.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User OAuth Token Retrieval | Database (Postgres RPC) | API / Backend | Avoids exposing `auth.identities` directly, enforcing security boundaries. |
| GitHub API Integration | API / Backend | — | Uses Python's native `urllib.request` as currently established in `repo.py`. |
| Scheduled Issue Sync | API / Backend (APScheduler) | — | Keeps scheduled sync within the FastAPI server lifecycle. |
| Issue-to-File Vector Search | Database (pgvector) | API / Backend | Avoids memory/LLM context bloat by resolving nearest files via SQL `vector_cosine_ops`. |
| Agent Tooling | API / Backend | — | LangGraph tool exposed to models. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `APScheduler` | 3.10.x | Background jobs | Robust, standard job scheduling mechanism in FastAPI without needing Celery/Redis. |
| `urllib.request` | built-in | GitHub API calls | Reuses existing lightweight pattern seen in `api/routes/repo.py::_github_get_json`. |
| `langchain-postgres` | 0.0.17 | Vector abstractions | Consistent with existing `api.db.vector_store`. |
| `pgvector` | Supabase | Vector similarity | Standard for this project's RAG. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `APScheduler` | `Celery` | `Celery` requires a Redis/RabbitMQ broker which complicates the infrastructure. |
| `urllib.request` | `PyGithub` | `PyGithub` is feature-heavy; standard HTTP calls avoid bloated dependencies for basic sync tasks. |

**Installation:**
```bash
pip install APScheduler==3.10.4
```
*(Add `APScheduler` to `api/requirements.txt`)*

## Architecture Patterns

### System Architecture Diagram
(Simplified data flow)
```
[APScheduler (Daily)] ---> [GitHub API (/issues)] ---> [VertexAI Embedding]
                                                              |
                                                              v
[Agent Tool Request] <--- [pgvector Cosine Search] <--- [repo_github_issues]
```

### Pattern 1: FastAPI Lifespan Scheduler
**What:** Attaching `APScheduler` to FastAPI's `@asynccontextmanager async def lifespan(app: FastAPI)`
**When to use:** For lightweight recurring tasks when Celery isn't present.
**Example:**
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # init db
    scheduler.start()
    scheduler.add_job(sync_issues, 'interval', days=1)
    yield
    scheduler.shutdown()
```

### Pattern 2: Supabase RPC for Auth Identity
**What:** Exposing a `SECURITY DEFINER` function in the `public` schema (or `helpers`) that queries the `auth.identities` system schema.
**When to use:** When the backend (acting under a service role or specific connection string) needs the GitHub `provider_token` but regular clients should not have access.

### Anti-Patterns to Avoid
- **In-memory vector distances:** Do not fetch all issues into Python to calculate cosine similarity; use Postgres `ORDER BY embedding <=> query_embedding`.
- **Global event loop blocking:** Ensure the daily sync runs in non-blocking async wrappers or threads so it doesn't freeze FastAPI streaming requests.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `auth.identities` | Code edit: Create an RPC function to read `provider_token`. |
| Live service config | None — verified | none |
| OS-registered state | None — verified | none |
| Secrets/env vars | `GITHUB_TOKEN` | Update `get_github_token` logic in `api/core/secrets.py` to optionally use the RPC if user is specified, or retain global as fallback. |
| Build artifacts | `api/requirements.txt` | Code edit: Needs `APScheduler`. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `APScheduler` | Background Sync | ✗ | — | Must install via `pip` |
| `pgvector` | DB similarity | ✓ | — | — |
| `text-embedding-004` | Vertex AI embed | ✓ | — | LocalEmbeddings |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase RPC `SECURITY DEFINER` |
| V4 Access Control | yes | Row Level Security (RLS) on new tables |

### Known Threat Patterns for FastAPI / Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege Escalation via RPC | Elevation of Privilege | Ensure the RPC limits queries to the caller's UUID or checks the caller is a service role. |
| GitHub API Rate Limiting | Denial of Service | Handle `429 Too Many Requests` elegantly in the daily sync, backing off when GitHub limits are hit. |

## Common Pitfalls

### Pitfall 1: Scheduler blocking the Main Loop
**What goes wrong:** Fast API becomes unresponsive during the daily sync.
**Why it happens:** The sync performs heavy I/O or CPU work directly on the event loop.
**How to avoid:** Ensure API calls and embedding generations are wrapped in `asyncio.to_thread` or are fully `async`.

### Pitfall 2: Vector Dimension Mismatch
**What goes wrong:** pgvector throws a dimension mismatch error during insert.
**Why it happens:** `text-embedding-004` generates 768-dim vectors, but standard OpenAI uses 1536.
**How to avoid:** Explicitly define the table column as `embedding VECTOR(768)` as specified in D-02.

## Code Examples

### RPC Function Pattern
```sql
CREATE OR REPLACE FUNCTION get_github_token_for_user(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gh_token TEXT;
BEGIN
    SELECT identity_data->>'provider_token' INTO gh_token
    FROM auth.identities
    WHERE user_id = user_uuid AND provider = 'github'
    LIMIT 1;
    
    RETURN gh_token;
END;
$$;
```

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `APScheduler` is the canonical library for this in python.
- Architecture: HIGH - Follows existing codebase patterns in `api/db/vector_store.py`.
- Pitfalls: HIGH - Synchronous blocking is the #1 issue with APScheduler in ASGI apps.

**Research date:** 2026-05-11
**Valid until:** 2026-06-11
