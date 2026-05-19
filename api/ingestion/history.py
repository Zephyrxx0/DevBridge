from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib import parse, request

from sqlalchemy import text

from api.core.config import settings
from api.db.session import get_engine, init_db_pool
from api.db.vector_store import vector_db


GITHUB_API_BASE = "https://api.github.com"
_PR_NUMBER_PATTERN = re.compile(r"\(#(?P<pr>\d+)\)")


@dataclass
class PRIngestionResult:
    repo: str
    number: int
    title: str
    summary: str
    merged_at: datetime | None


@dataclass
class CommitHistoryResult:
    repo: str
    file_path: str
    commit_count: int
    latest_commit_sha: str | None
    pr_number: int | None


def _sanitize_text(value: str | None, max_len: int = 20000) -> str:
    if not value:
        return ""
    sanitized = value.replace("\x00", "").strip()
    if len(sanitized) <= max_len:
        return sanitized
    return sanitized[:max_len]


def _get_github_token() -> str:
    return (
        os.environ.get("GITHUB_TOKEN")
        or os.environ.get("GITHUB_API_TOKEN")
        or ""
    )


async def _github_get_json(url: str, token: str, accept: str = "application/vnd.github+json") -> Any:
    def _request() -> Any:
        req = request.Request(url)
        req.add_header("Accept", accept)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        with request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)

    return await asyncio.to_thread(_request)


async def _ensure_db_ready() -> None:
    if get_engine() is not None:
        return

    conn_str = settings.supabase_connection_string
    if not conn_str:
        raise RuntimeError("Database not configured for history ingestion")
    await init_db_pool(conn_str)


async def _summarize_pr(title: str, description: str) -> str:
    clean_title = _sanitize_text(title, max_len=500)
    clean_description = _sanitize_text(description, max_len=6000)
    if not clean_title and not clean_description:
        return ""

    fallback = clean_description[:600]
    if fallback:
        return f"{clean_title}\n\n{fallback}".strip()
    return clean_title


async def _embed_text(text_to_embed: str) -> list[float] | None:
    if not text_to_embed:
        return None

    embeddings = vector_db.get_embedding_service()
    try:
        vector = await asyncio.to_thread(embeddings.embed_query, text_to_embed)
        return vector
    except Exception:
        return None


def _extract_pr_number_from_commit_message(message: str) -> int | None:
    if not message:
        return None
    match = _PR_NUMBER_PATTERN.search(message)
    if not match:
        return None
    return int(match.group("pr"))


async def ingest_pr_metadata(repo: str, pr_number: int) -> PRIngestionResult:
    token = _get_github_token()
    if not token:
        raise RuntimeError("GitHub token not configured")

    pr_url = f"{GITHUB_API_BASE}/repos/{repo}/pulls/{pr_number}"
    payload = await _github_get_json(pr_url, token)

    title = _sanitize_text(payload.get("title"), max_len=1000)
    description = _sanitize_text(payload.get("body"), max_len=30000)
    author = _sanitize_text(payload.get("user", {}).get("login"), max_len=255)
    merged_at_raw = payload.get("merged_at")
    merged_at = None
    if merged_at_raw:
        merged_at = datetime.fromisoformat(merged_at_raw.replace("Z", "+00:00"))

    summary = await _summarize_pr(title, description)
    embed_source = _sanitize_text(f"{title}\n\n{summary or description}", max_len=8000)
    embedding = await _embed_text(embed_source)

    await _ensure_db_ready()
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine unavailable after initialization")

    upsert_sql = text(
        """
        INSERT INTO pull_requests (
            repo, number, title, description, summary, author, merged_at, embedding
        ) VALUES (
            :repo, :number, :title, :description, :summary, :author, :merged_at, :embedding
        )
        ON CONFLICT (repo, number) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            summary = EXCLUDED.summary,
            author = EXCLUDED.author,
            merged_at = EXCLUDED.merged_at,
            embedding = EXCLUDED.embedding
        """
    )

    async with engine.connect() as conn:
        await conn.execute(
            upsert_sql,
            {
                "repo": repo,
                "number": pr_number,
                "title": title,
                "description": description,
                "summary": summary,
                "author": author,
                "merged_at": merged_at,
                "embedding": embedding,
            },
        )
        await conn.commit()

    return PRIngestionResult(
        repo=repo,
        number=pr_number,
        title=title,
        summary=summary,
        merged_at=merged_at,
    )


async def ingest_commit_history(repo: str, file_path: str, per_page: int = 30) -> CommitHistoryResult:
    token = _get_github_token()
    if not token:
        raise RuntimeError("GitHub token not configured")

    encoded_path = parse.quote(file_path, safe="/")
    commits_url = f"{GITHUB_API_BASE}/repos/{repo}/commits?path={encoded_path}&per_page={per_page}"
    commits = await _github_get_json(commits_url, token)
    if not isinstance(commits, list):
        commits = []

    latest_commit_sha = commits[0].get("sha") if commits else None
    pr_number = None
    for commit in commits:
        message = commit.get("commit", {}).get("message", "")
        extracted = _extract_pr_number_from_commit_message(message)
        if extracted:
            pr_number = extracted
            break

    await _ensure_db_ready()
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine unavailable after initialization")

    update_sql = text(
        """
        UPDATE code_chunks
        SET commit_sha = :commit_sha,
            pr_number = COALESCE(:pr_number, pr_number)
        WHERE repo = :repo
          AND file_path = :file_path
        """
    )

    async with engine.connect() as conn:
        await conn.execute(
            update_sql,
            {
                "commit_sha": latest_commit_sha,
                "pr_number": pr_number,
                "repo": repo,
                "file_path": file_path,
            },
        )
        await conn.commit()

    return CommitHistoryResult(
        repo=repo,
        file_path=file_path,
        commit_count=len(commits),
        latest_commit_sha=latest_commit_sha,
        pr_number=pr_number,
    )
