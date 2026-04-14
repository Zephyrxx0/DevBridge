import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from api.agents.orchestrator import Orchestrator

load_dotenv()

app = FastAPI(title="DevBridge API")
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
