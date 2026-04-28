import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from api.db.session import get_engine

router = APIRouter(tags=["questions"])


class QuestionCreate(BaseModel):
    repo_id: str
    thread_id: str | None = None
    question: str
    answer: str
    sources: list[dict] = []


class QuestionResponse(BaseModel):
    id: str
    repo_id: str
    thread_id: str | None
    question: str
    answer: str
    sources: list[dict]
    created_at: datetime


@router.post("/questions", response_model=QuestionResponse)
async def create_question(payload: QuestionCreate):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    query = text(
        """
        INSERT INTO questions (repo_id, thread_id, question, answer, sources)
        VALUES (CAST(:repo_id AS uuid), :thread_id, :question, :answer, CAST(:sources AS jsonb))
        RETURNING id, repo_id, thread_id, question, answer, sources, created_at
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            query,
            {
                "repo_id": payload.repo_id,
                "thread_id": payload.thread_id,
                "question": payload.question,
                "answer": payload.answer,
                "sources": json.dumps(payload.sources or []),
            },
        )
        await conn.commit()
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to save question")
        return dict(row._mapping)
