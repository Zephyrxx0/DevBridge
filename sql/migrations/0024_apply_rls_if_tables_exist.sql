DO $$
BEGIN
  IF to_regclass('public.repositories') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE repositories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS org_isolation_repositories ON repositories';
    EXECUTE $sql$
      CREATE POLICY org_isolation_repositories ON repositories
      USING (
        (
          org_id::text = COALESCE(
            auth.jwt() -> 'app_metadata' ->> 'org_id',
            auth.jwt() ->> 'org_id'
          )
        )
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'org_id', auth.jwt() ->> 'org_id') IS NULL
      )
    $sql$;
  END IF;

  IF to_regclass('public.annotations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE annotations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS org_isolation_annotations ON annotations';
    EXECUTE $sql$
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
      )
    $sql$;
  END IF;

  IF to_regclass('public.questions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE questions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS org_isolation_questions ON questions';
    EXECUTE $sql$
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
      )
    $sql$;
  END IF;

  IF to_regclass('public.chat_sessions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS org_isolation_chat_sessions ON chat_sessions';
    EXECUTE $sql$
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
      )
    $sql$;
  END IF;

  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS org_isolation_chat_messages ON chat_messages';
    EXECUTE $sql$
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
      )
    $sql$;
  END IF;
END $$;
