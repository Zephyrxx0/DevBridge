# Phase 02: Data Foundation & Secret Management - Research

**Researched:** 2026-04-17
**Domain:** Cloud Secrets Management & Vector Databases
**Confidence:** HIGH

## Summary

This phase establishes a secure foundation for DevBridge by integrating Google Cloud Secret Manager for sensitive configuration and Supabase pgvector for semantic search capabilities. The research confirms that using Pydantic `BaseSettings` with a custom source is the industry standard for unified secret management in FastAPI. For the vector store, `langchain-postgres` (the modern successor to `langchain-community` PGVector) provides robust integration with Supabase using `psycopg3`.

**Primary recommendation:** Implement a custom Pydantic `Settings` source that fetches from GCP Secret Manager first and falls back to local `.env` variables, and use `langchain_postgres.PGVectorStore` with an `AsyncConnectionPool` for optimal performance.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Secret Retrieval | API / Backend | — | Secrets must never reach the client; fetched at startup/runtime by backend. |
| Vector Persistence | Database | — | Supabase pgvector handles storage and similarity math. |
| Embedding Generation | API / Backend | AI Service | Backend calls Vertex AI to generate vectors before storage/search. |
| Connection Pooling | API / Backend | — | FastAPI manages the pool to minimize DB handshake overhead. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| google-cloud-secret-manager | 2.27.0 | GCP Secret Access | Official idiomatic SDK for Google Cloud. [VERIFIED: PyPI] |
| langchain-postgres | 0.0.17 | Vector Store Integration | Official LangChain partner package for modern Postgres/pgvector. [VERIFIED: PyPI] |
| psycopg[binary] | 3.3.3 | Database Driver | Modern, async-first Python-Postgres adapter with built-in pooling. [CITED: psycopg.org] |
| pydantic-settings | 2.13.1 | Configuration Management | Standard Pydantic v2 extension for env and secret management. [VERIFIED: PyPI] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| sqlalchemy | 2.0.x | Async ORM / Engine | Required by langchain-postgres for connection management. |
| python-dotenv | 1.0.x | Local Env Loading | Used as the fallback source when GCP is unavailable. |

**Installation:**
```bash
pip install google-cloud-secret-manager langchain-postgres "psycopg[binary]" pydantic-settings sqlalchemy python-dotenv
```

## Architecture Patterns

### Recommended Project Structure
```
api/
├── core/
│   ├── config.py       # Pydantic Settings with GCP custom source
│   └── secrets.py      # GCP Secret Manager client wrapper
├── db/
│   ├── session.py      # AsyncConnectionPool & SQLAlchemy Engine
│   └── vector_store.py # LangChain PGVectorStore initialization
└── sql/
    └── setup_vector_store.sql # Manual extension/table setup
```

### Pattern 1: Unified Secret Management (Init > GCP > Env > .env)
**What:** A custom Pydantic source that prioritizes cloud secrets but allows local development without cloud connectivity.
**When to use:** Hybrid environments where developers work locally but production is in GCP.

### Pattern 2: FastAPI Lifespan Connection Pooling
**What:** Using the `lifespan` context manager to open and close the database pool.
**When to use:** All FastAPI applications to ensure zero-leak connection management.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret Retrieval Logic | Custom API calls | `google-cloud-secret-manager` | Handles retries, auth (ADC), and metadata automatically. |
| Vector Similarity | Custom SQL queries | `langchain-postgres` | Provides high-level abstractions for RAG and metadata filtering. |
| Connection Management | Manual `connect()`/`close()` | `psycopg_pool.AsyncConnectionPool` | Prevents connection leaks and provides thread-safe pooling. |

## Common Pitfalls

### Pitfall 1: High Latency in Secret Fetching
**What goes wrong:** Fetching 10 secrets from GCP individually at runtime causes high latency (1-2s delay).
**How to avoid:** Fetch all required secrets at startup and cache them in the `Settings` singleton. Do not fetch secrets per-request.

### Pitfall 2: Supabase Pooler Port Confusion
**What goes wrong:** Using port `5432` with high-concurrency serverless functions can exhaust Supabase connections.
**How to avoid:** Use the Transaction Pooler port (`6543`) for production-like loads and append `?sslmode=require` to the connection string.

### Pitfall 3: Missing pgvector Extension
**What goes wrong:** `langchain-postgres` fails to create tables because the `vector` extension isn't enabled.
**How to avoid:** Include `CREATE EXTENSION IF NOT EXISTS vector;` in the first line of the setup SQL script.

## Code Examples

### Custom Pydantic Settings Source for GCP
```python
# Source: Adapted from pydantic-settings docs & GCP SDK
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict
from google.cloud import secretmanager
import os

class GCPSecretSource(PydanticBaseSettingsSource):
    def __call__(self):
        project_id = os.getenv("GCP_PROJECT_ID")
        if not project_id:
            return {}
        
        client = secretmanager.SecretManagerServiceClient()
        # In a real implementation, you might want to fetch secrets selectively 
        # or use a naming convention to map field_name -> secret_id
        return {} # Logic to populate dict from GCP

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    supabase_connection_string: str

    @classmethod
    def settings_customise_sources(cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings):
        return (init_settings, GCPSecretSource(settings_cls), env_settings, dotenv_settings)
```

### LangChain Postgres Initialization
```python
# Source: https://github.com/langchain-ai/langchain-postgres
from langchain_postgres import PGEngine, PGVectorStore
from langchain_google_vertexai import VertexAIEmbeddings

async def get_vector_store(connection_string: str):
    engine = PGEngine.from_connection_string(connection_string)
    embeddings = VertexAIEmbeddings(model_name="text-embedding-004")
    
    return PGVectorStore(
        engine=engine,
        table_name="code_embeddings",
        embedding_service=embeddings
    )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `langchain-community` PGVector | `langchain-postgres` | 2024 | Better performance, `psycopg3` support, cleaner API. |
| IVFFlat Index | HNSW Index | 2023 | Higher recall and query speed for production RAG. |
| `.env` files in production | Secret Manager | Standard | Improved security and rotation capabilities. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `GCP_PROJECT_ID` is available in the environment. | Code Examples | GCP Secret Manager calls will fail. |
| A2 | Supabase version supports `pgvector` 0.5.0+. | Pitfalls | HNSW indexing might not be available. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| gcloud CLI | GCP Auth | ✓ | 563.0.0 | Manual API Keys (Not recommended) |
| Python | Runtime | ✓ | 3.13.1 | — |
| pip | Package management | ✓ | 25.2 | — |
| Supabase | Data Foundation | ✓ | Cloud | Local Postgres + pgvector |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Quick run command | `pytest tests/test_secrets.py` |
| Full suite command | `pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Secret retrieval with fallback | Integration | `pytest tests/test_secrets.py` | ❌ Wave 0 |
| VEC-01 | Connection to pgvector | Smoke | `pytest tests/test_vector_db.py` | ❌ Wave 0 |

## Sources

### Primary (HIGH confidence)
- `langchain-postgres` GitHub - [Official README & Examples](https://github.com/langchain-ai/langchain-postgres)
- `psycopg` Official Docs - [Connection Pooling](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
- `pydantic-settings` Docs - [Custom Settings Sources](https://docs.pydantic.dev/latest/concepts/pydantic_settings/#custom-settings-sources)

### Secondary (MEDIUM confidence)
- Supabase Blog - [pgvector HNSW vs IVFFlat](https://supabase.com/blog/pgvector-hnsw-vs-ivfflat)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Current PyPI versions verified.
- Architecture: HIGH - Follows FastAPI/Pydantic best practices.
- Pitfalls: MEDIUM - Based on common ecosystem issues.

**Research date:** 2026-04-17
**Valid until:** 2026-05-17
