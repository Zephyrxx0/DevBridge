from typing import Optional
from contextlib import asynccontextmanager
import logging
import os
import secrets as pysecrets
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

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default-thread"
    repo_id: Optional[str] = None

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
        return {
            "response": response,
            "thread_id": request.thread_id
        }
    except Exception as e:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=500, detail="Chat request failed")


@app.post("/chat/stream")
@cache(expire=3600, namespace="chat_stream", key_builder=repo_id_key_builder)
async def chat_stream(request: ChatRequest):
    """SSE streaming endpoint for real-time response delivery."""
    try:
        # Generator that yields SSE events for streaming responses
        async def event_generator():
            try:
                # Send optimization metadata first (D-08)
                metadata = {
                    "type": "metadata",
                    "using_cache": False,  # Note: @cache decorator handles this transparently
                    "optimization": "parallel"
                }
                yield f"data: {json.dumps(metadata)}\n\n"

                # Get the LLM with streaming support
                llm = orchestrator.llm
                from langchain_core.messages import HumanMessage
                
                # Create config for checkpointing
                config = {"configurable": {"thread_id": request.thread_id}}
                input_data = {"messages": [HumanMessage(content=request.message)]}
                
                # Check if LLM supports streaming
                if hasattr(llm, 'astream'):
                    # Stream using astream
                    accumulated_content = ""
                    async for event in orchestrator.graph.astream(input_data, config=config):
                        if "messages" in event:
                            last_msg = event["messages"][-1]
                            if hasattr(last_msg, "content"):
                                new_content = last_msg.content
                                # Get only the new portion since last chunk
                                if new_content and len(new_content) > len(accumulated_content):
                                    chunk = new_content[len(accumulated_content):]
                                    accumulated_content = new_content
                                    if chunk:
                                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
                                        await asyncio.sleep(0.02)
                    
                    # Send done event
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                else:
                    # Fallback: non-streaming
                    response = await orchestrator.chat(request.message, request.thread_id)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': response})}\n\n"
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
