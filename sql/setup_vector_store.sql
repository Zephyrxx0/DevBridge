CREATE EXTENSION IF NOT EXISTS vector;

-- Code chunks (the core retrieval unit)
CREATE TABLE IF NOT EXISTS code_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo            TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  commit_sha      TEXT,
  pr_number       INTEGER,
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
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS commit_sha TEXT;
ALTER TABLE code_chunks ADD COLUMN IF NOT EXISTS pr_number INTEGER;

-- Pull request history and intent metadata
CREATE TABLE IF NOT EXISTS pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo            TEXT NOT NULL,
  number          INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  summary         TEXT,
  author          TEXT,
  merged_at       TIMESTAMPTZ,
  embedding       VECTOR(768),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (repo, number)
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx ON code_chunks USING hnsw (embedding vector_cosine_ops);

-- GIN index for lexical search
CREATE INDEX IF NOT EXISTS code_chunks_content_idx ON code_chunks USING gin (to_tsvector('english', content));

-- B-tree indexes for common filters
CREATE INDEX IF NOT EXISTS code_chunks_repo_idx ON code_chunks (repo);
CREATE INDEX IF NOT EXISTS code_chunks_path_idx ON code_chunks (file_path);
CREATE INDEX IF NOT EXISTS code_chunks_lang_idx ON code_chunks (language);
CREATE INDEX IF NOT EXISTS code_chunks_kind_idx ON code_chunks (symbol_kind);
CREATE INDEX IF NOT EXISTS code_chunks_commit_sha_idx ON code_chunks (commit_sha);
CREATE INDEX IF NOT EXISTS code_chunks_pr_number_idx ON code_chunks (pr_number);

CREATE INDEX IF NOT EXISTS pull_requests_repo_idx ON pull_requests (repo);
CREATE INDEX IF NOT EXISTS pull_requests_number_idx ON pull_requests (number);
CREATE INDEX IF NOT EXISTS pull_requests_repo_number_idx ON pull_requests (repo, number);
CREATE INDEX IF NOT EXISTS pull_requests_merged_at_idx ON pull_requests (merged_at DESC);
CREATE INDEX IF NOT EXISTS pull_requests_embedding_idx ON pull_requests USING hnsw (embedding vector_cosine_ops);
