ALTER TABLE IF EXISTS chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_repositories ON repositories;
CREATE POLICY org_isolation_repositories ON repositories
  USING (
    (
      org_id::text = COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'org_id',
        auth.jwt() ->> 'org_id'
      )
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
  );

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

DROP POLICY IF EXISTS org_isolation_questions ON questions;
CREATE POLICY org_isolation_questions ON questions
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.id = questions.repo_id
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );

DROP POLICY IF EXISTS org_isolation_chat_sessions ON chat_sessions;
CREATE POLICY org_isolation_chat_sessions ON chat_sessions
  USING (
    EXISTS (
      SELECT 1
      FROM repositories r
      WHERE r.id = chat_sessions.repo_id
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );

DROP POLICY IF EXISTS org_isolation_chat_messages ON chat_messages;
CREATE POLICY org_isolation_chat_messages ON chat_messages
  USING (
    EXISTS (
      SELECT 1
      FROM chat_sessions cs
      JOIN repositories r ON r.id = cs.repo_id
      WHERE cs.id = chat_messages.session_id
        AND (
          r.org_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id')
          OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
        )
    )
  );
