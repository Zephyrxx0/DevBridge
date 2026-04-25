from contextlib import asynccontextmanager
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

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    _ = app
    if settings.supabase_connection_string:
        await init_db_pool(settings.supabase_connection_string)
    yield
    await close_db_pool()


app = FastAPI(title="DevBridge API", lifespan=lifespan)
orchestrator = Orchestrator()

# Configure CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default-thread"

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "DevBridge API",
        "version": "0.1.0"
    }

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = await orchestrator.chat(request.message, request.thread_id)
        return {
            "response": response,
            "thread_id": request.thread_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """SSE streaming endpoint for real-time response delivery."""
    try:
        # Generator that yields SSE events for streaming responses
        async def event_generator():
            try:
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
                error_message = str(e)
                yield f"data: {json.dumps({'type': 'error', 'message': f'Streaming error: {error_message}'})}\n\n"
        
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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
