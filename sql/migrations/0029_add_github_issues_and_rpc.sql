CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS repo_github_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  embedding VECTOR(768),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, issue_number)
);

CREATE INDEX IF NOT EXISTS repo_github_issues_repo_id_idx ON repo_github_issues (repo_id);
CREATE INDEX IF NOT EXISTS repo_github_issues_embedding_idx
  ON repo_github_issues USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION get_github_token_for_user(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  gh_token TEXT;
BEGIN
  SELECT identity_data->>'provider_token'
  INTO gh_token
  FROM auth.identities
  WHERE user_id = user_uuid
    AND provider = 'github'
  LIMIT 1;

  RETURN gh_token;
END;
$$;

REVOKE ALL ON FUNCTION get_github_token_for_user(UUID) FROM PUBLIC;
