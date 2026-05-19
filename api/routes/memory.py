from __future__ import annotations

from inspect import isawaitable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from api.db.hindsight import hindsight_db
from api.routes.admin import get_engine, verify_admin

router = APIRouter()


class MemoryUpdateBody(BaseModel):
    text: str = Field(min_length=1)


def _normalize_memories(payload: Any) -> list[dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        memories = payload.get("memories")
        if isinstance(memories, list):
            return [item for item in memories if isinstance(item, dict)]
    return []


@router.get("/list")
async def list_memories(user_id: str = Depends(verify_admin)) -> dict[str, list[dict[str, Any]]]:
    client = hindsight_db._client
    if client is None:
        raise HTTPException(status_code=503, detail="Memory service unavailable")

    memories_api = getattr(client, "memories", None)
    list_fn = getattr(memories_api, "list", None) if memories_api is not None else None
    if list_fn is None:
        raise HTTPException(status_code=503, detail="Memory list API unavailable")

    result = list_fn(bank_id=user_id, limit=100)
    if isawaitable(result):
        result = await result

    return {"memories": _normalize_memories(result)}


@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, user_id: str = Depends(verify_admin)) -> dict[str, str]:
    client = hindsight_db._client
    if client is None:
        raise HTTPException(status_code=503, detail="Memory service unavailable")

    delete_fn = getattr(client, "delete_document", None)
    if delete_fn is None:
        raise HTTPException(status_code=503, detail="Memory delete API unavailable")

    result = delete_fn(bank_id=user_id, document_id=memory_id)
    if isawaitable(result):
        await result
    return {"status": "deleted"}


@router.put("/{memory_id}")
async def update_memory(memory_id: str, body: MemoryUpdateBody, user_id: str = Depends(verify_admin)) -> dict[str, str]:
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    async with engine.connect() as conn:
        await conn.execute(
            text(
                """
                UPDATE hindsight.memories
                SET text = :text
                WHERE id = :id AND bank_id = :bank_id
                """
            ),
            {
                "text": body.text,
                "id": memory_id,
                "bank_id": user_id,
            },
        )
        await conn.commit()
    return {"status": "updated"}
