import logging
import json
from typing import List
from api.ingestion.types import EmbeddingJob

logger = logging.getLogger(__name__)

async def enqueue_embedding_jobs(jobs: List[EmbeddingJob]) -> bool:
    """
    Enqueue embedding jobs for asynchronous processing.
    
    This is a transport-agnostic interface. In Phase 05 Wave 1, this acts
    as a contract verification point and logs the jobs. Wave 2 will wire 
    this to the actual transport (e.g., Pub/Sub or Cloud Tasks).
    
    Args:
        jobs: List of EmbeddingJob objects to process.
        
    Returns:
        True if all jobs were accepted for delivery.
    """
    for job in jobs:
        # T-05-03: Mitigate DoS by bounding payload (log warning if oversized)
        # 100k chars is a reasonable bound for most code symbols/files
        if len(job.content) > 100_000:
            logger.warning(
                "Oversized payload for chunk_id %s: %d characters. Processing may be truncated.",
                job.chunk_id, len(job.content)
            )
            
        # Log the job details for traceability in this wave
        # This confirms the contract is reachable from the ingestion path
        payload = job.to_dict()
        logger.info(
            "ENQUEUE_EMBEDDING_JOB: repo=%s, file=%s, chunk_id=%s, idempotency_key=%s",
            job.repo, job.file_path, job.chunk_id, payload.get("idempotency_key")
        )
        
    return True

async def enqueue_chunk_embedding(
    repo: str, 
    file_path: str, 
    chunk_id: str, 
    content: str,
    idempotency_key: str = None
) -> bool:
    """Helper to enqueue a single chunk embedding job."""
    job = EmbeddingJob(
        repo=repo,
        file_path=file_path,
        chunk_id=chunk_id,
        content=content,
        idempotency_key=idempotency_key
    )
    return await enqueue_embedding_jobs([job])
