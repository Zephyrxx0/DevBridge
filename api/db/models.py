from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import text

from api.db.session import get_engine


@dataclass
class CodeChunkHistoryLink:
    repo: str
    file_path: str
    chunk_id: str
    commit_sha: str | None
    pr_number: int | None


@dataclass
class PullRequestRecord:
    repo: str
    number: int
    title: str
    description: str
    summary: str
    author: str | None
    merged_at: datetime | None


@dataclass
class Annotation:
    id: UUID
    repo_id: UUID
    file_path: str
    author_id: UUID
    comment: str
    tags: list[str]
    upvotes: int
    created_at: datetime
    start_line: int | None = None
    end_line: int | None = None
    embedding: list[float] | None = None

    @classmethod
    async def get_annotations(
        cls,
        repo_id: UUID | str,
        file_path: str | None = None,
        tags: list[str] | None = None,
        limit: int = 10,
    ) -> list["Annotation"]:
        """Fetch ranked annotations for retrieval context.

        Ranking priority:
        1) Exact file path match
        2) Tag relevance (overlap)
        3) Upvotes descending
        """
        engine = get_engine()
        if engine is None:
            return []

        repo_id_str = str(repo_id)
        normalized_tags = tags or []
        query = text(
            """
            SELECT
              id,
              repo_id,
              file_path,
              start_line,
              end_line,
              author_id,
              comment,
              tags,
              upvotes,
              created_at,
              CASE
                WHEN :file_path IS NOT NULL AND file_path = :file_path THEN 1
                ELSE 0
              END AS file_match,
              CASE
                WHEN :tag_count > 0 AND tags && CAST(:search_tags AS text[]) THEN 1
                ELSE 0
              END AS tag_match
            FROM annotations
            WHERE repo_id = CAST(:repo_id AS uuid)
              AND (
                :tag_count = 0
                OR tags && CAST(:search_tags AS text[])
              )
            ORDER BY file_match DESC, tag_match DESC, upvotes DESC, created_at DESC
            LIMIT :limit
            """
        )

        async with engine.connect() as conn:
            result = await conn.execute(
                query,
                {
                    "repo_id": repo_id_str,
                    "file_path": file_path,
                    "search_tags": normalized_tags,
                    "tag_count": len(normalized_tags),
                    "limit": limit,
                },
            )
            rows = result.fetchall()

        annotations: list[Annotation] = []
        for row in rows:
            m = row._mapping
            annotations.append(
                cls(
                    id=m["id"],
                    repo_id=m["repo_id"],
                    file_path=m["file_path"],
                    start_line=m["start_line"],
                    end_line=m["end_line"],
                    author_id=m["author_id"],
                    comment=m["comment"],
                    tags=list(m["tags"] or []),
                    upvotes=m["upvotes"],
                    created_at=m["created_at"],
                    embedding=m.get("embedding") if hasattr(m, "get") else m["embedding"],
                )
            )
        return annotations

    def format_for_llm(self) -> str:
        tag_text = ", ".join(self.tags) if self.tags else "context"
        if self.start_line is not None and self.end_line is not None:
            line_info = f"line {self.start_line}-{self.end_line}"
        elif self.start_line is not None:
            line_info = f"line {self.start_line}"
        else:
            line_info = "file-level"

        lines = [f"// @{tag_text} ({line_info})"]
        if self.upvotes > 0:
            lines.append(f"//    â†‘ {self.upvotes} helpful votes")
        lines.append(self.comment)
        return "\n".join(lines)


@dataclass
class RepoConfig:
    repo_id: UUID
    review_depth: str = "basic"

    @classmethod
    async def get_config(cls, repo_id: UUID | str) -> RepoConfig:
        engine = get_engine()
        if engine is None:
            return cls(repo_id=UUID(str(repo_id)))

        query = text(
            "SELECT review_depth FROM repo_configs WHERE repo_id = CAST(:repo_id AS uuid)"
        )
        async with engine.connect() as conn:
            try:
                result = await conn.execute(query, {"repo_id": str(repo_id)})
                row = result.fetchone()
                if row:
                    return cls(
                        repo_id=UUID(str(repo_id)),
                        review_depth=row._mapping["review_depth"],
                    )
            except Exception:
                # Fallback if table doesn't exist or other DB errors
                pass
        return cls(repo_id=UUID(str(repo_id)))

    @classmethod
    async def update_config(cls, repo_id: UUID | str, review_depth: str) -> RepoConfig:
        engine = get_engine()
        if engine is None:
            return cls(repo_id=UUID(str(repo_id)), review_depth=review_depth)

        query = text(
            """
            INSERT INTO repo_configs (repo_id, review_depth)
            VALUES (CAST(:repo_id AS uuid), :review_depth)
            ON CONFLICT (repo_id) DO UPDATE SET review_depth = EXCLUDED.review_depth
            RETURNING repo_id, review_depth
            """
        )
        async with engine.connect() as conn:
            result = await conn.execute(
                query, {"repo_id": str(repo_id), "review_depth": review_depth}
            )
            await conn.commit()
            row = result.fetchone()
            if row:
                return cls(
                    repo_id=row._mapping["repo_id"],
                    review_depth=row._mapping["review_depth"],
                )
        return cls(repo_id=UUID(str(repo_id)), review_depth=review_depth)
