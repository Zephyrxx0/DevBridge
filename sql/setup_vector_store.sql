CREATE EXTENSION IF NOT EXISTS vector;

-- Note: langchain-postgres creates the table automatically, but if you need
-- to create indices manually for HNSW:
-- CREATE INDEX ON langchain_pg_embedding USING hnsw (embedding vector_cosine_ops);
