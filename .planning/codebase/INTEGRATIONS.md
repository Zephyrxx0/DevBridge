# External Integrations

**Analysis Date:** 2026-04-28

## APIs & External Services

**AI / LLM:**
- Vertex AI (Google Cloud) - Used for embeddings and chat generation
  - SDK/Client: `langchain_google_vertexai`
  - Auth: Google Cloud default credentials (`GOOGLE_CLOUD_PROJECT` in `api/core/config.py`)

**Source Control:**
- Git Repositories / GitHub - Pull request review and annotations
  - Handled via incoming webhooks in `api/routes/webhooks.py` and `api.agents.pr_reviewer`

## Data Storage

**Databases:**
- PostgreSQL (Supabase)
  - Connection: `supabase_connection_string` via `.env`
  - Client: `sqlalchemy` (API), `@supabase/ssr` (Web)
  - Vector Store: Used for storing code chunks (via `api/db/vector_store.py`)

**File Storage:**
- Google Cloud Storage (GCS)
  - SDK: `google.cloud.storage` (found in `api/ingest/trigger.py`)

**Caching:**
- PostgreSQL Cache Backend
  - Implementation: `fastapi-cache` with `PostgresCacheBackend` (`api/main.py`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: Next.js middleware and server/browser clients (`web/utils/supabase/`)
- Custom Internal Auth:
  - Implementation: API middleware checking `X-Internal-Auth` token and proxy IP whitelist (`api/main.py`)

## Monitoring & Observability

**Error Tracking:**
- Native logging
  - Implementation: Python `logging` module in API

**Logs:**
- Console logging configured in FastApi endpoints

## CI/CD & Deployment

**Hosting:**
- Google Cloud Run for API and Ingestion Jobs (configured in `infra/cloudrun/`)

**Messaging / Async:**
- Google Cloud Pub/Sub
  - Configured via Terraform in `infra/pubsub/`

## Environment Configuration

**Required env vars:**
- `supabase_connection_string`
- `INTERNAL_AUTH_TOKEN`
- `GOOGLE_CLOUD_PROJECT`
- `CORS_ALLOW_ORIGINS`

**Secrets location:**
- `.env` file (local)
- API relies on `api.core.config.settings` to access variables

## Webhooks & Callbacks

**Incoming:**
- PR / Repository Webhooks
  - Endpoints configured in `api/routes/webhooks.py`

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-28*