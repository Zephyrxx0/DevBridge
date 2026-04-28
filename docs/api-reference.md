# API Reference

## Health

- `GET /`
  - returns service status/version payload.

## Chat

- `POST /chat`
  - body: `{ "message": string, "thread_id": string, "repo_id"?: string }`
  - response: `{ "response": string, "thread_id": string }`

- `POST /chat/stream`
  - same request body.
  - response: SSE events (`metadata`, `chunk`, `done`, `error`).

## Annotations

- `POST /annotation` create annotation.
- `GET /annotations/{repo_id}` list annotations (optional `file_path`, `tags`).
- `PATCH /annotation/{id}` update own annotation.
- `DELETE /annotation/{id}` delete own annotation.
- `POST /annotation/{id}/upvote` increment upvotes.

## PR Analysis

- `POST /pr/analyze`
  - body: `{ "repo_id": string, "pr_number": number }`

- `POST /pr/config`
  - body: `{ "repo_id": string, "review_depth": "basic" | "deep" }`

- `GET /pr/config/{repo_id}` fetch config.

## Webhooks

- `POST /webhooks/github`
  - validates `x-hub-signature-256` HMAC.
  - accepts PR open/synchronize events.
  - enqueues background PR analysis.

## Error behavior

- Validation errors return HTTP `400`.
- Unauthorized/missing identity returns `401`/`403`.
- Internal failures return `500` with scoped message.
