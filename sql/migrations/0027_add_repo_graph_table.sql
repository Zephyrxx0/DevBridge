-- Add repository graph storage table (FR-02, DR-01)
CREATE TABLE IF NOT EXISTS repo_graph (
  repo_id UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for updated_at to support maintenance tasks
CREATE INDEX IF NOT EXISTS repo_graph_updated_at_idx ON repo_graph (updated_at);
