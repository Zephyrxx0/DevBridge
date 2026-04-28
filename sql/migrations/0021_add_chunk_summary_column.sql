ALTER TABLE IF EXISTS code_chunks
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_code_chunks_content_hash ON code_chunks (content_hash);
