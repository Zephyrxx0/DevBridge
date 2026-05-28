# Initial Research: DevBridge

## Stack

- **Orchestration**: LangGraph (for stateful multi-agent workflows) or LlamaIndex Workflows.
- **Database**: Supabase + `pgvector` for hybrid (relational + semantic) search.
- **LLM**: Gemini 1.5 Flash (via Vertex AI) for high speed and long context.
- **Embeddings**: `text-embedding-004`.
- **Backend**: FastAPI (Python 3.12).
- **Frontend**: Next.js 14/15 + Tailwind CSS.

## Features

- **Semantic Chunking**: Using Tree-sitter to identify class and function boundaries.
- **Contextual Retrieval**: Attaching imports and signatures as metadata to chunks.
- **Streaming UI**: SSE to stream multi-agent "thought" and final answers.

## Architecture

- **Ingestion**: Worker Pool pattern using Cloud Run Jobs tasks.
- **Trigger**: Pub/Sub events for git push/annotation updates.
- **Idempotency**: Using message IDs to prevent duplicate chunking/indexing.

## Pitfalls

- **Recall Bias**: Gemini 1.5 Flash may lose information in the "middle" of very large contexts.
- **Noise Concentration**: Dumping too much irrelevant code into context leads to hallucination.
- **Ack Deadlines**: Long-running ingestion tasks must refresh Pub/Sub ack deadlines.

---
*Created: 2026-04-15*
