CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT NOT NULL,
  file_path TEXT NOT NULL,
  commit_sha TEXT,
  pr_number INTEGER,
  language TEXT,
  symbol_name TEXT,
  symbol_kind TEXT,
  start_line INTEGER,
  end_line INTEGER,
  chunk_type TEXT,
  content_hash TEXT,
  chunk_id TEXT UNIQUE,
  parse_status TEXT,
  error_type TEXT,
  error_message TEXT,
  content TEXT,
  summary TEXT,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  author TEXT,
  merged_at TIMESTAMPTZ,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (repo, number)
);

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  start_line INT,
  end_line INT,
  author_id UUID NOT NULL,
  comment TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(768),
  upvotes INT DEFAULT 0 CHECK (upvotes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (start_line IS NULL OR start_line > 0),
  CHECK (end_line IS NULL OR end_line > 0),
  CHECK (start_line IS NULL OR end_line IS NULL OR end_line >= start_line)
);

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'annotations_author_id_fkey'
    ) THEN
      ALTER TABLE annotations
        ADD CONSTRAINT annotations_author_id_fkey
        FOREIGN KEY (author_id) REFERENCES users(id);
    END IF;
  ELSIF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'annotations_author_id_fkey'
    ) THEN
      ALTER TABLE annotations
        ADD CONSTRAINT annotations_author_id_fkey
        FOREIGN KEY (author_id) REFERENCES profiles(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS code_chunks_embedding_idx ON code_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS code_chunks_content_idx ON code_chunks USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS code_chunks_repo_idx ON code_chunks (repo);
CREATE INDEX IF NOT EXISTS code_chunks_path_idx ON code_chunks (file_path);
CREATE INDEX IF NOT EXISTS code_chunks_lang_idx ON code_chunks (language);
CREATE INDEX IF NOT EXISTS code_chunks_kind_idx ON code_chunks (symbol_kind);
CREATE INDEX IF NOT EXISTS code_chunks_commit_sha_idx ON code_chunks (commit_sha);
CREATE INDEX IF NOT EXISTS code_chunks_pr_number_idx ON code_chunks (pr_number);
CREATE INDEX IF NOT EXISTS code_chunks_content_hash_idx ON code_chunks (content_hash);

CREATE INDEX IF NOT EXISTS pull_requests_repo_idx ON pull_requests (repo);
CREATE INDEX IF NOT EXISTS pull_requests_number_idx ON pull_requests (number);
CREATE INDEX IF NOT EXISTS pull_requests_repo_number_idx ON pull_requests (repo, number);
CREATE INDEX IF NOT EXISTS pull_requests_merged_at_idx ON pull_requests (merged_at DESC);
CREATE INDEX IF NOT EXISTS pull_requests_embedding_idx ON pull_requests USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS annotations_repo_file_idx ON annotations (repo_id, file_path);
