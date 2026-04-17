import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
