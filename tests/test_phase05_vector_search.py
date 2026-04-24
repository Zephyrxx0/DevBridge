import pytest
import json
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from api.db.vector_store import VectorStoreManager
from api.ingestion.types import EmbeddingJob
from api.ingest.embedding_queue import enqueue_embedding_jobs, enqueue_chunk_embedding
from api.db.session import get_engine

@pytest.mark.asyncio
async def test_hybrid_search_contract():
    """
    Verify the hybrid_search SQL function contract.
    This test mocks the engine and connection to verify the SQL call shape.
    """
    manager = VectorStoreManager()
    
    # Mock the embedding service
    mock_embeddings = MagicMock()
    # Mock embed_query to return a dummy vector
    mock_embeddings.embed_query.return_value = [0.1] * 768
    
    with patch("api.db.vector_store.get_engine") as mock_get_engine:
        # Create a mock connection that supports async context manager
        mock_conn = AsyncMock()
        
        mock_result = MagicMock()
        # Mock row with _mapping (SQLAlchemy 1.4+ style)
        mock_row = MagicMock()
        mock_row._mapping = {
            "file_path": "test.py",
            "start_line": 1,
            "end_line": 10,
            "score": 0.95,
            "snippet": "print('hello')",
            "reason": {"semantic_score": 0.9, "lexical_score": 1.0}
        }
        # fetchall() is a regular method returning a list
        mock_result.fetchall.return_value = [mock_row]
        
        # execute() is a coroutine returning mock_result
        mock_conn.execute.return_value = mock_result
        
        # Mock engine.connect() which is an async context manager
        mock_engine = MagicMock()
        # connect() returns a mock context manager
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_conn
        mock_engine.connect.return_value = mock_cm
        
        mock_get_engine.return_value = mock_engine
        
        # Mock the internal vectorstore and its embedding service
        manager._vectorstore = MagicMock()
        manager._vectorstore.embedding_service = mock_embeddings
        
        results = await manager.hybrid_search("test query", k=5, filters={"repo": "test-repo"})
        
        assert len(results) == 1
        assert results[0]["file_path"] == "test.py"
        assert results[0]["score"] == 0.95
        
        # Verify SQL call
        # execute was called with (text_obj, params_dict)
        assert mock_conn.execute.called
        args, kwargs = mock_conn.execute.call_args
        sql_query = str(args[0])
        params = args[1] if len(args) > 1 else kwargs
        
        assert "hybrid_search" in sql_query
        assert params["query_text"] == "test query"
        assert params["k"] == 5
        filters_dict = json.loads(params["filters"])
        assert filters_dict["repo"] == "test-repo"
        assert "query_embedding" in filters_dict
        assert filters_dict["query_embedding"] == [0.1] * 768

@pytest.mark.asyncio
async def test_embedding_upsert_path():
    """Verify vector store upsert logic."""
    manager = VectorStoreManager()
    
    with patch("api.db.vector_store.get_engine") as mock_get_engine:
        mock_conn = AsyncMock()
        mock_engine = MagicMock()
        mock_cm = AsyncMock()
        mock_cm.__aenter__.return_value = mock_conn
        mock_engine.connect.return_value = mock_cm
        mock_get_engine.return_value = mock_engine
        
        await manager.upsert_vector("chunk-123", [0.1] * 768)
        
        # Verify SQL call
        assert mock_conn.execute.called
        args, kwargs = mock_conn.execute.call_args
        sql_query = str(args[0])
        params = args[1] if len(args) > 1 else kwargs
        
        assert "UPDATE code_chunks" in sql_query
        assert "SET embedding = :embedding" in sql_query
        assert params["chunk_id"] == "chunk-123"
        assert params["embedding"] == [0.1] * 768

@pytest.mark.asyncio
async def test_embedding_queue_contract():
    """Verify queue message shape and enqueue logic."""
    jobs = [
        EmbeddingJob(
            chunk_id="c1",
            repo="r1",
            file_path="f1.py",
            content="def f1(): pass"
        )
    ]
    
    # Test batch enqueue
    success = await enqueue_embedding_jobs(jobs)
    assert success is True
    
    # Test single helper
    success = await enqueue_chunk_embedding("r2", "f2.py", "c2", "content2")
    assert success is True
    
    # Verify idempotency key default
    job = jobs[0]
    payload = job.to_dict()
    assert payload["idempotency_key"] == "c1"
