-- Ingestion Jobs Table
-- Tracks ingestion progress for observability and debugging
-- D-03, D-04 from Phase 12 Context
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'error')),
    chunk_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs (status);

-- Index for repo+file_path lookups (idempotency check)
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_repo_path ON ingestion_jobs (repo, file_path);