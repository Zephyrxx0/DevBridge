from __future__ import annotations

import asyncio
import base64
import json
import uuid
from typing import Any
from urllib import request

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import text

from api.core.secrets import get_github_token
from api.db.session import get_engine
from api.core.config import settings

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["repo"])


async def _resolve_repo(conn: Any, repo_id: str) -> dict[str, Any]:
    """Resolve repo_id (ID or Name) to repository metadata. Raises 404 if not found."""
    query = text(
        """
        SELECT id, name, github_url
        FROM repositories
        WHERE CAST(id AS text) = :rid OR name = :rid
        LIMIT 1
        """
    )
    res = await conn.execute(query, {"rid": repo_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found")
    return dict(row._mapping)


def _repo_from_github_url(url: str | None) -> str | None:
    if not url:
        return None
    clean = url.strip().rstrip("/")
    marker = "github.com/"
    if marker not in clean:
        return None
    tail = clean.split(marker, 1)[1]
    parts = [p for p in tail.split("/") if p]
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1]}"


async def _github_get_json(url: str, token: str | None = None) -> Any:
    def _request() -> Any:
        req = request.Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    return await asyncio.to_thread(_request)


def _insert_tree_path(root: dict[str, Any], file_path: str) -> None:
    parts = [p for p in file_path.split("/") if p]
    node = root
    for idx, part in enumerate(parts):
        is_last = idx == len(parts) - 1
        children = node.setdefault("children", {})
        if part not in children:
            path = "/".join(parts[: idx + 1])
            children[part] = {
                "name": part,
                "path": path,
                "type": "file" if is_last else "directory",
                "children": {},
            }
        node = children[part]


def _materialize_tree(node: dict[str, Any]) -> dict[str, Any]:
    children_map = node.get("children", {})
    if not children_map:
        node.pop("children", None)
        return node
    children = [_materialize_tree(child) for child in children_map.values()]
    children.sort(key=lambda item: (item["type"] == "file", item["name"]))
    node["children"] = children
    return node


@router.get("/repo/")
async def list_repositories():
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        SELECT id, name, github_url, created_at
        FROM repositories
        ORDER BY created_at DESC
        """
    )
    try:
        async with engine.connect() as conn:
            result = await conn.execute(query)
            return [dict(row._mapping) for row in result.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Repository listing unavailable: {exc}")


@router.get("/repo/{repo_id}")
async def get_repository(repo_id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]

            query = text(
                """
                SELECT r.id, r.name, r.github_url, r.created_at,
                       COALESCE(files.file_count, 0) AS file_count,
                       COALESCE(anns.annotation_count, 0) AS annotation_count,
                       (
                           SELECT MAX(updated_at)
                           FROM ingestion_jobs
                           WHERE repo IN (r.name, CAST(r.id AS text)) AND status = 'success'
                       ) AS last_indexed
                FROM repositories r
                LEFT JOIN (
                    SELECT repo, COUNT(DISTINCT file_path) AS file_count
                    FROM code_chunks
                    GROUP BY repo
                ) files ON files.repo = r.name
                LEFT JOIN (
                    SELECT repo_id, COUNT(*) AS annotation_count
                    FROM annotations
                    GROUP BY repo_id
                ) anns ON anns.repo_id = r.id
                WHERE r.id = :actual_id
                LIMIT 1
                """
            )
            result = await conn.execute(query, {"actual_id": actual_id})
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Repository not found")
            return dict(row._mapping)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Repository detail unavailable: {exc}")


@router.get("/repo/{repo_id}/branches")
async def list_repository_branches(repo_id: str):
    """Return list of branches from GitHub for this repository."""
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            repo_slug = _repo_from_github_url(repo.get("github_url")) or repo.get("name")
            if not repo_slug:
                raise HTTPException(status_code=422, detail="Cannot derive GitHub slug from repository")
            token = await get_github_token()
            payload = await _github_get_json(
                f"https://api.github.com/repos/{repo_slug}/branches?per_page=100",
                token,
            )
            if not isinstance(payload, list):
                raise HTTPException(status_code=502, detail="Unexpected GitHub response")
            return [{"name": b["name"], "sha": b["commit"]["sha"]} for b in payload if isinstance(b, dict) and "name" in b]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Branch listing unavailable: {exc}")


@router.get("/repo/{repo_id}/files")
async def list_repository_files(repo_id: str, branch: str | None = None, fresh: bool = False):
    """Return file tree.
    - No branch param → code_chunks (indexed) first, then GitHub fallback.
    - Branch param set  → always GitHub (code_chunks are not branch-aware).
    Caches each (repo, branch) key for 2 hours.
    """
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    branch_key = branch or ""

    try:
        async with engine.connect() as conn:
            # ── 1. Cache hit (skip on fresh=true) ─────────────────────────
            if not fresh:
                cache_row = (await conn.execute(
                    text("""
                        SELECT file_tree
                        FROM repo_file_cache
                        WHERE repo_id = (SELECT id FROM repositories WHERE CAST(id AS text) = :repo_id OR name = :repo_id LIMIT 1)
                          AND branch = :branch
                          AND cached_at > now() - INTERVAL '24 hours'
                        LIMIT 1
                    """),
                    {"repo_id": repo_id, "branch": branch_key},
                )).fetchone()
                if cache_row:
                    return cache_row._mapping["file_tree"]

            root: dict[str, Any] = {"name": "root", "path": "", "type": "directory", "children": {}}

            # Resolve actual repo metadata once
            repo_meta = await _resolve_repo(conn, repo_id)
            actual_id = repo_meta["id"]
            repo_name = repo_meta["name"]
            repo_url = repo_meta["github_url"]

            # ── 2. Default branch: try code_chunks first (fast) ─────────────
            if not branch:
                rows = (await conn.execute(
                    text("""
                        SELECT cc.file_path
                        FROM code_chunks cc
                        WHERE (cc.repo = :repo_name OR cc.repo = CAST(:actual_id AS text))
                        GROUP BY cc.file_path
                        ORDER BY cc.file_path
                    """),
                    {"actual_id": actual_id, "repo_name": repo_name},
                )).fetchall()

                valid_paths = [
                    row._mapping["file_path"].strip()
                    for row in rows
                    if isinstance(row._mapping.get("file_path"), str) and row._mapping["file_path"].strip()
                ]

                if valid_paths:
                    for file_path in valid_paths:
                        _insert_tree_path(root, file_path)
                    tree = _materialize_tree(root)
                    await _cache_file_tree(conn, actual_id, branch_key, tree)
                    return tree

            # ── 3. GitHub API (always for branch requests, fallback otherwise) ──
            repo_slug = _repo_from_github_url(repo_url) or repo_name
            token = await get_github_token()
            if not repo_slug:
                return _materialize_tree(root)

            # Resolve ref: use given branch, or discover default branch
            ref = branch or None
            if not ref:
                try:
                    repo_payload = await _github_get_json(f"https://api.github.com/repos/{repo_slug}", token)
                    ref = repo_payload.get("default_branch", "main") if isinstance(repo_payload, dict) else "main"
                except Exception:
                    ref = "HEAD"

            tree_payload: Any = {}
            try:
                tree_payload = await _github_get_json(
                    f"https://api.github.com/repos/{repo_slug}/git/trees/{ref}?recursive=1",
                    token,
                )
            except Exception:
                # HEAD might not exist if ref is wrong — try main/master
                if not branch:
                    for fallback_ref in ("main", "master"):
                        try:
                            tree_payload = await _github_get_json(
                                f"https://api.github.com/repos/{repo_slug}/git/trees/{fallback_ref}?recursive=1",
                                token,
                            )
                            if tree_payload.get("tree"):
                                break
                        except Exception:
                            continue

            tree_nodes = tree_payload.get("tree", []) if isinstance(tree_payload, dict) else []

            for node in tree_nodes:
                if node.get("type") != "blob":
                    continue
                file_path = node.get("path")
                if isinstance(file_path, str) and file_path:
                    _insert_tree_path(root, file_path)

            tree = _materialize_tree(root)
            if tree_nodes:
                await _cache_file_tree(conn, actual_id, branch_key, tree)
            return tree
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Repository files unavailable: {exc}")


@router.get("/repo/{repo_id}/index-status")
async def get_index_status(repo_id: str):
    """Return whether this repo has indexed code chunks and the last job status."""
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            repo_name = repo["name"]

            chunk_row = (await conn.execute(
                text("""
                    SELECT COUNT(*) as cnt
                    FROM code_chunks cc
                    WHERE (cc.repo = :repo_name OR cc.repo = CAST(:actual_id AS text))
                """),
                {"actual_id": actual_id, "repo_name": repo_name},
            )).fetchone()
            chunk_count = chunk_row._mapping["cnt"] if chunk_row else 0

            job_row = (await conn.execute(
                text("""
                    SELECT status, file_path, chunk_count, error_message, updated_at
                    FROM ingestion_jobs
                    WHERE repo = :repo_name OR repo = CAST(:actual_id AS text)
                    ORDER BY updated_at DESC
                    LIMIT 1
                """),
                {"actual_id": actual_id, "repo_name": repo_name},
            )).fetchone()

            job = dict(job_row._mapping) if job_row else None

        return {
            "indexed": chunk_count > 0,
            "chunk_count": chunk_count,
            "last_job": job,
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Index status unavailable: {exc}")


async def _cache_file_tree(conn: Any, repo_id: str, branch: str, tree: dict[str, Any]) -> None:
    """Upsert file tree into cache table. Swallows errors — cache is best-effort."""
    try:
        import json as _json
        await conn.execute(
            text("""
                INSERT INTO repo_file_cache (repo_id, branch, file_tree, cached_at)
                VALUES (CAST(:repo_id AS uuid), :branch, CAST(:tree AS jsonb), now())
                ON CONFLICT (repo_id, branch)
                DO UPDATE SET file_tree = CAST(EXCLUDED.file_tree AS jsonb), cached_at = now()
            """),
            {"repo_id": repo_id, "branch": branch, "tree": _json.dumps(tree)},
        )
        await conn.commit()
    except Exception as exc:
        logger.debug(f"File tree cache write failed (non-fatal): {exc}")


@router.delete("/repo/{repo_id}/file-cache")
async def invalidate_file_cache(repo_id: str, branch: str | None = None):
    """Bust the file tree cache for this repo (all branches or specific branch)."""
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
    try:
        async with engine.begin() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            if branch:
                await conn.execute(
                    text("DELETE FROM repo_file_cache WHERE repo_id = :actual_id AND branch = :branch"),
                    {"actual_id": actual_id, "branch": branch},
                )
            else:
                await conn.execute(
                    text("DELETE FROM repo_file_cache WHERE repo_id = :actual_id"),
                    {"actual_id": actual_id},
                )
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Cache invalidation failed: {exc}")


@router.get("/repo/{repo_id}/files/{file_path:path}")
async def get_repository_file(repo_id: str, file_path: str, branch: str | None = None):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    content_query = text(
        """
        SELECT cc.content, cc.language
        FROM code_chunks cc
        WHERE (cc.repo = :repo_name OR cc.repo = CAST(:actual_id AS text))
          AND cc.file_path = :file_path
        ORDER BY CASE WHEN cc.chunk_type = 'file' THEN 1 ELSE 0 END DESC, cc.start_line ASC
        LIMIT 1
        """
    )
    annotation_query = text(
        """
        SELECT id,
               COALESCE(start_line, end_line, 1) AS line,
               comment,
               author_id::text AS author,
               tags,
               upvotes,
               created_at
        FROM annotations
        WHERE repo_id = :actual_id
          AND file_path = :file_path
        ORDER BY COALESCE(start_line, end_line, 1), created_at DESC
        """
    )

    repo_slug = None
    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            repo_name = repo["name"]
            repo_url = repo["github_url"]

            # If a specific branch is requested, we skip code_chunks completely
            # since code_chunks only reflects the default indexed branch.
            row = None
            if not branch:
                content_result = await conn.execute(content_query, {"actual_id": actual_id, "repo_name": repo_name, "file_path": file_path})
                row = content_result.fetchone()
                
            repo_slug = _repo_from_github_url(repo_url) or repo_name

            if not row:
                # Fallback: load raw file from GitHub.
                token = await get_github_token()
                if repo_slug:
                    from urllib.parse import quote as _quote
                    encoded_path = _quote(file_path, safe="/")
                    ref_param = f"?ref={branch}" if branch else "?ref=HEAD"
                    content_url = f"https://api.github.com/repos/{repo_slug}/contents/{encoded_path}{ref_param}"
                    
                    try:
                        gh_payload = await _github_get_json(content_url, token)
                        raw = gh_payload.get("content", "")
                        decoded = base64.b64decode(raw).decode("utf-8", errors="replace") if raw else ""
                        return {
                            "content": decoded,
                            "language": file_path.rsplit(".", 1)[-1] if "." in file_path else "text",
                            "line_count": len(decoded.splitlines()) if decoded else 0,
                            "annotations": [],
                        }
                    except Exception as e:
                        # If GitHub request fails (e.g. 404), return a graceful 404
                        raise HTTPException(status_code=404, detail="File not found on GitHub")
                raise HTTPException(status_code=404, detail="File not found")
            
            annotation_result = await conn.execute(annotation_query, {"actual_id": actual_id, "file_path": file_path})
            annotations = [dict(r._mapping) for r in annotation_result.fetchall()]
    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=503, detail=f"Repository file unavailable: {exc}\n{tb}")

    content = row._mapping.get("content") or ""
    return {
        "content": content,
        "language": row._mapping.get("language") or "text",
        "line_count": len(content.splitlines()) if content else 0,
        "annotations": annotations,
    }


@router.get("/repo/{repo_id}/pr")
async def list_repository_prs(repo_id: str, limit: int = 25):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        SELECT pr.repo, pr.number, pr.title, pr.summary, pr.author, pr.merged_at, pr.created_at
        FROM pull_requests pr
        JOIN repositories r ON (r.name = pr.repo OR CAST(r.id AS text) = pr.repo)
        WHERE r.id = :actual_id
        ORDER BY pr.merged_at DESC NULLS LAST, pr.created_at DESC
        LIMIT :limit
        """
    )
    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            result = await conn.execute(query, {"actual_id": actual_id, "limit": max(1, min(limit, 100))})
            return [dict(row._mapping) for row in result.fetchall()]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Repository PR history unavailable: {exc}")


@router.get("/repo/{repo_id}/ingestion/jobs")
async def list_ingestion_jobs(repo_id: str, limit: int = 30):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        SELECT ij.id, ij.repo, ij.file_path, ij.status, ij.chunk_count, ij.error_message, ij.created_at, ij.updated_at
        FROM ingestion_jobs ij
        JOIN repositories r ON (r.name = ij.repo OR CAST(r.id AS text) = ij.repo)
        WHERE r.id = :actual_id
        ORDER BY ij.updated_at DESC
        LIMIT :limit
        """
    )
    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            result = await conn.execute(query, {"actual_id": actual_id, "limit": max(1, min(limit, 100))})
            return [dict(row._mapping) for row in result.fetchall()]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Ingestion job status unavailable: {exc}")


@router.post("/repo/{repo_id}/trigger-index")
async def trigger_repository_index(repo_id: str, background_tasks: BackgroundTasks):
    """Trigger GitHub file ingestion into code_chunks. Returns immediately; work runs in background."""
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    try:
        async with engine.connect() as conn:
            repo = await _resolve_repo(conn, repo_id)
            actual_id = repo["id"]
            repo_name = repo["name"]
            repo_url = repo["github_url"]

            repo_slug = _repo_from_github_url(repo_url) or repo_name
            if not repo_slug:
                raise HTTPException(status_code=400, detail="Repository has no GitHub URL configured")

            job_id = str(uuid.uuid4())
            await conn.execute(
                text("""
                    INSERT INTO ingestion_jobs (id, repo, file_path, status, chunk_count)
                    VALUES (CAST(:job_id AS uuid), :repo, 'pending', 'pending', 0)
                """),
                {"job_id": job_id, "repo": repo_slug},
            )
            await conn.commit()

            background_tasks.add_task(_run_ingestion, engine, job_id, str(actual_id), repo_slug)

            return {
                "status": "indexing_started",
                "message": f"Indexing triggered for {repo_slug}",
                "job_id": job_id,
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to trigger indexing for {repo_id}")
        raise HTTPException(status_code=503, detail=f"Failed to trigger indexing: {exc}")


async def _run_ingestion(engine, job_id: str, repo_id: str, repo_slug: str):
    """Background task: fetch files from GitHub and insert into code_chunks."""
    token = await get_github_token()
    logger.info(f"Ingestion {job_id}: starting for {repo_slug} (token={'yes' if token else 'NO'})")

    try:
        # Update job to processing
        async with engine.connect() as conn:
            await conn.execute(
                text("UPDATE ingestion_jobs SET status = 'processing', updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                {"job_id": job_id},
            )
            await conn.commit()

        # Fetch tree
        try:
            tree_payload = await _github_get_json(
                f"https://api.github.com/repos/{repo_slug}/git/trees/HEAD?recursive=1",
                token or None,
            )
        except Exception:
            try:
                repo_info = await _github_get_json(f"https://api.github.com/repos/{repo_slug}", token or None)
                branch = repo_info.get("default_branch", "main") if isinstance(repo_info, dict) else "main"
                tree_payload = await _github_get_json(
                    f"https://api.github.com/repos/{repo_slug}/git/trees/{branch}?recursive=1",
                    token or None,
                )
            except Exception as e:
                logger.error(f"Ingestion {job_id}: GitHub tree fetch failed: {e}")
                async with engine.connect() as conn:
                    await conn.execute(
                        text("UPDATE ingestion_jobs SET status = 'error', error_message = :err, updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                        {"job_id": job_id, "err": str(e)},
                    )
                    await conn.commit()
                return

        tree_nodes = tree_payload.get("tree", []) if isinstance(tree_payload, dict) else []
        code_extensions = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".css", ".html", ".json", ".md", ".sql", ".sh", ".yaml", ".yml", ".toml")
        blob_files = [
            n.get("path")
            for n in tree_nodes
            if n.get("type") == "blob"
            and isinstance(n.get("path"), str)
            and any(n["path"].endswith(ext) for ext in code_extensions)
        ]

        # Cap at 200 files
        blob_files = blob_files[:200]

        if not blob_files:
            async with engine.connect() as conn:
                await conn.execute(
                    text("UPDATE ingestion_jobs SET status = 'error', error_message = 'No indexable files found', file_path = '0 files', updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                    {"job_id": job_id},
                )
                await conn.commit()
            return

        # Update job with file count
        async with engine.connect() as conn:
            await conn.execute(
                text("UPDATE ingestion_jobs SET file_path = :fp, chunk_count = 0, updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                {"job_id": job_id, "fp": f"0/{len(blob_files)} files"},
            )
            await conn.commit()

        # Clear old chunks for this repo
        async with engine.connect() as conn:
            await conn.execute(
                text("DELETE FROM code_chunks WHERE repo = :repo"),
                {"repo": repo_slug},
            )
            await conn.commit()

        # Fetch and insert in batches
        inserted = 0
        errors = 0
        BATCH = 10
        for i in range(0, len(blob_files), BATCH):
            batch = blob_files[i:i + BATCH]
            results = await asyncio.gather(
                *[_fetch_github_file(repo_slug, fp, token) for fp in batch],
                return_exceptions=True,
            )

            rows_to_insert = []
            for fp, result in zip(batch, results):
                if isinstance(result, Exception) or result is None:
                    errors += 1
                    continue
                ext = fp.rsplit(".", 1)[-1] if "." in fp else "text"
                rows_to_insert.append({
                    "id": str(uuid.uuid4()),
                    "repo": repo_slug,
                    "file_path": fp,
                    "language": ext,
                    "chunk_type": "file",
                    "content": result,
                    "start_line": 1,
                    "end_line": len(result.splitlines()),
                })

            if rows_to_insert:
                async with engine.connect() as conn:
                    await conn.execute(
                        text("""
                            INSERT INTO code_chunks (id, repo, file_path, language, chunk_type, content, start_line, end_line)
                            VALUES (CAST(:id AS uuid), :repo, :file_path, :language, :chunk_type, :content, :start_line, :end_line)
                        """),
                        rows_to_insert,
                    )
                    await conn.commit()
                inserted += len(rows_to_insert)

            # Update progress
            async with engine.connect() as conn:
                await conn.execute(
                    text("UPDATE ingestion_jobs SET chunk_count = :cnt, file_path = :fp, updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                    {"job_id": job_id, "cnt": inserted, "fp": f"{min(i + BATCH, len(blob_files))}/{len(blob_files)} files"},
                )
                await conn.commit()

        # Mark complete
        async with engine.connect() as conn:
            await conn.execute(
                text("UPDATE ingestion_jobs SET status = 'success', chunk_count = :cnt, file_path = :fp, error_message = :err, updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                {
                    "job_id": job_id,
                    "cnt": inserted,
                    "fp": f"{inserted}/{len(blob_files)} files",
                    "err": f"{errors} files failed" if errors else None,
                },
            )
            await conn.commit()

        # Bust file tree cache so next load re-builds from fresh code_chunks
        try:
            async with engine.connect() as conn:
                await conn.execute(
                    text("DELETE FROM repo_file_cache WHERE repo_id = CAST(:repo_id AS uuid)"),
                    {"repo_id": repo_id},
                )
                await conn.commit()
        except Exception as cache_err:
            logger.debug(f"Cache bust after ingestion failed (non-fatal): {cache_err}")

        logger.info(f"Ingestion {job_id}: done. {inserted} inserted, {errors} errors.")

    except Exception as exc:
        logger.exception(f"Ingestion {job_id}: fatal error")
        try:
            async with engine.connect() as conn:
                await conn.execute(
                    text("UPDATE ingestion_jobs SET status = 'error', error_message = :err, updated_at = now() WHERE id = CAST(:job_id AS uuid)"),
                    {"job_id": job_id, "err": str(exc)[:500]},
                )
                await conn.commit()
        except Exception:
            pass


async def _fetch_github_file(repo_slug: str, file_path: str, token: str | None) -> str | None:
    """Fetch a single file's content from GitHub Contents API."""
    try:
        from urllib.parse import quote
        encoded_path = quote(file_path, safe="/")
        url = f"https://api.github.com/repos/{repo_slug}/contents/{encoded_path}?ref=HEAD"
        payload = await _github_get_json(url, token)
        raw = payload.get("content", "") if isinstance(payload, dict) else ""
        if not raw:
            return None
        return base64.b64decode(raw).decode("utf-8", errors="replace")
    except Exception as e:
        logger.debug(f"Failed to fetch {file_path}: {e}")
        return None

