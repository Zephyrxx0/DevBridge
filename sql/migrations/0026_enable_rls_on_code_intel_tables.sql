ALTER TABLE IF EXISTS annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pull_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_annotations ON annotations;
CREATE POLICY org_isolation_annotations ON annotations
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.id = annotations.repo_id
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );

DROP POLICY IF EXISTS org_isolation_code_chunks ON code_chunks;
CREATE POLICY org_isolation_code_chunks ON code_chunks
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.name = code_chunks.repo
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );

DROP POLICY IF EXISTS org_isolation_pull_requests ON pull_requests;
CREATE POLICY org_isolation_pull_requests ON pull_requests
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.name = pull_requests.repo
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );
