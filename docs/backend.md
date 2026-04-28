# Backend

## Runtime stack

- FastAPI app (`api/main.py`).
- Async DB lifecycle via lifespan (`init_db_pool`, `close_db_pool`).
- Postgres-backed API caching via `fastapi-cache` + `PostgresCacheBackend`.

## App middleware and context

- CORS allowlist from `CORS_ALLOW_ORIGINS` env.
- Internal identity middleware checks:
  - `X-Internal-Auth` token equality.
  - request source in `TRUSTED_PROXY_IPS`.
  - if valid, injects `request.state.user_id` from `X-User-Id`.

## Chat endpoints

- `POST /chat`
  - request model: `message`, `thread_id`, optional `repo_id`.
  - cached namespace `chat`.
  - returns full response payload.

- `POST /chat/stream`
  - SSE event stream.
  - emits metadata, chunk events, done event.
  - fallback to full `orchestrator.chat()` if no incremental chunks.
  - cached namespace `chat_stream`.

## Annotations route (`api/routes/annotations.py`)

- Validates tags from fixed taxonomy: `warning`, `architecture`, `gotcha`, `todo`, `context`, `deprecated`.
- Validates line ranges (`start_line`/`end_line`) for correctness.
- Ownership enforcement for update/delete.
- Ranking in list endpoint prioritizes file match, tag relevance, then upvotes.

## Webhooks route (`api/routes/webhooks.py`)

- HMAC validation using `x-hub-signature-256` + `GITHUB_WEBHOOK_SECRET`.
- Accepts GitHub `pull_request` events.
- Processes `opened` and `synchronize` actions.
- Runs PR analysis in background task.

## PR route (`api/routes/pr.py`)

- `POST /pr/analyze` manual PR analysis trigger.
- `POST /pr/config` update per-repo `review_depth` (`basic` or `deep`).
- `GET /pr/config/{repo_id}` fetch current review config.
