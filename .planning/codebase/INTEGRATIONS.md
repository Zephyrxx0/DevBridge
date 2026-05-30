# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**AI Inference:**
- Google AI Studio (Gemini API) - primary LLM inference for fast/big routing
  - SDK/Client: `google-genai` via `genai.Client` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`
  - Auth: `GEMINI_API_KEY` from `api/core/config.py`

**Source Control Data:**
- GitHub REST API - PR/issue/commit ingestion + webhook trigger
  - SDK/Client: stdlib `urllib.request` wrappers in `api/main.py` and `api/ingestion/history.py`
  - Auth: `GITHUB_TOKEN`/`GITHUB_API_TOKEN` (ingestion), user-scoped token RPC via `api/core/secrets.py`, webhook secret `GITHUB_WEBHOOK_SECRET` in `api/routes/webhooks.py`

**Memory/Agent Platform:**
- Hindsight integrations - memory reflection/retention/recall support
  - SDK/Client: `hindsight-all-slim`, `hindsight-langgraph` (`api/db/hindsight.py`, `api/agents/graph.py`)
  - Auth: reuses DB + Gemini key (`api/db/hindsight.py` sets `HINDSIGHT_API_DATABASE_URL` and `HINDSIGHT_API_LLM_API_KEY` from runtime settings)

## Data Storage

**Databases:**
- Supabase Postgres (primary relational store)
  - Connection: `SUPABASE_CONNECTION_STRING` (`api/core/config.py`, `api/db/session.py`)
  - Client: SQLAlchemy async engine + raw SQL text (`api/db/session.py`, `api/routes/*.py`)

**File Storage:**
- Local filesystem volumes in container
  - `/app/repo_cache` and `/app/reports` in `docker-compose.yml`
  - Optional cloud bucket reference (`GCS_BUCKET_NAME`) exists in `api/core/config.py` but active storage wiring is not detected in current read set

**Caching:**
- FastAPI Cache with Postgres backend abstraction (`api/db/cache.py`, init in `api/main.py`)
- Redis package support exists through dependency `fastapi-cache2[redis]` in `api/requirements.txt`, but active runtime backend wiring in current startup path points to Postgres cache backend

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: SSR/browser clients in `web/src/utils/supabase/client.ts`, `web/src/utils/supabase/server.ts`, session refresh proxy in `web/src/utils/supabase/proxy.ts` + matcher in `web/src/proxy.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog client initialization found in scanned runtime files)

**Logs:**
- Python logging in API (`api/main.py`, `api/routes/webhooks.py`, `api/ingestion/history.py`)
- Test/e2e diagnostics through Jest/Playwright (`web/package.json`, `web/playwright.config.ts`)

## CI/CD & Deployment

**Hosting:**
- API containerized deployment target (Cloud Run-style port contract documented in `Dockerfile` and `api/Dockerfile`)
- Web deployment target not explicitly codified in repo configs; local scripts via `web/package.json`

**CI Pipeline:**
- Not detected (`.github/workflows/*` absent)

## Environment Configuration

**Required env vars:**
- API: `SUPABASE_CONNECTION_STRING`, `GEMINI_API_KEY`, `ENV` (`api/core/config.py`)
- GitHub integrations: `GITHUB_WEBHOOK_SECRET`, `GITHUB_TOKEN` or `GITHUB_API_TOKEN`, `GITHUB_SYNC_USER_ID` (`api/routes/webhooks.py`, `api/main.py`, `api/ingestion/history.py`)
- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, provider toggles like `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` (`web/src/utils/supabase/*.ts`, `web/src/app/signin/page.tsx`)

**Secrets location:**
- Environment variables loaded by pydantic settings (`api/core/config.py`) and Next runtime (`web/src/utils/supabase/*.ts`)
- Secret files exist (`.env`, `.env.local`, etc.) but contents must remain out of docs and versioned outputs

## Webhooks & Callbacks

**Incoming:**
- `POST /webhooks/github` for GitHub PR events (`api/routes/webhooks.py`)
- OAuth callback route `web/src/app/auth/callback/route.ts`

**Outgoing:**
- GitHub API polling/calls to:
  - `https://api.github.com/repos/{repo}/issues...` in `api/main.py`
  - `https://api.github.com/repos/{repo}/pulls/{pr_number}` and commits endpoints in `api/ingestion/history.py`
- Google model API calls via `client.aio.models.generate_content(...)` and `client.models.count_tokens(...)` in `api/agents/utils/llm.py` and `api/utils/tokenizer.py`

## Model Integration Status

**Active inventory:**
- Remote `gemini-2.5-flash` + `gemma-4-26b-a4b-it` via `GEMINI_API_KEY`.

**Migration complete:**
- Runtime defaults use `model_type="gemini"` (`api/routes/chats.py`, `api/utils/tokenizer.py`).
- Test fixtures updated to AI Studio model names.
- Specs refreshed to remove Qwen/vLLM local routing.

---

*Integration audit: 2026-05-20*
