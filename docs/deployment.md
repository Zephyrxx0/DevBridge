# Deployment

## Target runtime

- Backend: Cloud Run.
- Frontend: Vercel or equivalent Next.js hosting.
- Data: Supabase managed Postgres + pgvector.
- Async pipeline: Pub/Sub + worker runtime.

## Deploy shape

1. Build API container image.
2. Deploy Cloud Run service with env + secret bindings.
3. Configure webhook endpoint and secret.
4. Ensure Supabase migrations applied.
5. Deploy frontend with API base URL.

## Backend env checklist

- `SUPABASE_CONNECTION_STRING`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_APPLICATION_CREDENTIALS` (if file-based auth)
- `CORS_ALLOW_ORIGINS`
- `INTERNAL_AUTH_TOKEN`
- `TRUSTED_PROXY_IPS`

## Infra modules

- `infra/gcs/*` storage bucket + notifications.
- `infra/pubsub/*` topics and variables.

## Hooks and CI helpers

- git hooks in `scripts/hooks/*`.
- post-analysis hook runs quality checks after commit.
