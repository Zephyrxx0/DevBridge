from __future__ import annotations

from api.db import vector_store


def test_initialize_uses_vertex_embeddings_for_default_model(monkeypatch) -> None:
    class FakeVertexEmbeddings:
        def __init__(self, model_name: str):
            self.model_name = model_name

        def embed_query(self, text: str) -> list[float]:
            return [0.0]

    monkeypatch.setattr(vector_store.settings, "embedding_model", "text-embedding-004")
    monkeypatch.setattr(vector_store, "VertexAIEmbeddings", FakeVertexEmbeddings)

    manager = vector_store.VectorStoreManager()
    embeddings = manager.get_embedding_service()

    assert isinstance(embeddings, FakeVertexEmbeddings)
    assert embeddings.model_name == "text-embedding-004"


def test_initialize_falls_back_to_local_embeddings(monkeypatch) -> None:
    monkeypatch.setattr(vector_store.settings, "embedding_model", "local-hash-embedding-v1")

    manager = vector_store.VectorStoreManager()
    embeddings = manager.get_embedding_service()

    assert isinstance(embeddings, vector_store.LocalEmbeddings)
