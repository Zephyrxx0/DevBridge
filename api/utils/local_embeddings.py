from __future__ import annotations

import asyncio
import hashlib
from typing import Sequence


EMBEDDING_DIMENSION = 768


def _hash_to_vector(text: str, dimension: int = EMBEDDING_DIMENSION) -> list[float]:
    seed = text or ""
    values: list[float] = []
    counter = 0
    while len(values) < dimension:
        digest = hashlib.sha256(f"{seed}:{counter}".encode("utf-8")).digest()
        for idx in range(0, len(digest), 4):
            if len(values) >= dimension:
                break
            chunk = digest[idx:idx + 4]
            n = int.from_bytes(chunk, "big", signed=False)
            values.append((n / 2**32) * 2.0 - 1.0)
        counter += 1
    return values


class LocalEmbeddings:
    def embed_query(self, text: str) -> list[float]:
        return _hash_to_vector(text)

    async def aembed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return await asyncio.gather(*[asyncio.to_thread(_hash_to_vector, text) for text in texts])
