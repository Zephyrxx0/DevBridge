CREATE TABLE annotations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path       text NOT NULL,
  start_line      int,
  end_line        int,
  author_id       uuid NOT NULL REFERENCES users(id),
  comment         text NOT NULL,
  tags            text[] DEFAULT '{}',
  embedding       vector(768),
  upvotes         int DEFAULT 0 CHECK (upvotes >= 0),
  created_at      timestamptz DEFAULT now(),
  CHECK (start_line IS NULL OR start_line > 0),
  CHECK (end_line IS NULL OR end_line > 0),
  CHECK (
    start_line IS NULL
    OR end_line IS NULL
    OR end_line >= start_line
  )
);

CREATE INDEX ON annotations (repo_id, file_path);
