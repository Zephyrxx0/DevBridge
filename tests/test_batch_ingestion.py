import pytest
import asyncio
import os
from unittest.mock import AsyncMock, patch, MagicMock
from api.ingest.embedding_worker import BatchProcessor
from api.ingestion.types import EmbeddingJob

@pytest.mark.asyncio
async def test_batch_processor_size_flush():
    # Mock vector_db
    with patch("api.ingest.embedding_worker.vector_db") as mock_vector_db:
        mock_vector_db._vectorstore = MagicMock()
        mock_vector_db.initialize.return_value = True
        # Return 5 embeddings
        mock_vector_db._vectorstore.embedding_service.aembed_documents = AsyncMock(return_value=[[0.1]*768]*5)
        mock_vector_db.upsert_vectors_batch = AsyncMock()

        processor = BatchProcessor(batch_size=5, flush_interval=10.0)
        
        jobs = [
            EmbeddingJob(chunk_id=f"c{i}", repo="r", file_path="f", content=f"content{i}")
            for i in range(5)
        ]
        
        # Add 5 jobs
        tasks = [processor.add_job(job) for job in jobs]
        
        results = await asyncio.gather(*tasks)
        
        assert all(results)
        assert mock_vector_db._vectorstore.embedding_service.aembed_documents.call_count == 1
        assert mock_vector_db.upsert_vectors_batch.call_count == 1
        
        # Verify batch content
        call_args = mock_vector_db._vectorstore.embedding_service.aembed_documents.call_args[0][0]
        assert len(call_args) == 5
        assert call_args[0] == "content0"
        assert call_args[4] == "content4"

@pytest.mark.asyncio
async def test_batch_processor_timer_flush():
    with patch("api.ingest.embedding_worker.vector_db") as mock_vector_db:
        mock_vector_db._vectorstore = MagicMock()
        mock_vector_db.initialize.return_value = True
        mock_vector_db._vectorstore.embedding_service.aembed_documents = AsyncMock(return_value=[[0.1]*768])
        mock_vector_db.upsert_vectors_batch = AsyncMock()

        # Small flush interval
        processor = BatchProcessor(batch_size=50, flush_interval=0.1)
        
        job = EmbeddingJob(chunk_id="c1", repo="r", file_path="f", content="content1")
        
        success = await processor.add_job(job)
        
        assert success
        assert mock_vector_db._vectorstore.embedding_service.aembed_documents.call_count == 1

@pytest.mark.asyncio
async def test_batch_processor_fallback_on_failure():
    with patch("api.ingest.embedding_worker.vector_db") as mock_vector_db:
        with patch("api.ingest.embedding_worker.process_embedding_job_individual") as mock_individual:
            mock_vector_db._vectorstore = MagicMock()
            mock_vector_db.initialize.return_value = True
            # Batch fails
            mock_vector_db._vectorstore.embedding_service.aembed_documents = AsyncMock(side_effect=Exception("Batch failed"))
            
            # Individual succeeds
            mock_individual.return_value = True

            processor = BatchProcessor(batch_size=2, flush_interval=10.0)
            
            jobs = [
                EmbeddingJob(chunk_id=f"fail-c{i}", repo="r", file_path="f", content=f"content{i}")
                for i in range(2)
            ]
            
            tasks = [processor.add_job(job) for job in jobs]
            results = await asyncio.gather(*tasks)
            
            assert all(results)
            assert mock_individual.call_count == 2
