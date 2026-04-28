# Architecture

## High-level layout

```text
User -> Next.js Web UI -> FastAPI API -> Orchestrator agent
                                      -> Supabase (Postgres + pgvector)
                                      -> Vertex AI (Gemini + embeddings)
                                      -> GCS + Pub/Sub ingestion workers
```

## Main goals

- Ground every answer on retrieved context.
- Keep persistent memory across code + PRs + annotations.
- Handle ingestion async via queue.
- Keep costs low via GCP free-tier friendly services.

## Core components

- Frontend: Next.js (`web/src/app/*`) for dashboard/chat/repo UI.
- Backend: FastAPI (`api/main.py`) exposes chat, stream, annotation, webhook, PR routes.
- Agent layer: orchestrator + specialized agents in `api/agents`.
- Storage: Supabase with vector search and relational metadata.
- Ingestion: GitHub event -> webhook -> Pub/Sub -> worker -> chunk/embed/upsert.

## Request flow

1. User sends question.
2. Backend creates agent context (`thread_id`, optional `repo_id`).
3. Orchestrator selects tools/search strategy.
4. Retrieves chunks/annotations/PR context.
5. Returns normal response (`/chat`) or SSE stream (`/chat/stream`).

## Ingestion flow

1. Repository event/webhook accepted.
2. Job message queued.
3. Worker parses changed files.
4. Chunks created with source metadata.
5. Embeddings generated.
6. Upsert to vector store + relational tables.

## Architecture notes from graph report

Graph hubs (`graphify-out/GRAPH_REPORT.md`):

- `EmbeddingJob` highest connectivity.
- `Annotation` and `create_annotation` central to human memory path.
- `Orchestrator` central to runtime answer path.
- `VectorStoreManager` and `get_engine()` central to persistence path.
