from __future__ import annotations

import asyncio
import json
import logging
import os
from urllib import request

from sqlalchemy import text

from api.core.config import settings
from api.core.secrets import get_github_token
from api.db.session import get_engine
from api.db.vector_store import vector_db
from api.jobs.base import job_audit, with_distributed_lock, with_retry

logger = logging.getLogger(__name__)


def _repo_slug_from_github_url(url: str | None) -> str | None:
    if not url:
        return None
    clean = url.strip().rstrip("/")
    marker = "github.com/"
    if marker not in clean:
        return None
    tail = clean.split(marker, 1)[1]
    parts = [segment for segment in tail.split("/") if segment]
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1]}"


async def _github_get_json(url: str, token: str) -> dict | list:
    def _do_request() -> dict | list:
        req = request.Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    return await asyncio.to_thread(_do_request)


async def _fetch_external_doc(url: str) -> str:
    def _do_request() -> str:
        req = request.Request(url)
        with request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="ignore")

    return await asyncio.to_thread(_do_request)


async def _embed_issue(text_payload: str) -> list[float] | None:
    if not vector_db._vectorstore:
        vector_db.initialize()
    if not vector_db._vectorstore:
        logger.warning("Skipping issue embedding: vector store unavailable")
        return None
    return await asyncio.to_thread(vector_db._vectorstore.embedding_service.embed_query, text_payload)


@job_audit("sync_github_and_docs")
@with_retry(max_retries=3, delay=1)
@with_distributed_lock("sync_issues")
async def sync_github_and_docs_job() -> dict[str, int]:
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Database engine not initialized")

    async with engine.connect() as conn:
        repo_rows = await conn.execute(text("SELECT id, name, github_url FROM repositories"))
        repos = [dict(row._mapping) for row in repo_rows.fetchall()]

    upsert_sql = text(
        """
        INSERT INTO repo_github_issues (repo_id, issue_number, title, body, embedding, updated_at)
        VALUES (CAST(:repo_id AS uuid), :issue_number, :title, :body, CAST(:embedding AS vector), NOW())
        ON CONFLICT (repo_id, issue_number) DO UPDATE
        SET title = EXCLUDED.title,
            body = EXCLUDED.body,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        """
    )

    sync_user_id = (os.getenv("GITHUB_SYNC_USER_ID") or "").strip()
    synced_count = 0
    docs_count = 0

    if sync_user_id:
        for repo in repos:
            token = await get_github_token(sync_user_id)
            if not token:
                continue

            repo_id = str(repo.get("id"))
            repo_slug = _repo_slug_from_github_url(repo.get("github_url")) or repo.get("name")
            if not repo_slug:
                continue

            payload: list[dict] = []
            page = 1
            while True:
                issues_url = f"https://api.github.com/repos/{repo_slug}/issues?state=open&per_page=100&page={page}"
                page_payload = await _github_get_json(issues_url, token)
                if not isinstance(page_payload, list) or not page_payload:
                    break
                payload.extend([issue for issue in page_payload if isinstance(issue, dict)])
                if len(page_payload) < 100:
                    break
                page += 1

            async with engine.connect() as conn:
                for issue in payload:
                    if not isinstance(issue, dict) or issue.get("pull_request"):
                        continue
                    issue_number = issue.get("number")
                    title = (issue.get("title") or "").strip()
                    body = (issue.get("body") or "").strip()
                    if not issue_number or not title:
                        continue
                    embedding = await _embed_issue(f"Issue #{issue_number}: {title}\n\n{body}")
                    if embedding is None:
                        continue
                    try:
                        await conn.execute(
                            upsert_sql,
                            {
                                "repo_id": repo_id,
                                "issue_number": int(issue_number),
                                "title": title,
                                "body": body,
                                "embedding": embedding,
                            },
                        )
                    except Exception:
                        logger.exception("Failed upserting issue", extra={"repo": repo_slug, "issue": issue_number})
                        continue
                    synced_count += 1
                await conn.commit()

    urls = settings.external_doc_urls_list
    if urls:
        upsert_doc = text(
            """
            INSERT INTO external_docs_cache (url, content, fetched_at)
            VALUES (:url, :content, NOW())
            ON CONFLICT (url) DO UPDATE SET content = EXCLUDED.content, fetched_at = NOW()
            """
        )
        async with engine.connect() as conn:
            for url in urls:
                try:
                    content = await _fetch_external_doc(url)
                    await conn.execute(upsert_doc, {"url": url, "content": content[:200000]})
                    docs_count += 1
                except Exception:
                    logger.exception("Failed external docs sync", extra={"url": url})
            await conn.commit()

    logger.info("Sync completed", extra={"issues": synced_count, "docs": docs_count})
    return {"issues_synced": synced_count, "docs_synced": docs_count}
