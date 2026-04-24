-- Hybrid Search SQL Function
-- Blends lexical (Full Text Search) and semantic (Vector) search results.

CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    k INT DEFAULT 10,
    filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
    file_path TEXT,
    start_line INT,
    end_line INT,
    score FLOAT,
    snippet TEXT,
    reason JSONB
) AS $$
DECLARE
    w_semantic FLOAT := COALESCE((filters->>'w_semantic')::FLOAT, 0.5);
    w_lexical FLOAT := COALESCE((filters->>'w_lexical')::FLOAT, 0.5);
    query_embedding VECTOR(768);
    min_time TIMESTAMPTZ := (filters->>'min_time')::TIMESTAMPTZ;
    max_time TIMESTAMPTZ := (filters->>'max_time')::TIMESTAMPTZ;
    f_repo TEXT := filters->>'repo';
    f_path_prefix TEXT := filters->>'file_path_prefix';
    f_lang TEXT := filters->>'language';
    f_kind TEXT := filters->>'symbol_kind';
BEGIN
    -- Extract embedding from filters if present.
    -- Expected format in JSON: [0.1, 0.2, ...]
    IF filters ? 'query_embedding' THEN
        query_embedding := CAST(filters->>'query_embedding' AS VECTOR(768));
    END IF;

    RETURN QUERY
    WITH semantic_scores AS (
        SELECT 
            cc.chunk_id,
            1 - (cc.embedding <=> query_embedding) as semantic_score
        FROM code_chunks cc
        WHERE query_embedding IS NOT NULL 
          AND cc.embedding IS NOT NULL
          AND (f_repo IS NULL OR cc.repo = f_repo)
          AND (f_path_prefix IS NULL OR cc.file_path LIKE (f_path_prefix || '%'))
          AND (f_lang IS NULL OR cc.language = f_lang)
          AND (f_kind IS NULL OR cc.symbol_kind = f_kind)
          AND (min_time IS NULL OR cc.created_at >= min_time)
          AND (max_time IS NULL OR cc.created_at <= max_time)
        ORDER BY cc.embedding <=> query_embedding
        LIMIT k * 2
    ),
    lexical_scores AS (
        SELECT 
            cc.chunk_id,
            ts_rank_cd(to_tsvector('english', cc.content), plainto_tsquery('english', query_text)) as lexical_score
        FROM code_chunks cc
        WHERE to_tsvector('english', cc.content) @@ plainto_tsquery('english', query_text)
          AND (f_repo IS NULL OR cc.repo = f_repo)
          AND (f_path_prefix IS NULL OR cc.file_path LIKE (f_path_prefix || '%'))
          AND (f_lang IS NULL OR cc.language = f_lang)
          AND (f_kind IS NULL OR cc.symbol_kind = f_kind)
          AND (min_time IS NULL OR cc.created_at >= min_time)
          AND (max_time IS NULL OR cc.created_at <= max_time)
        ORDER BY lexical_score DESC
        LIMIT k * 2
    )
    SELECT 
        cc.file_path,
        cc.start_line,
        cc.end_line,
        (COALESCE(ss.semantic_score, 0) * w_semantic + COALESCE(ls.lexical_score, 0) * w_lexical)::FLOAT as score,
        cc.content as snippet,
        jsonb_build_object(
            'semantic_score', ss.semantic_score,
            'lexical_score', ls.lexical_score,
            'chunk_id', cc.chunk_id
        ) as reason
    FROM code_chunks cc
    LEFT JOIN semantic_scores ss ON cc.chunk_id = ss.chunk_id
    LEFT JOIN lexical_scores ls ON cc.chunk_id = ls.chunk_id
    WHERE ss.chunk_id IS NOT NULL OR ls.chunk_id IS NOT NULL
    ORDER BY score DESC
    LIMIT k;
END;
$$ LANGUAGE plpgsql;
