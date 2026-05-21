from typing import Optional
from contextlib import asynccontextmanager
import logging
import os
import sys
import secrets as pysecrets
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import json
import asyncio
from urllib import request
from langchain_core.messages import HumanMessage

from api.agents.graph import graph
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
from api.routes import admin
from api.routes.memory import router as memory_router
from api.routes.chats import stream_graph_events
from api.db.models import Annotation
from api.db.vector_store import vector_db
from api.db.session import get_engine
from sqlalchemy import text
from api.core.secrets import get_github_token
from api.core.scheduler import SchedulerManager
from api.jobs.cleanup import cleanup_job
from api.jobs.metrics import collect_daily_metrics
from api.jobs.reports import run_daily_report_job, run_weekly_report_job
from api.jobs.sync import sync_github_and_docs_job
from api.db.hindsight import hindsight_db

# psycopg async is incompatible with ProactorEventLoop on Windows.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()
logger = logging.getLogger(__name__)
STREAM_HEARTBEAT_SECONDS = 10.0


def _dispatch_reflection_task() -> None:
    async def _run_reflect() -> None:
        try:
            await hindsight_db.reflect()
        except Exception:
            logger.exception("Async hindsight reflect failed")

    try:
        asyncio.create_task(_run_reflect())
    except RuntimeError:
        logger.warning("No running loop available for async hindsight reflect dispatch")


def _extract_metadata(value) -> dict:
    """Extracts only allowed SSE metadata fields from nested graph events."""
    metadata = {"fallback": False, "model_used": None, "cascaded": False}

    def _walk(node) -> None:
        if isinstance(node, dict):
            if node.get("fallback") is True:
                metadata["fallback"] = True

            model_used = node.get("model_used")
            if isinstance(model_used, str) and model_used.strip():
                metadata["model_used"] = model_used

            if node.get("cascaded") is True:
                metadata["cascaded"] = True

            for nested in node.values():
                _walk(nested)
            return

        if isinstance(node, (list, tuple)):
            for nested in node:
                _walk(nested)

    _walk(value)
    return metadata


def _extract_response_text(value) -> str:
    """Extract final assistant text from LangGraph event/final-state payloads."""

    def _message_content(message) -> str:
        content = getattr(message, "content", None)
        if content is None and isinstance(message, dict):
            content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and isinstance(item.get("text"), str):
                    parts.append(item["text"])
            return "".join(parts)
        return ""

    def _walk(node) -> str:
        if isinstance(node, dict):
            messages = node.get("messages")
            if isinstance(messages, list) and messages:
                text = _message_content(messages[-1])
                if text:
                    return text
            for key in ("output", "value", "data"):
                if key in node:
                    text = _walk(node[key])
                    if text:
                        return text
        return ""

    return _walk(value)


def _has_stream_metadata(metadata: dict) -> bool:
    return bool(metadata.get("fallback") or metadata.get("model_used") or metadata.get("cascaded"))


def _repo_slug_from_github_url(url: str | None) -> str | None:
    if not url:
        return None
    clean = url.strip().rstrip("/")
    marker = "github.com/"
    if marker not in clean:
        return None
    tail = clean.split(marker, 1)[1]
    parts = [segment for segment in tail.split("/") if segment]
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1]}"


async def _github_get_json(url: str, token: str) -> dict | list:
    def _do_request() -> dict | list:
        req = request.Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    return await asyncio.to_thread(_do_request)


async def _embed_issue(text_payload: str) -> list[float] | None:
    if not vector_db._vectorstore:
        vector_db.initialize()
    if not vector_db._vectorstore:
        logger.warning("Skipping issue embedding: vector store unavailable")
        return None

    try:
        return await asyncio.to_thread(
            vector_db._vectorstore.embedding_service.embed_query,
            text_payload,
        )
    except Exception:
        logger.exception("Failed embedding GitHub issue payload")
        return None


async def sync_issues() -> None:
    """Daily GitHub issue sync into repo_github_issues table."""
    engine = get_engine()
    if engine is None:
        logger.warning("Skipping issue sync: DB engine unavailable")
        return

    async with engine.connect() as conn:
        repo_rows = await conn.execute(text("SELECT id, name, github_url FROM repositories"))
        repos = [dict(row._mapping) for row in repo_rows.fetchall()]

    upsert_sql = text(
        """
        INSERT INTO repo_github_issues (repo_id, issue_number, title, body, embedding, updated_at)
        VALUES (
            CAST(:repo_id AS uuid),
            :issue_number,
            :title,
            :body,
            CAST(:embedding AS vector),
            NOW()
        )
        ON CONFLICT (repo_id, issue_number) DO UPDATE
        SET title = EXCLUDED.title,
            body = EXCLUDED.body,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        """
    )

    sync_user_id = (os.getenv("GITHUB_SYNC_USER_ID") or "").strip()
    if not sync_user_id:
        logger.info("Skipping scheduled issue sync: GITHUB_SYNC_USER_ID not configured")
        return

    synced_count = 0
    for repo in repos:
        token = await get_github_token(sync_user_id)
        if not token:
            logger.warning(
                "Skipping issue sync for repo %s: missing OAuth token for configured sync user",
                repo.get("id"),
            )
            continue

        repo_id = str(repo.get("id"))
        repo_slug = _repo_slug_from_github_url(repo.get("github_url")) or repo.get("name")
        if not repo_slug:
            continue

        payload: list[dict] = []
        page = 1
        while True:
            issues_url = (
                f"https://api.github.com/repos/{repo_slug}/issues?state=open&per_page=100&page={page}"
            )
            try:
                page_payload = await _github_get_json(issues_url, token)
            except Exception:
                logger.exception("Failed fetching issues for %s (page=%s)", repo_slug, page)
                break

            if not isinstance(page_payload, list):
                logger.warning("Unexpected issues payload for %s (page=%s)", repo_slug, page)
                break
            if not page_payload:
                break

            payload.extend([issue for issue in page_payload if isinstance(issue, dict)])
            if len(page_payload) < 100:
                break
            page += 1

        async with engine.connect() as conn:
            for issue in payload:
                if not isinstance(issue, dict) or issue.get("pull_request"):
                    continue

                issue_number = issue.get("number")
                title = (issue.get("title") or "").strip()
                body = (issue.get("body") or "").strip()
                if not issue_number or not title:
                    continue

                embedding_input = f"Issue #{issue_number}: {title}\n\n{body}"
                try:
                    embedding = await _embed_issue(embedding_input)
                except Exception:
                    logger.exception("Issue embedding crashed for %s#%s", repo_slug, issue_number)
                    continue
                if embedding is None:
                    continue

                try:
                    await conn.execute(
                        upsert_sql,
                        {
                            "repo_id": repo_id,
                            "issue_number": int(issue_number),
                            "title": title,
                            "body": body,
                            "embedding": embedding,
                        },
                    )
                except Exception:
                    logger.exception("Failed upserting issue %s#%s", repo_slug, issue_number)
                    continue
                synced_count += 1
            await conn.commit()

    logger.info("GitHub issue sync completed: %s issues upserted", synced_count)

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = app
    scheduler_manager: SchedulerManager | None = None
    if settings.supabase_connection_string:
        await init_db_pool(settings.supabase_connection_string)
        hindsight_db.initialize()
        # Initialize caching infrastructure (D-03)
        FastAPICache.init(PostgresCacheBackend(), prefix="devbridge-cache")
        scheduler_manager = SchedulerManager()
        scheduler_manager.add_job(
            sync_github_and_docs_job,
            trigger="cron",
            hour=2,
            minute=0,
            id="sync_issues",
            replace_existing=True,
        )
        scheduler_manager.add_job(
            cleanup_job,
            trigger="cron",
            hour=3,
            minute=0,
            id="cache_cleanup",
            replace_existing=True,
        )
        scheduler_manager.add_job(
            collect_daily_metrics,
            trigger="cron",
            hour=4,
            minute=0,
            id="metrics_collection",
            replace_existing=True,
        )
        scheduler_manager.add_job(
            run_daily_report_job,
            trigger="cron",
            hour=5,
            minute=0,
            id="daily_report",
            replace_existing=True,
        )
        scheduler_manager.add_job(
            run_weekly_report_job,
            trigger="cron",
            day_of_week="sun",
            hour=6,
            minute=0,
            id="weekly_report",
            replace_existing=True,
        )
        scheduler_manager.add_job(
            hindsight_db.reflect,
            trigger="cron",
            hour="*/4",
            id="hindsight_reflect",
            replace_existing=True,
        )
        scheduler_manager.start()
        app.state.scheduler_manager = scheduler_manager
    yield
    if scheduler_manager is not None:
        scheduler_manager.shutdown()
        app.state.scheduler_manager = None
    await close_db_pool()


app = FastAPI(title="DevBridge API", lifespan=lifespan)

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
    expected_internal_token = os.getenv("INTERNAL_AUTH_TOKEN", "dev-token-default")
    incoming_internal_token = request.headers.get("X-Internal-Auth") or ""

    trusted_proxy_ips = {
        ip.strip()
        for ip in os.getenv("TRUSTED_PROXY_IPS", "127.0.0.1,::1,::ffff:127.0.0.1").split(",")
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
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(memory_router, prefix="/api/backend/memory", tags=["memory"])

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
async def chat(request: Request, payload: ChatRequest):
    try:
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        config = {"configurable": {"thread_id": payload.thread_id, "user_id": user_id, "repo_id": payload.repo_id}}
        input_data = {"messages": [HumanMessage(content=payload.message)]}
        result = await graph.ainvoke(input_data, config=config)
        response = str(result["messages"][-1].content)
        hindsight_memory = result.get("hindsight_memory") if isinstance(result, dict) else None
        try:
            await _persist_chat_turn(payload.repo_id, payload.thread_id, payload.message, response)
        except Exception:
            logger.exception("Failed to persist chat turn for /chat")
        _dispatch_reflection_task()

        return {
            "response": response,
            "thread_id": payload.thread_id,
            "hindsight_memory": hindsight_memory,
        }
    except HTTPException:
        raise
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
async def chat_stream(request: Request, payload: ChatRequest):
    """SSE streaming endpoint for real-time response delivery."""
    try:
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

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

                metadata_sent = {"fallback": False, "model_used": None, "cascaded": False}
                yield f"data: {json.dumps({'type': 'metadata', **metadata_sent})}\n\n"

                event_queue: asyncio.Queue[tuple[str, object | None]] = asyncio.Queue()

                async def _produce_graph_events() -> None:
                    try:
                        async with asyncio.timeout(120):
                            async for event in stream_graph_events(payload.message, payload.thread_id, user_id, repo_id=payload.repo_id):
                                await event_queue.put(("event", event))
                    except TimeoutError as timeout_error:
                        await event_queue.put(("timeout", timeout_error))
                    except Exception as error:
                        await event_queue.put(("error", error))
                    finally:
                        await event_queue.put(("done", None))

                chunk_count = 0
                accumulated_response = ""
                final_response = ""
                producer_task = asyncio.create_task(_produce_graph_events())
                try:
                    while True:
                        try:
                            item_type, item = await asyncio.wait_for(
                                event_queue.get(),
                                timeout=STREAM_HEARTBEAT_SECONDS,
                            )
                        except asyncio.TimeoutError:
                            yield ": keep-alive\n\n"
                            continue

                        if item_type == "done":
                            break
                        if item_type == "timeout":
                            logger.error("chat stream timeout after 120s for thread_id=%s", payload.thread_id)
                            if not accumulated_response:
                                yield f"data: {json.dumps({'type': 'error', 'message': 'Response timed out'})}\n\n"
                            yield f"data: {json.dumps({'type': 'done'})}\n\n"
                            return
                        if item_type == "error":
                            if isinstance(item, Exception):
                                raise item
                            raise RuntimeError("Graph stream failed")

                        event = item if isinstance(item, dict) else {}
                        extracted = _extract_metadata(event)
                        if _has_stream_metadata(extracted) and extracted != metadata_sent:
                            metadata_sent = extracted
                            yield f"data: {json.dumps({'type': 'metadata', **metadata_sent})}\n\n"

                        if not chunk_count:
                            final_response = _extract_response_text(event) or final_response

                        event_name = str(event.get("event", ""))
                        if event_name != "on_chat_model_stream":
                            continue

                        message_chunk = event.get("data", {}).get("chunk")
                        if message_chunk is None:
                            continue

                        chunk_text = _extract_chunk_text(getattr(message_chunk, "content", ""))
                        if chunk_text:
                            chunk_count += 1
                            accumulated_response += chunk_text
                            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text})}\n\n"
                            await asyncio.sleep(0.02)
                finally:
                    if not producer_task.done():
                        producer_task.cancel()

                # Fallback for providers/modes that produce no incremental chunks.
                if chunk_count == 0:
                    if not final_response:
                        config = {"configurable": {"thread_id": payload.thread_id, "user_id": user_id, "repo_id": payload.repo_id}}
                        input_data = {"messages": [HumanMessage(content=payload.message)]}
                        final_state = await asyncio.wait_for(graph.ainvoke(input_data, config=config), timeout=60)
                        final_metadata = _extract_metadata(final_state)
                        if final_metadata != metadata_sent:
                            metadata_sent = final_metadata
                            yield f"data: {json.dumps({'type': 'metadata', **metadata_sent})}\n\n"
                        final_response = _extract_response_text(final_state)

                    if final_response:
                        accumulated_response = final_response
                        yield f"data: {json.dumps({'type': 'chunk', 'content': final_response})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'error', 'message': 'No response generated'})}\n\n"

                # Send done event
                try:
                    await _persist_chat_turn(payload.repo_id, payload.thread_id, payload.message, accumulated_response)
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to initialize streaming response")
        raise HTTPException(status_code=500, detail="Streaming request failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
