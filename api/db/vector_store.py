import logging
import inspect
import asyncio
import os
import json
from typing import List, Optional, Dict, Any
from langchain_postgres import PGVectorStore
from langchain_core.documents import Document
from langchain_google_vertexai import VertexAIEmbeddings
from sqlalchemy import text
from api.core.secrets import secrets
from api.db.session import get_engine

logger = logging.getLogger(__name__)

class VectorStoreManager:
    """
    Manages the connection to Supabase's pgvector using langchain-postgres and raw SQL.
    """
    def __init__(self):
        self.collection_name = "devbridge_codebase"
        self._vectorstore: Optional[PGVectorStore] = None

    def initialize(self) -> bool:
        """
        Attempts to initialize the PGVector connection.
        Returns True if successful, False otherwise.
        """
        engine = get_engine()
        if engine is None:
            logger.warning("Database engine is not initialized. Vector store is disabled.")
            return False

        try:
            # We use VertexAI embeddings for the vectors
            # Canonical key: GOOGLE_CLOUD_PROJECT with legacy GCP_PROJECT_ID fallback
            project_id = secrets.get_secret("GOOGLE_CLOUD_PROJECT")
            if not project_id:
                project_id = os.environ.get("GCP_PROJECT_ID")
                if project_id:
                    logger.warning("Using legacy GCP_PROJECT_ID fallback. Please migrate to GOOGLE_CLOUD_PROJECT.")

            project_id = project_id or "devbridge-default"
            embeddings = VertexAIEmbeddings(model_name="text-embedding-004", project=project_id)

            self._vectorstore = PGVectorStore(
                engine=engine,
                collection_name=self.collection_name,
                embedding_service=embeddings,
            )

            create_tables = self._vectorstore.create_tables_if_not_exists()
            if inspect.isawaitable(create_tables):
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    asyncio.run(create_tables)
                else:
                    loop.create_task(create_tables)

            logger.info("Vector store initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            return False

    def add_documents(self, docs: List[Document]):
        if not self._vectorstore:
            raise ValueError("Vector store is not initialized.")
        self._vectorstore.add_documents(docs)

    def similarity_search(self, query: str, k: int = 4) -> List[Document]:
        if not self._vectorstore:
            logger.warning("Vector store is not initialized, returning empty search results.")
            return []

        return self._vectorstore.similarity_search(query, k=k)

    async def upsert_vector(self, chunk_id: str, embedding: List[float]):
        """
        Deterministic vector upsert by chunk_id.
        """
        engine = get_engine()
        if engine is None:
            raise ValueError("Database engine is not initialized.")

        async with engine.connect() as conn:
            update_sql = text("""
                UPDATE code_chunks 
                SET embedding = :embedding,
                    created_at = NOW()
                WHERE chunk_id = :chunk_id
            """)
            await conn.execute(update_sql, {
                "embedding": embedding,
                "chunk_id": chunk_id
            })
            await conn.commit()
            logger.debug(f"Upserted embedding for chunk_id: {chunk_id}")

    async def hybrid_search(self, query_text: str, k: int = 10, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Hybrid search invocation method that calls SQL function and maps rows to normalized result objects.
        """
        if not self._vectorstore:
            logger.warning("Vector store is not initialized, returning empty hybrid search results.")
            return []

        engine = get_engine()
        if engine is None:
            return []

        # 1. Generate embedding for query
        # VertexAIEmbeddings.embed_query is usually synchronous but we run it in thread to be safe
        embedding = await asyncio.to_thread(self._vectorstore.embedding_service.embed_query, query_text)

        # 2. Call SQL function
        async with engine.connect() as conn:
            sql_filters = filters.copy() if filters else {}
            # Pass embedding inside filters for the SQL function to extract
            sql_filters['query_embedding'] = embedding

            query_sql = text("""
                SELECT file_path, start_line, end_line, score, snippet, reason
                FROM hybrid_search(:query_text, :k, :filters)
            """)

            result = await conn.execute(query_sql, {
                "query_text": query_text,
                "k": k,
                "filters": json.dumps(sql_filters)
            })

            rows = result.fetchall()
            return [dict(row._mapping) for row in rows]

# Singleton
vector_db = VectorStoreManager()

