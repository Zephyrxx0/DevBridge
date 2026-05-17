# External Integrations

**Analysis Date:** 2025-05-15

## APIs & External Services

**LLM & AI Services:**
- Google Vertex AI - Used for text embeddings (`text-embedding-004`) and potentially report summarization (`gemma-4-9b-it`).
  - SDK/Client: `langchain-google-vertexai`
  - Auth: `GOOGLE_CLOUD_PROJECT` (ADC expected)
- OpenAI API (Compatible) - Agent routing expects local or compatible LLM servers at `localhost:8000/8001`.
  - SDK/Client: `langchain-openai` (optional/fallback)
  - Auth: `local-dev` (api_key)

**Source Control:**
- GitHub API - Used for fetching PR details, issue synchronization, and OAuth token resolution.
  - SDK/Client: Manual `urllib` requests in `api/main.py` and `api/agents/orchestrator.py`.
  - Auth: `GITHUB_WEBHOOK_SECRET`, `GITHUB_TOKEN`, and per-user tokens resolved via DB RPC `get_github_token_for_user`.

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary relational and vector storage.
  - Connection: `SUPABASE_CONNECTION_STRING`
  - Client: `SQLAlchemy`, `asyncpg`, `psycopg`
  - Extensions: `pgvector` for similarity search.

**File Storage:**
- Google Cloud Storage (GCS) - Used for storing reports or other large assets.
  - Service: GCP Bucket
  - Config: `GCS_BUCKET_NAME`

**Caching:**
- In-Database Cache - Custom PostgreSQL-backed cache using `FastAPICache`.
  - Implementation: `api/db/cache.py`

## Authentication & Identity

**Auth Provider:**
- Custom / Proxy-based - Relies on `X-User-Id` and `X-Internal-Auth` headers from a trusted proxy.
  - Implementation: `inject_user_context` middleware in `api/main.py`.
- GitHub OAuth - User-scoped tokens stored in Supabase and retrieved via RPC.

## Monitoring & Observability

**Error Tracking:**
- Python Logging - Standard logging configured in `api/main.py` and modules.

**Logs:**
- Standard Output/Error - Captured by container runtime (e.g., Cloud Run).

## CI/CD & Deployment

**Hosting:**
- Google Cloud Run - Targeted by `Procfile` and `Dockerfile`.
- Vercel - Configured via `web/vercel.json` for the frontend.

**CI Pipeline:**
- GitHub Actions - (Implicit based on `.github` directory mentioned in file list).

## Environment Configuration

**Required env vars:**
- `SUPABASE_CONNECTION_STRING` - Database access.
- `GOOGLE_CLOUD_PROJECT` - GCP resource access.
- `GITHUB_WEBHOOK_SECRET` - GitHub webhook validation.
- `INTERNAL_AUTH_TOKEN` - Secure internal communication.
- `EMBEDDING_MODEL` - Defaults to `text-embedding-004`.

**Secrets location:**
- Managed via Environment Variables or Google Secret Manager (facade in `api/core/secrets.py`).

## Webhooks & Callbacks

**Incoming:**
- `/webhooks/github` - Handles GitHub webhook events (PRs, issues).

**Outgoing:**
- None detected (primarily reactive to incoming requests/webhooks).

---

*Integration audit: 2025-05-15*
