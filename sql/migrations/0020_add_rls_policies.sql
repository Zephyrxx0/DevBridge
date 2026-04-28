ALTER TABLE IF EXISTS repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_repositories ON repositories;
CREATE POLICY org_isolation_repositories ON repositories
  USING ((org_id::text = auth.jwt() ->> 'org_id') OR (auth.jwt() ->> 'org_id' IS NULL));

DROP POLICY IF EXISTS org_isolation_annotations ON annotations;
CREATE POLICY org_isolation_annotations ON annotations
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.id = annotations.repo_id
        AND ((r.org_id::text = auth.jwt() ->> 'org_id') OR (auth.jwt() ->> 'org_id' IS NULL))
    )
  );

DROP POLICY IF EXISTS org_isolation_questions ON questions;
CREATE POLICY org_isolation_questions ON questions
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.id = questions.repo_id
        AND ((r.org_id::text = auth.jwt() ->> 'org_id') OR (auth.jwt() ->> 'org_id' IS NULL))
    )
  );
