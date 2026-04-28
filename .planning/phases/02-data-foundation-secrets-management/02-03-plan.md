---
phase: 02-data-foundation-secrets-management
plan: "03"
type: execute
wave: 3
depends_on: ["02"]
files_modified:
  - api/db/vector_store.py
  - api/agents/orchestrator.py
files_created:
  - sql/setup_vector_store.sql
autonomous: true
requirements:
  - "Configure Supabase pgvector extension"

must_haves:
  truths:
    - "Semantic search engine is initialized and ready for concurrent orchestrator queries"
  artifacts:
    - path: "api/db/vector_store.py"
      provides: "LangChain PGVectorStore integration"
    - path: "sql/setup_vector_store.sql"
      provides: "Manual DB initialization steps with HNSW"
  key_links:
    - "api/db/vector_store.py consumes the AsyncEngine managed by api/db/session.py"
---

<objective>
Implement modern langchain-postgres vector store capabilities and document database setup scripts.
</objective>

<execution_context>
@.agent/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/phases/02-data-foundation-secrets-management/02-CONTEXT.md
@.planning/phases/02-data-foundation-secrets-management/02-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement LangChain PGVectorStore</name>
  <files>
    api/db/vector_store.py, api/db/session.py, api/core/config.py
  </files>
  <action>
    Rewrite `api/db/vector_store.py`.
    Import `PGEngine` and `PGVectorStore` from `langchain_postgres`.
    Update `VectorStoreManager.initialize()` to use `get_engine()` from `api.db.session`.
    Instantiate `self._vectorstore = PGVectorStore(engine=engine, collection_name=self.collection_name, embedding_service=embeddings)`.
    Add `self._vectorstore.create_tables_if_not_exists()` within `initialize()`.
  </action>
  <verify>
    <automated>pytest tests/test_vector_db.py</automated>
  </verify>
  <done>Vector store now uses modern PGVectorStore with AsyncEngine.</done>
</task>

<task type="auto">
  <name>Task 2: Prepare Vector Store SQL Setup Script & Orchestrator Comments</name>
  <files>
    sql/setup_vector_store.sql, api/agents/orchestrator.py
  </files>
  <action>
    Create `sql/setup_vector_store.sql`.
    Include the following concrete SQL commands:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    -- Note: langchain-postgres creates the table automatically, but if you need to create indices manually for HNSW:
    -- CREATE INDEX ON langchain_pg_embedding USING hnsw (embedding vector_cosine_ops);
    ```
    Then, add a TODO comment inside `code_search` in `api/agents/orchestrator.py`:
    `# TODO(Phase 5): Connect code_search to vector_db.similarity_search`
  </action>
  <verify>
    <automated>pytest tests/test_vector_db.py</automated>
  </verify>
  <done>SQL script created and orchestrator TODO added.</done>
</task>

</tasks>

<verification>
- `pytest tests/test_vector_db.py` completes successfully.
</verification>
