from typing import Optional
from contextlib import asynccontextmanager
import logging
import os
import sys
import secrets as pysecrets
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import asyncio
from api.agents.orchestrator import Orchestrator
from api.core.config import settings
from api.db.session import close_db_pool, init_db_pool
from api.db.cache import PostgresCacheBackend, repo_id_key_builder
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from api.routes import annotations
from api.routes import webhooks
from api.routes import pr
from api.routes import repo
from api.routes import questions
from api.routes import chats
from api.db.models import Annotation
from api.db.vector_store import vector_db
from api.db.session import get_engine
from sqlalchemy import text

# psycopg async is incompatible with ProactorEventLoop on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = app
    if settings.supabase_connection_string:
        await init_db_pool(settings.supabase_connection_string)
        # Initialize caching infrastructure (D-03)
        FastAPICache.init(PostgresCacheBackend(), prefix="devbridge-cache")
    yield
    await close_db_pool()


app = FastAPI(title="DevBridge API", lifespan=lifespan)
orchestrator = Orchestrator()

# Configure CORS for Next.js with explicit origin allowlist.
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def inject_user_context(request, call_next):
    # Only trust forwarded identity when internal auth token and proxy host checks pass.
    expected_internal_token = os.getenv("INTERNAL_AUTH_TOKEN")
    incoming_internal_token = request.headers.get("X-Internal-Auth") or ""

    trusted_proxy_ips = {
        ip.strip()
        for ip in os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1,::1").split(",")
        if ip.strip()
    }
    client_host = request.client.host if request.client else None
    client_is_trusted = client_host in trusted_proxy_ips

    token_matches = bool(expected_internal_token) and pysecrets.compare_digest(
        incoming_internal_token,
        expected_internal_token or "",
    )
    if token_matches and client_is_trusted:
        user_id = request.headers.get("X-User-Id")
        if user_id:
            request.state.user_id = user_id
    return await call_next(request)

app.include_router(annotations.router)
app.include_router(webhooks.router)
app.include_router(pr.router)
app.include_router(repo.router)
app.include_router(questions.router)
app.include_router(chats.router)

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default-thread"
    repo_id: Optional[str] = None


async def _persist_chat_turn(repo_id: str | None, session_id: str, question: str, answer: str) -> None:
    if not repo_id or not session_id:
        return

    engine = get_engine()
    if engine is None:
        return

    try:
        repo_uuid = str(uuid.UUID(repo_id))
    except Exception:
        logger.warning("Skipping chat persistence: invalid repo_id", extra={"repo_id": repo_id})
        return

    session_uuid: str | None = None
    try:
        session_uuid = str(uuid.UUID(session_id))
    except Exception:
        logger.info("Session id is not UUID, skipping chat_messages persistence", extra={"session_id": session_id})

    params = {
        "session_id": session_uuid,
        "user_content": question,
        "assistant_content": answer,
        "repo_id": repo_uuid,
        "thread_id": session_id,
        "question": question,
        "answer": answer,
    }

    async with engine.connect() as conn:
        if session_uuid:
            await conn.execute(
                text(
                    """
                    INSERT INTO chat_messages (session_id, role, content, sources)
                    VALUES (CAST(:session_id AS uuid), 'user', :user_content, '[]'::jsonb),
                           (CAST(:session_id AS uuid), 'assistant', :assistant_content, '[]'::jsonb)
                    """
                ),
                params,
            )
            await conn.execute(
                text("UPDATE chat_sessions SET updated_at = NOW() WHERE id = CAST(:session_id AS uuid)"),
                params,
            )
        await conn.execute(
            text(
                """
                INSERT INTO questions (repo_id, thread_id, question, answer, sources)
                VALUES (CAST(:repo_id AS uuid), :thread_id, :question, :answer, '[]'::jsonb)
                """
            ),
            params,
        )
        await conn.commit()


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "DevBridge API",
        "version": "0.1.0"
    }

@app.post("/chat")
@cache(expire=3600, namespace="chat", key_builder=repo_id_key_builder)
async def chat(request: ChatRequest):
    try:
        response = await orchestrator.chat(request.message, request.thread_id)
        try:
            await _persist_chat_turn(request.repo_id, request.thread_id, request.message, response)
        except Exception:
            logger.exception("Failed to persist chat turn for /chat")

        return {
            "response": response,
            "thread_id": request.thread_id
        }
    except Exception as e:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=500, detail="Chat request failed")


@app.get("/context")
async def get_context(repo_id: str, query: str, k: int = 5):
    try:
        if not vector_db._vectorstore:
            vector_db.initialize()
        code_results = await vector_db.hybrid_search(query, k=max(1, min(k, 20)))

        annotations: list[dict] = []
        if code_results:
            for hit in code_results[:5]:
                file_path = hit.get("file_path")
                if not file_path:
                    continue
                anns = await Annotation.get_annotations(repo_id=repo_id, file_path=file_path, limit=5)
                annotations.extend(
                    {
                        "id": str(a.id),
                        "file_path": a.file_path,
                        "start_line": a.start_line,
                        "end_line": a.end_line,
                        "comment": a.comment,
                        "tags": a.tags,
                        "upvotes": a.upvotes,
                    }
                    for a in anns
                )

        return {
            "repo_id": repo_id,
            "query": query,
            "results": code_results,
            "annotations": annotations,
        }
    except Exception:
        logger.exception("Context request failed")
        raise HTTPException(status_code=500, detail="Context request failed")


@app.get("/health/db")
async def health_db():
    """Lightweight DB connectivity probe for local diagnostics."""
    engine = get_engine()
    if engine is None:
        return {
            "ok": False,
            "status": "not_initialized",
            "detail": "DB engine not initialized. Check SUPABASE_CONNECTION_STRING and startup logs.",
        }

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"ok": True, "status": "connected"}
    except Exception as exc:
        return {
            "ok": False,
            "status": "connection_failed",
            "detail": str(exc),
        }


@app.post("/chat/stream")
@cache(expire=3600, namespace="chat_stream", key_builder=repo_id_key_builder)
async def chat_stream(request: ChatRequest):
    """SSE streaming endpoint for real-time response delivery."""
    try:
        # Generator that yields SSE events for streaming responses
        async def event_generator():
            try:
                def _extract_chunk_text(content) -> str:
                    if isinstance(content, str):
                        return content
                    if isinstance(content, list):
                        parts: list[str] = []
                        for item in content:
                            if isinstance(item, dict):
                                text = item.get("text")
                                if isinstance(text, str):
                                    parts.append(text)
                            elif isinstance(item, str):
                                parts.append(item)
                        return "".join(parts)
                    return ""

                # Send optimization metadata first (D-08)
                metadata = {
                    "type": "metadata",
                    "using_cache": False,  # Note: @cache decorator handles this transparently
                    "optimization": "parallel"
                }
                yield f"data: {json.dumps(metadata)}\n\n"

                from langchain_core.messages import HumanMessage
                
                # Create config for checkpointing
                config = {"configurable": {"thread_id": request.thread_id}}
                input_data = {"messages": [HumanMessage(content=request.message)]}

                chunk_count = 0
                accumulated_response = ""
                async for event in orchestrator.graph.astream(input_data, config=config, stream_mode="messages"):
                    message_chunk = event[0] if isinstance(event, tuple) and event else None
                    if message_chunk is None:
                        continue

                    chunk_text = _extract_chunk_text(getattr(message_chunk, "content", ""))
                    if chunk_text:
                        chunk_count += 1
                        accumulated_response += chunk_text
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text})}\n\n"
                        await asyncio.sleep(0.02)

                # Fallback for providers/modes that produce no incremental chunks.
                if chunk_count == 0:
                    response = await orchestrator.chat(request.message, request.thread_id)
                    if response:
                        accumulated_response = response
                        yield f"data: {json.dumps({'type': 'chunk', 'content': response})}\n\n"

                # Send done event
                try:
                    await _persist_chat_turn(request.repo_id, request.thread_id, request.message, accumulated_response)
                except Exception:
                    logger.exception("Failed to persist chat turn for /chat/stream")
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    
            except Exception as e:
                logger.exception("Streaming request failed")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Streaming error'})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.exception("Failed to initialize streaming response")
        raise HTTPException(status_code=500, detail="Streaming request failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
