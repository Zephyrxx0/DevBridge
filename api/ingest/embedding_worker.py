"""
Embedding Worker

Processes asynchronous embedding jobs by calling Vertex AI and 
upserting vectors into the database.
"""

import logging
import json
import asyncio
import base64
import os
from typing import Dict, Any, List, Optional

from api.db.vector_store import vector_db
from api.ingestion.types import EmbeddingJob
from api.db.session import init_db_pool, engine
from api.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BatchProcessor:
    """
    Collects EmbeddingJobs and processes them in batches for efficiency.
    Implements timer-based (5s) and size-based (50 items) flushes.
    """
    def __init__(self, batch_size: int = 50, flush_interval: float = 5.0):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.queue = asyncio.Queue()
        self._loop_task = None
        self._pending_futures: Dict[str, asyncio.Future] = {}

    def _start_if_needed(self):
        if self._loop_task is None or self._loop_task.done():
            self._loop_task = asyncio.create_task(self._run_loop())

    async def add_job(self, job: EmbeddingJob) -> bool:
        """Add a job to the batch and wait for its completion."""
        self._start_if_needed()
        
        # Create a future to track this specific job's completion
        future = asyncio.get_running_loop().create_future()
        self._pending_futures[job.chunk_id] = future
        
        await self.queue.put(job)
        return await future

    async def _run_loop(self):
        """Background loop to process batches."""
        logger.info("Starting BatchProcessor loop")
        while True:
            batch: List[EmbeddingJob] = []
            try:
                # Wait for the first job in the batch
                try:
                    job = await asyncio.wait_for(self.queue.get(), timeout=self.flush_interval)
                    batch.append(job)
                except asyncio.TimeoutError:
                    # Nothing in queue, just continue waiting
                    continue

                # Collect more jobs up to batch_size
                while len(batch) < self.batch_size and not self.queue.empty():
                    batch.append(self.queue.get_nowait())

                if batch:
                    await self._process_batch(batch)

            except Exception as e:
                logger.exception("Unexpected error in BatchProcessor loop: %s", e)
                # Fail any futures in the batch that weren't handled
                for job in batch:
                    if job.chunk_id in self._pending_futures and not self._pending_futures[job.chunk_id].done():
                        self._pending_futures[job.chunk_id].set_result(False)

    async def _process_batch(self, batch: List[EmbeddingJob]):
        """Processes a batch of jobs with fallback to individual processing."""
        chunk_ids = [job.chunk_id for job in batch]
        contents = [job.content for job in batch]
        
        logger.info("Processing batch of %d embedding jobs", len(batch))
        
        try:
            # 1. Initialize vector store if needed
            if not vector_db._vectorstore:
                if not vector_db.initialize():
                    raise RuntimeError("Failed to initialize vector store")

            # 2. Batch generate embeddings
            # VertexAIEmbeddings.aembed_documents is the async batch method
            embeddings = await vector_db._vectorstore.embedding_service.aembed_documents(contents)
            
            # 3. Batch upsert to database
            upsert_items = [
                {"chunk_id": cid, "embedding": emb}
                for cid, emb in zip(chunk_ids, embeddings)
            ]
            await vector_db.upsert_vectors_batch(upsert_items)
            
            # Mark all jobs in batch as successful
            for cid in chunk_ids:
                future = self._pending_futures.pop(cid, None)
                if future and not future.done():
                    future.set_result(True)
            
            logger.info("Successfully processed batch of %d", len(batch))

        except Exception as e:
            logger.warning("Batch processing failed, falling back to individual retries: %s", e)
            # T3: Resilient partial success fallback
            for job in batch:
                success = await process_embedding_job_individual(job)
                future = self._pending_futures.pop(job.chunk_id, None)
                if future and not future.done():
                    future.set_result(success)

# Global processor instance
processor = BatchProcessor(
    batch_size=int(os.environ.get("BATCH_SIZE", "50")),
    flush_interval=float(os.environ.get("FLUSH_INTERVAL", "5.0"))
)

async def process_embedding_job_individual(job: EmbeddingJob) -> bool:
    """
    Process a single embedding job (used as fallback).
    """
    # T-05-06: Payload size check
    if len(job.content) > 1_000_000:
        logger.error("Job %s content too large: %d chars", job.chunk_id, len(job.content))
        return True
    
    try:
        if not vector_db._vectorstore:
            if not vector_db.initialize():
                return False
        
        embedding = await asyncio.to_thread(
            vector_db._vectorstore.embedding_service.embed_query, 
            job.content
        )
        
        await vector_db.upsert_vector(job.chunk_id, embedding)
        return True
        
    except Exception as e:
        logger.error("Error processing individual embedding job %s: %s", job.chunk_id, e)
        return False

async def handle_worker_event(event: Dict[str, Any]) -> bool:
    """
    Entry point for worker event. Now uses BatchProcessor for efficiency.
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
            
        # Use BatchProcessor
        success = await processor.add_job(job)
        return success
        
    except Exception as e:
        logger.exception("Failed to handle worker event: %s", e)
        return False

if __name__ == "__main__":
    # For local testing or Cloud Run job invocation
    event_data = os.environ.get("PUBSUB_EVENT_DATA", "{}")
    try:
        event = json.loads(event_data)
        asyncio.run(handle_worker_event(event))
    except Exception:
        logger.exception("Worker failed to start")
