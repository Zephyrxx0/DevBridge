CREATE EXTENSION IF NOT EXISTS vector;

-- Code chunks (the core retrieval unit)
CREATE TABLE IF NOT EXISTS code_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo            TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  language        TEXT,
  symbol_name     TEXT,
  symbol_kind     TEXT,
  start_line      INTEGER,
  end_line        INTEGER,
  chunk_type      TEXT,
  content_hash    TEXT,
  chunk_id        TEXT UNIQUE,
  parse_status    TEXT,
  error_type      TEXT,
  error_message   TEXT,
  content         TEXT,
  embedding       VECTOR(768),               -- text-embedding-004 dimension
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created by a previous phase without them
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS embedding VECTOR(768);
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx ON code_chunks USING hnsw (embedding vector_cosine_ops);

-- GIN index for lexical search
CREATE INDEX IF NOT EXISTS code_chunks_content_idx ON code_chunks USING gin (to_tsvector('english', content));

-- B-tree indexes for common filters
CREATE INDEX IF NOT EXISTS code_chunks_repo_idx ON code_chunks (repo);
CREATE INDEX IF NOT EXISTS code_chunks_path_idx ON code_chunks (file_path);
CREATE INDEX IF NOT EXISTS code_chunks_lang_idx ON code_chunks (language);
CREATE INDEX IF NOT EXISTS code_chunks_kind_idx ON code_chunks (symbol_kind);
