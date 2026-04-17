import logging
import inspect
import asyncio
from typing import List, Optional
from langchain_postgres import PGEngine, PGVectorStore
from langchain_core.documents import Document
from langchain_google_vertexai import VertexAIEmbeddings
from api.core.secrets import secrets
from api.db.session import get_engine

logger = logging.getLogger(__name__)

class VectorStoreManager:
    """
    Manages the connection to Supabase's pgvector using langchain-postgres.
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
            project_id = secrets.get_secret("GOOGLE_CLOUD_PROJECT") or "devbridge-default"
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

# Singleton
vector_db = VectorStoreManager()
