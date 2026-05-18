-- Add onboarding plans storage table (FR-03)
CREATE TABLE IF NOT EXISTS repo_onboarding_plans (
  repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  plan JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for updated_at to support cache invalidation queries
CREATE INDEX IF NOT EXISTS repo_onboarding_plans_updated_at_idx ON repo_onboarding_plans (updated_at);
