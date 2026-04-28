-- Repo configuration for PR review depth
CREATE TABLE IF NOT EXISTS repo_configs (
  repo_id         UUID PRIMARY KEY,
  review_depth    TEXT NOT NULL DEFAULT 'basic',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for repo_id
CREATE INDEX IF NOT EXISTS repo_configs_repo_id_idx ON repo_configs (repo_id);
