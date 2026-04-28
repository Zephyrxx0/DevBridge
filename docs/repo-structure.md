# Repository Structure

## Top-level map

- `api/` backend service, agents, ingestion, DB layer.
- `web/` Next.js frontend app.
- `sql/` migrations + vector/hybrid search SQL.
- `tests/` integration and unit tests.
- `infra/` Terraform-style infra modules (`gcs/`, `pubsub/`).
- `scripts/` hooks, security scan, e2e helpers.
- `graphify-out/` generated knowledge graph and report.

## Backend tree (important)

- `api/main.py` FastAPI app, lifespan, CORS, routes, chat endpoints.
- `api/routes/annotations.py` annotation CRUD + ranking + upvote.
- `api/routes/webhooks.py` GitHub webhook HMAC verify + PR analysis enqueue.
- `api/routes/pr.py` manual PR analyze + repo review-depth config.
- `api/agents/` orchestrator, debugger, PR reviewer agents.
- `api/db/` models, session management, cache backend.
- `api/ingest/` worker/trigger handling.
- `api/ingestion/` chunking, pipeline, embedding job abstractions.

## Frontend tree (important)

- `web/src/app/page.tsx` landing.
- `web/src/app/dashboard/page.tsx` dashboard surface.
- `web/src/app/repo/[id]/page.tsx` repo workspace.
- `web/src/app/signin/page.tsx` auth entry.
- `web/src/components/` feature UI components.
- `web/src/components/ui/` shared primitives.
- `web/src/utils/supabase/*` client/server/proxy utilities.

## SQL assets

- `sql/setup_vector_store.sql` vector extension and core setup.
- `sql/hybrid_search.sql` hybrid search SQL function path.
- `sql/migrations/0014-0017` annotations/repo config/cache/ingestion job schema.
