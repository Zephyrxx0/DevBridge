"""
Pub/Sub Triggered Ingestion Handler

This module handles Pub/Sub messages from GCS bucket notifications,
downloads code snapshots from GCS, invokes chunking, and persists to database.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

from google.cloud import storage
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from api.core.config import settings
from api.db.session import get_engine, init_db_pool
from api.ingest.embedding_queue import enqueue_embedding_jobs
from api.ingestion.tree_sitter_chunker import chunk_source
from api.ingestion.types import EmbeddingJob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _parse_repo_path(object_name: str) -> tuple[str, str]:
    """Parse GCS object name into repo and file path.
    
    Format: owner/repo/path/to/file (e.g., 'google/gemini/src/main.py')
    Returns: (repo: owner/repo, file_path: path/to/file)
    """
    parts = object_name.split("/", 2)
    if len(parts) >= 2:
        # First two parts form the repo (owner/repo)
        repo = f"{parts[0]}/{parts[1]}"
        # Remaining parts form the file path
        file_path = parts[2] if len(parts) > 2 else ""
        return repo, file_path
    # Default for objects without proper structure
    return "default", object_name


@dataclass
class IngestionResult:
    """Result of an ingestion operation."""
    status: str  # "success", "error", "skipped"
    file_path: str
    bucket: str
    chunk_count: int
    error: Optional[str] = None


def _parse_pubsub_message(message_data: dict) -> dict[str, Any]:
    """Parse GCS event from Pub/Sub message payload."""
    # Payload format is JSON, parse the notification payload
    payload = message_data.get("message", {})
    
    # Extract bucket and object from attributes
    attributes = payload.get("attributes", {})
    bucket = attributes.get("bucketId", "")
    object_name = attributes.get("objectId", "")
    
    # Also check data field (base64 encoded)
    data = payload.get("data", "")
    if data:
        try:
            import base64
            decoded = json.loads(base64.b64decode(data).decode("utf-8"))
            bucket = bucket or decoded.get("bucket", "")
            object_name = object_name or decoded.get("object", "")
        except Exception:
            pass
    
    return {
        "bucket": bucket,
        "object": object_name,
    }


async def _download_from_gcs(bucket_name: str, object_name: str) -> str:
    """Download file content from GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    
    content = await asyncio.to_thread(blob.download_as_text)
    return content


async def _ingest_file(bucket: str, object_name: str, job_id: str = None) -> IngestionResult:
    """Ingest a single file from GCS.
    
    Args:
        bucket: GCS bucket name
        object_name: GCS object name (format: owner/repo/path/to/file)
        job_id: Optional ingestion_jobs record ID for tracking
    """
    # Parse the file path - D-01, D-02 from Phase 12 Context
    repo, file_path = _parse_repo_path(object_name)
    
    # Ensure GCP project context per D-07
    gcp_project = os.environ.get("GOOGLE_CLOUD_PROJECT") or settings.google_cloud_project
    if gcp_project:
        logger.info(f"Processing ingestion for GCP project: {gcp_project}")
    
    # Get database session
    from api.db.session import engine
    if engine is None:
        conn_str = settings.supabase_connection_string
        if not conn_str:
            return IngestionResult(
                status="error",
                file_path=file_path,
                bucket=bucket,
                chunk_count=0,
                error="Database not configured",
            )
        await init_db_pool(conn_str)
    
    try:
        # Update ingestion_jobs status to 'processing' at start - D-05
        if job_id:
            async with engine.connect() as conn:
                await conn.execute(text("""
                    UPDATE ingestion_jobs 
                    SET status = 'processing', updated_at = NOW()
                    WHERE id = :job_id
                """), {"job_id": job_id})
                await conn.commit()
        
        # Download content
        content = await _download_from_gcs(bucket, object_name)
        
        # Parse and chunk
        chunks = chunk_source(repo=repo, file_path=file_path, source=content)
        
        # Get a connection to execute raw SQL for chunk persistence
        async with engine.connect() as conn:
            # Check for existing chunks (idempotency)
            query = text("""
                SELECT id FROM code_chunks 
                WHERE repo = :repo AND file_path = :file_path 
                LIMIT 1
            """)
            result = await conn.execute(query, {"repo": repo, "file_path": file_path})
            
            if result.fetchone():
                logger.info("Chunks already exist for %s, skipping", file_path)
                return IngestionResult(
                    status="skipped",
                    file_path=file_path,
                    bucket=bucket,
                    chunk_count=0,
                )
            
            # Insert chunks using raw SQL (compatible with existing schema)
            for chunk in chunks:
                insert = text("""
                    INSERT INTO code_chunks (
                        repo, file_path, language, symbol_name, symbol_kind,
                        start_line, end_line, chunk_type, content_hash, chunk_id,
                        parse_status, error_type, error_message, content
                    ) VALUES (
                        :repo, :file_path, :language, :symbol_name, :symbol_kind,
                        :start_line, :end_line, :chunk_type, :content_hash, :chunk_id,
                        :parse_status, :error_type, :error_message, :content
                    )
                """)
                await conn.execute(insert, {
                    "repo": chunk.repo,
                    "file_path": chunk.file_path,
                    "language": chunk.language,
                    "symbol_name": chunk.symbol_name,
                    "symbol_kind": chunk.symbol_kind,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "chunk_type": chunk.chunk_type,
                    "content_hash": chunk.content_hash,
                    "chunk_id": chunk.chunk_id,
                    "parse_status": chunk.parse_status,
                    "error_type": chunk.error_type,
                    "error_message": chunk.error_message,
                    "content": chunk.content,
                })
            
            await conn.commit()
            
            # 5. Enqueue embedding jobs (Phase 05 Wave 2)
            embedding_jobs = [
                EmbeddingJob(
                    repo=chunk.repo,
                    file_path=chunk.file_path,
                    chunk_id=chunk.chunk_id,
                    content=chunk.content,
                    idempotency_key=f"embed-{chunk.chunk_id}"
                )
                for chunk in chunks
            ]
            
            # Fire-and-forget enqueueing, don't block ingestion success on queue transport
            # although in current implementation it is awaited.
            try:
                await enqueue_embedding_jobs(embedding_jobs)
            except Exception as e:
                logger.error("Failed to enqueue embedding jobs: %s", e)
                # We don't fail the ingestion if enqueuing fails, 
                # as chunks are already persisted. A separate process could retry.
            
            # Update ingestion_jobs status on success - D-05
            if job_id and engine:
                async with engine.connect() as conn:
                    await conn.execute(text("""
                        UPDATE ingestion_jobs 
                        SET status = 'success', chunk_count = :chunk_count, updated_at = NOW()
                        WHERE id = :job_id
                    """), {"job_id": job_id, "chunk_count": len(chunks)})
                    await conn.commit()
            
            return IngestionResult(
                status="success",
                file_path=file_path,
                bucket=bucket,
                chunk_count=len(chunks),
            )
        
    except Exception as e:
        logger.exception("Failed to ingest %s from %s", object_name, bucket)
        
        # Update ingestion_jobs status on error - D-05
        if job_id and engine:
            try:
                async with engine.connect() as conn:
                    await conn.execute(text("""
                        UPDATE ingestion_jobs 
                        SET status = 'error', error_message = :error, updated_at = NOW()
                        WHERE id = :job_id
                    """), {"job_id": job_id, "error": str(e)})
                    await conn.commit()
            except Exception:
                pass  # Don't fail on tracking update failure
        
        return IngestionResult(
            status="error",
            file_path=file_path,
            bucket=bucket,
            chunk_count=0,
            error=str(e),
        )


async def handle_pubsub_event(event: dict) -> dict:
    """
    Handle a Pub/Sub message event.
    
    Args:
        event: Pub/Sub message event dict with message data
        
    Returns:
        Result dict with status, file_path, bucket, chunk_count, error fields
    """
    # Parse the event
    message = event.get("message", {})
    if isinstance(message, str):
        try:
            message = json.loads(message)
        except json.JSONDecodeError:
            message = {}
    
    # Try parsing full event first
    gcs_event = _parse_pubsub_message(event)
    
    bucket = gcs_event.get("bucket", "")
    object_name = gcs_event.get("object", "")
    
    # Fallback to data payload if not found in attributes
    if not bucket or not object_name:
        data = message.get("data", {})
        if isinstance(data, str):
            try:
                import base64
                decoded = json.loads(base64.b64decode(data).decode("utf-8"))
                data = decoded
            except Exception:
                data = {}
        
        gcs_event = _parse_pubsub_message({"message": data})
        bucket = bucket or gcs_event.get("bucket", "")
        object_name = object_name or gcs_event.get("object", "")
    
    if not bucket or not object_name:
        return {
            "status": "skipped",
            "file_path": "",
            "bucket": "",
            "chunk_count": 0,
            "error": "Missing bucket or object",
        }
    
    # Parse repo path - D-01, D-02
    repo, file_path = _parse_repo_path(object_name)
    
    # D-05: Insert ingestion_jobs record at start
    job_id = None
    from api.db.session import engine
    try:
        if engine:
            from uuid import uuid4
            job_id = str(uuid4())
            async with engine.connect() as conn:
                await conn.execute(text("""
                    INSERT INTO ingestion_jobs (id, repo, file_path, status, created_at, updated_at)
                    VALUES (:job_id, :repo, :file_path, 'pending', NOW(), NOW())
                """), {"job_id": job_id, "repo": repo, "file_path": file_path})
                await conn.commit()
    except Exception as e:
        logger.warning(f"Failed to create ingestion job record: {e}")
    
    result = await _ingest_file(bucket, object_name, job_id=job_id)
    
    return {
        "status": result.status,
        "file_path": result.file_path,
        "bucket": result.bucket,
        "chunk_count": result.chunk_count,
        "error": result.error,
    }


async def main():
    """Entry point for Cloud Run Job."""
    # Get event from environment
    event_data = os.environ.get("PUBSUB_EVENT_DATA", "{}")
    
    try:
        event = json.loads(event_data)
    except json.JSONDecodeError:
        event = {"message": {}}
    
    result = await handle_pubsub_event(event)
    
    logger.info("Ingestion result: %s", result)


if __name__ == "__main__":
    asyncio.run(main())