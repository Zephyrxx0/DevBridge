-- Cache table for fastapi-cache2 with Postgres backend (D-03)
CREATE TABLE IF NOT EXISTS cache_entries (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for efficient cleanup and expiration checks
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache_entries (expires_at);
