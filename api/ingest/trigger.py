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

from api.core.config import settings
from api.db.session import get_engine, init_db_pool
from api.ingestion.tree_sitter_chunker import chunk_source

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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


async def _ingest_file(bucket: str, object_name: str) -> IngestionResult:
    """Ingest a single file from GCS."""
    # Parse the file path
    file_path = object_name
    repo = "default"  # TODO: Extract repo from object path
    
    try:
        # Download content
        content = await _download_from_gcs(bucket, object_name)
        
        # Parse and chunk
        chunks = chunk_source(repo=repo, file_path=file_path, source=content)
        
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
            
            return IngestionResult(
                status="success",
                file_path=file_path,
                bucket=bucket,
                chunk_count=len(chunks),
            )
        
    except Exception as e:
        logger.exception("Failed to ingest %s from %s", object_name, bucket)
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
    
    data = message.get("data", {})
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            data = {}
    
    gcs_event = _parse_pubsub_message({"message": data})
    
    bucket = gcs_event.get("bucket", "")
    object_name = gcs_event.get("object", "")
    
    if not bucket or not object_name:
        return {
            "status": "skipped",
            "file_path": "",
            "bucket": "",
            "chunk_count": 0,
            "error": "Missing bucket or object",
        }
    
    result = await _ingest_file(bucket, object_name)
    
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