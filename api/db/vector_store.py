import logging
from typing import List, Optional
from langchain_postgres import PGVector
from langchain_postgres.vectorstores import PGVector
from langchain_core.documents import Document
from langchain_google_vertexai import VertexAIEmbeddings
from api.core.secrets import secrets

logger = logging.getLogger(__name__)

class VectorStoreManager:
    """
    Manages the connection to Supabase's pgvector using langchain-postgres.
    """
    def __init__(self):
        self.connection_string = secrets.get_secret("SUPABASE_CONNECTION_STRING")
        self.collection_name = "devbridge_codebase"
        self._vectorstore: Optional[PGVector] = None

    def initialize(self) -> bool:
        """
        Attempts to initialize the PGVector connection.
        Returns True if successful, False otherwise.
        """
        if not self.connection_string:
            logger.warning("SUPABASE_CONNECTION_STRING not set. Vector store is disabled.")
            return False

        try:
            # We use VertexAI embeddings for the vectors
            project_id = secrets.get_secret("GOOGLE_CLOUD_PROJECT") or "devbridge-default"
            embeddings = VertexAIEmbeddings(model_name="text-embedding-004", project=project_id)
            
            self._vectorstore = PGVector(
                embeddings=embeddings,
                collection_name=self.collection_name,
                connection=self.connection_string,
                use_jsonb=True,
            )
            
            # Explicitly create tables if they don't exist
            self._vectorstore.create_tables_if_not_exists()
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
