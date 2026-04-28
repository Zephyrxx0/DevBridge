# Data Model

## Storage layers

- Relational metadata in Postgres (Supabase).
- Vector embeddings in pgvector-backed tables.
- Optional cache records in Postgres cache table.

## Key entities

- `annotations`
  - repo/file/line scoped human notes.
  - tags + upvotes + author identity.
- `repo_configs`
  - repository-level review depth config.
- `ingestion_jobs`
  - pipeline tracking state.
- vector/chunk tables
  - chunk content + embedding + source metadata.

## SQL migration files

- `sql/migrations/0014_add_annotations_table.sql`
- `sql/migrations/0015_add_repo_configs_table.sql`
- `sql/migrations/0016_add_cache_table.sql`
- `sql/migrations/0017_create_ingestion_jobs.sql`

## Search functions

- `sql/hybrid_search.sql` defines hybrid retrieval (semantic + lexical/signal mix).
- `sql/setup_vector_store.sql` initializes vector extension and core vector setup.
