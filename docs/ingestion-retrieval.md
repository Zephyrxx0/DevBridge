# Ingestion and Retrieval

## Ingestion pipeline

Source events enter by webhook or manual trigger.

1. Event accepted and validated.
2. Worker job receives payload.
3. Files fetched and normalized.
4. Chunker splits by semantic/code-aware logic.
5. Embedding jobs generated (`EmbeddingJob` hub node in graph).
6. Embeddings persisted into vector store.
7. Metadata linked for retrieval and traceability.

## Retrieval pipeline

1. User query accepted.
2. Query embedding generated.
3. Orchestrator selects retrieval strategy.
4. Pulls code chunks, annotation hits, optional PR history context.
5. Assembles grounded context window.
6. Generates answer/stream.

## Why this design

- Async ingestion removes latency from request path.
- Hybrid retrieval improves precision on symbol/file-targeted questions.
- Annotation layer stores team knowledge not visible in raw code.

## Important code areas

- `api/ingest/*`
- `api/ingestion/*`
- `api/agents/orchestrator.py`
- `api/db/*`
