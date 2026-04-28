import json

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text

from api.db.session import get_engine

router = APIRouter(tags=["chats"])


class ChatSessionCreate(BaseModel):
    repo_id: str
    title: str | None = None


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    sources: list[dict] = []


@router.get("/repo/{repo_id}/chats")
async def list_chats(repo_id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        SELECT cs.id, cs.repo_id, cs.title, cs.created_by, cs.created_at, cs.updated_at,
               (
                 SELECT cm.content
                 FROM chat_messages cm
                 WHERE cm.session_id = cs.id
                 ORDER BY cm.created_at DESC
                 LIMIT 1
               ) AS last_message
        FROM chat_sessions cs
        WHERE cs.repo_id = CAST(:repo_id AS uuid)
        ORDER BY cs.updated_at DESC
        """
    )
    try:
        async with engine.connect() as conn:
            result = await conn.execute(query, {"repo_id": repo_id})
            return [dict(row._mapping) for row in result.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat sessions unavailable: {exc}")


@router.post("/repo/{repo_id}/chats")
async def create_chat(repo_id: str, payload: ChatSessionCreate, request: Request):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    if payload.repo_id != repo_id:
        raise HTTPException(status_code=400, detail="repo_id mismatch")

    user_id = getattr(request.state, "user_id", None)
    title = (payload.title or "New chat").strip() or "New chat"

    query = text(
        """
        INSERT INTO chat_sessions (repo_id, title, created_by)
        VALUES (CAST(:repo_id AS uuid), :title, CAST(:created_by AS uuid))
        RETURNING id, repo_id, title, created_by, created_at, updated_at
        """
    )
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                query,
                {"repo_id": repo_id, "title": title, "created_by": user_id},
            )
            await conn.commit()
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=500, detail="Failed to create chat")
            return dict(row._mapping)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat create unavailable: {exc}")


@router.get("/chats/{session_id}/messages")
async def list_chat_messages(session_id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        SELECT id, session_id, role, content, sources, created_at
        FROM chat_messages
        WHERE session_id = CAST(:session_id AS uuid)
        ORDER BY created_at ASC
        """
    )
    try:
        async with engine.connect() as conn:
            result = await conn.execute(query, {"session_id": session_id})
            return [dict(row._mapping) for row in result.fetchall()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat messages unavailable: {exc}")


@router.post("/chats/{session_id}/messages")
async def add_chat_message(session_id: str, payload: ChatMessageCreate):
    if payload.role not in {"user", "assistant"}:
        raise HTTPException(status_code=400, detail="role must be 'user' or 'assistant'")

    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        INSERT INTO chat_messages (session_id, role, content, sources)
        VALUES (CAST(:session_id AS uuid), :role, :content, CAST(:sources AS jsonb))
        """
    )
    update_query = text(
        """
        UPDATE chat_sessions
        SET updated_at = NOW(),
            title = CASE
              WHEN title = 'New chat' AND :role = 'user' THEN LEFT(:content, 80)
              ELSE title
            END
        WHERE id = CAST(:session_id AS uuid)
        """
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(
                query,
                {
                    "session_id": session_id,
                    "role": payload.role,
                    "content": payload.content,
                    "sources": json.dumps(payload.sources or []),
                },
            )
            await conn.execute(
                update_query,
                {
                    "session_id": session_id,
                    "role": payload.role,
                    "content": payload.content,
                },
            )
            await conn.commit()
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat message write unavailable: {exc}")


@router.delete("/chats/{session_id}/messages")
async def clear_chat_messages(session_id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    delete_query = text(
        """
        DELETE FROM chat_messages
        WHERE session_id = CAST(:session_id AS uuid)
        """
    )
    update_query = text(
        """
        UPDATE chat_sessions
        SET updated_at = NOW(),
            title = 'New chat'
        WHERE id = CAST(:session_id AS uuid)
        """
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(delete_query, {"session_id": session_id})
            await conn.execute(update_query, {"session_id": session_id})
            await conn.commit()
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat clear unavailable: {exc}")


class ChatSessionUpdate(BaseModel):
    title: str


@router.patch("/repo/{repo_id}/chats/{session_id}")
async def rename_chat(repo_id: str, session_id: str, payload: ChatSessionUpdate):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        UPDATE chat_sessions
        SET title = :title, updated_at = NOW()
        WHERE id = CAST(:session_id AS uuid) AND repo_id = CAST(:repo_id AS uuid)
        RETURNING id
        """
    )
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                query,
                {"title": payload.title, "session_id": session_id, "repo_id": repo_id},
            )
            await conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat rename unavailable: {exc}")


@router.delete("/repo/{repo_id}/chats/{session_id}")
async def delete_chat(repo_id: str, session_id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    # chat_messages should delete cascade if foreign keys are set up correctly,
    # but we can explicitly delete them first if there is no cascade set up.
    delete_msgs_query = text(
        """
        DELETE FROM chat_messages
        WHERE session_id = CAST(:session_id AS uuid)
        """
    )
    delete_chat_query = text(
        """
        DELETE FROM chat_sessions
        WHERE id = CAST(:session_id AS uuid) AND repo_id = CAST(:repo_id AS uuid)
        """
    )
    try:
        async with engine.connect() as conn:
            await conn.execute(delete_msgs_query, {"session_id": session_id})
            result = await conn.execute(
                delete_chat_query, {"session_id": session_id, "repo_id": repo_id}
            )
            await conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat delete unavailable: {exc}")
