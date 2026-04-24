"""
Embedding Worker

Processes asynchronous embedding jobs by calling Vertex AI and 
upserting vectors into the database.
"""

import logging
import json
import asyncio
import base64
from typing import Dict, Any

from api.db.vector_store import vector_db
from api.ingestion.types import EmbeddingJob
from api.db.session import init_db_pool, engine
from api.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_embedding_job(job: EmbeddingJob) -> bool:
    """
    Process a single embedding job.
    
    Args:
        job: The EmbeddingJob to process.
        
    Returns:
        True if successful, False if it should be retried.
    """
    # T-05-06: Payload size check
    if len(job.content) > 1_000_000: # Hard limit for sanity
        logger.error("Job %s content too large: %d chars", job.chunk_id, len(job.content))
        return True # Don't retry if it's too large, it will likely always fail
    
    try:
        # Initialize vector store if needed (this also initializes VertexAI embeddings)
        if not vector_db._vectorstore:
            if not vector_db.initialize():
                logger.error("Failed to initialize vector store for job %s", job.chunk_id)
                return False
        
        # 1. Generate embedding
        # VertexAIEmbeddings.embed_query is usually synchronous in LangChain but we use to_thread
        # We use embed_query because it returns a List[float] which our upsert_vector expects
        embedding = await asyncio.to_thread(
            vector_db._vectorstore.embedding_service.embed_query, 
            job.content
        )
        
        # 2. Upsert vector
        await vector_db.upsert_vector(job.chunk_id, embedding)
        
        logger.info("Successfully processed embedding for chunk_id: %s", job.chunk_id)
        return True
        
    except Exception as e:
        logger.exception("Error processing embedding job %s (attempt %d/%d): %s", 
                         job.chunk_id, job.attempt, job.max_retries, e)
        return False

async def handle_worker_event(event: Dict[str, Any]) -> bool:
    """
    Entry point for worker event (e.g., from Pub/Sub or Cloud Tasks).
    """
    try:
        # Extract payload
        message = event.get("message", {})
        data = message.get("data", "")
        
        if not data:
            logger.warning("No data in worker event")
            return True
            
        decoded_bytes = base64.b64decode(data)
        decoded = json.loads(decoded_bytes.decode("utf-8"))
        
        # Reconstruct job
        job = EmbeddingJob(
            chunk_id=decoded.get("chunk_id"),
            repo=decoded.get("repo", "default"),
            file_path=decoded.get("file_path", "unknown"),
            content=decoded.get("content"),
            attempt=decoded.get("attempt", 1),
            max_retries=decoded.get("max_retries", 3),
            idempotency_key=decoded.get("idempotency_key")
        )
        
        if not job.chunk_id or not job.content:
            logger.error("Invalid job payload: missing chunk_id or content")
            return True
            
        # Ensure DB pool is initialized
        if engine is None:
            conn_str = settings.supabase_connection_string
            if not conn_str:
                logger.error("Database not configured for worker")
                return False
            await init_db_pool(conn_str)
            
        success = await process_embedding_job(job)
        return success
        
    except Exception as e:
        logger.exception("Failed to handle worker event: %s", e)
        return False

if __name__ == "__main__":
    # For local testing or Cloud Run job invocation
    import os
    event_data = os.environ.get("PUBSUB_EVENT_DATA", "{}")
    try:
        event = json.loads(event_data)
        asyncio.run(handle_worker_event(event))
    except Exception:
        logger.exception("Worker failed to start")
