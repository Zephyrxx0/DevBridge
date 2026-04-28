from typing import List, Optional
from datetime import datetime
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from api.db.session import get_engine
from api.db.vector_store import vector_db

router = APIRouter(tags=["annotations"])
logger = logging.getLogger(__name__)

VALID_TAGS = {"warning", "architecture", "gotcha", "todo", "context", "deprecated"}

class AnnotationCreate(BaseModel):
    repo_id: str
    file_path: str
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    comment: str
    tags: Optional[List[str]] = []

class AnnotationUpdate(BaseModel):
    comment: Optional[str] = None
    tags: Optional[List[str]] = None

class AnnotationResponse(BaseModel):
    id: str
    repo_id: str
    file_path: str
    start_line: Optional[int]
    end_line: Optional[int]
    author_id: str
    comment: str
    tags: List[str]
    upvotes: int
    created_at: datetime

def validate_tags(tags: List[str]):
    for t in tags:
        if t not in VALID_TAGS:
            valid = ", ".join(sorted(VALID_TAGS))
            raise HTTPException(status_code=400, detail=f"Invalid tag: {t}. Must be one of {{{valid}}}")


def validate_line_range(start_line: Optional[int], end_line: Optional[int]) -> None:
    if start_line is not None and start_line <= 0:
        raise HTTPException(status_code=400, detail="start_line must be greater than 0")
    if end_line is not None and end_line <= 0:
        raise HTTPException(status_code=400, detail="end_line must be greater than 0")
    if start_line is not None and end_line is not None and end_line < start_line:
        raise HTTPException(status_code=400, detail="end_line must be greater than or equal to start_line")

def get_current_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return str(user_id)


@router.post("/annotation", response_model=AnnotationResponse)
async def create_annotation(annotation: AnnotationCreate, request: Request):
    if annotation.tags:
        validate_tags(annotation.tags)
    validate_line_range(annotation.start_line, annotation.end_line)
    user_id = get_current_user_id(request)
    
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
        
    embedding = None
    try:
        if not vector_db._vectorstore:
            vector_db.initialize()
        if vector_db._vectorstore:
            embedding = await asyncio.to_thread(
                vector_db._vectorstore.embedding_service.embed_query,
                annotation.comment,
            )
    except Exception:
        logger.warning("Annotation embedding generation failed; continuing without embedding")

    async with engine.connect() as conn:
        insert_sql = text("""
            INSERT INTO annotations (repo_id, file_path, start_line, end_line, author_id, comment, tags, embedding)
            VALUES (:repo_id, :file_path, :start_line, :end_line, :author_id, :comment, :tags, CAST(:embedding AS vector))
            RETURNING id, repo_id, file_path, start_line, end_line, author_id, comment, tags, upvotes, created_at
        """)
        
        try:
            result = await conn.execute(insert_sql, {
                "repo_id": annotation.repo_id,
                "file_path": annotation.file_path,
                "start_line": annotation.start_line,
                "end_line": annotation.end_line,
                "author_id": user_id,
                "comment": annotation.comment,
                "tags": annotation.tags or [],
                "embedding": embedding,
            })
            await conn.commit()
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=500, detail="Failed to create annotation")
            return dict(row._mapping)
        except HTTPException:
            await conn.rollback()
            raise
        except Exception:
            await conn.rollback()
            logger.exception("Failed to create annotation")
            raise HTTPException(status_code=500, detail="Failed to create annotation")

@router.get("/annotations/{repo_id}", response_model=List[AnnotationResponse])
async def list_annotations(repo_id: str, file_path: Optional[str] = None, tags: Optional[str] = None):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
        
    search_tags = tags.split(",") if tags else []
    
    # We build the where clause and order by dynamically
    query = """
        SELECT
            id,
            repo_id,
            file_path,
            start_line,
            end_line,
            author_id,
            comment,
            tags,
            upvotes,
            created_at,
            CASE
                WHEN :tag_count > 0 AND tags && CAST(:search_tags AS text[]) THEN 1
                ELSE 0
            END AS tag_match
        FROM annotations
        WHERE repo_id = :repo_id
    """
    
    if file_path:
        query += " AND file_path = :file_path"
    
    if search_tags:
        query += " AND tags && CAST(:search_tags AS text[])"
        
    # Rank by exact file match, tag relevance, then upvotes.
    query += """
        ORDER BY 
            (file_path = :file_path_match) DESC,
            tag_match DESC,
            upvotes DESC
    """
    
    async with engine.connect() as conn:
        try:
            result = await conn.execute(text(query), {
                "repo_id": repo_id,
                "file_path": file_path,
                "search_tags": search_tags,
                "tag_count": len(search_tags),
                "file_path_match": file_path or ""
            })
            rows = result.fetchall()
            return [dict(row._mapping) for row in rows]
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to list annotations")
            raise HTTPException(status_code=500, detail="Failed to list annotations")

@router.patch("/annotation/{id}", response_model=AnnotationResponse)
async def update_annotation(id: str, update_data: AnnotationUpdate, request: Request):
    if update_data.tags is not None:
        validate_tags(update_data.tags)
    user_id = get_current_user_id(request)
        
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
        
    async with engine.connect() as conn:
        # Verify ownership
        check_sql = text("SELECT author_id FROM annotations WHERE id = :id")
        result = await conn.execute(check_sql, {"id": id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Annotation not found")
            
        if str(row[0]) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this annotation")
            
        # Update
        updates = []
        params = {"id": id}
        
        if update_data.comment is not None:
            updates.append("comment = :comment")
            params["comment"] = update_data.comment
            
        if update_data.tags is not None:
            updates.append("tags = :tags")
            params["tags"] = update_data.tags
            
        if not updates:
            # Nothing to update, return the existing
            select_sql = text("SELECT * FROM annotations WHERE id = :id")
            result = await conn.execute(select_sql, {"id": id})
            return dict(result.fetchone()._mapping)
            
        update_sql = text(f"""
            UPDATE annotations 
            SET {", ".join(updates)}
            WHERE id = :id
            RETURNING id, repo_id, file_path, start_line, end_line, author_id, comment, tags, upvotes, created_at
        """)
        
        try:
            result = await conn.execute(update_sql, params)
            await conn.commit()
            return dict(result.fetchone()._mapping)
        except HTTPException:
            await conn.rollback()
            raise
        except Exception:
            await conn.rollback()
            logger.exception("Failed to update annotation")
            raise HTTPException(status_code=500, detail="Failed to update annotation")

@router.delete("/annotation/{id}", status_code=204)
async def delete_annotation(id: str, request: Request):
    user_id = get_current_user_id(request)
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
        
    async with engine.connect() as conn:
        # Verify ownership
        check_sql = text("SELECT author_id FROM annotations WHERE id = :id")
        result = await conn.execute(check_sql, {"id": id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Annotation not found")
            
        if str(row[0]) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this annotation")
            
        delete_sql = text("DELETE FROM annotations WHERE id = :id")
        try:
            await conn.execute(delete_sql, {"id": id})
            await conn.commit()
        except HTTPException:
            await conn.rollback()
            raise
        except Exception:
            await conn.rollback()
            logger.exception("Failed to delete annotation")
            raise HTTPException(status_code=500, detail="Failed to delete annotation")

@router.post("/annotation/{id}/upvote")
async def upvote_annotation(id: str):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")
        
    async with engine.connect() as conn:
        update_sql = text("""
            UPDATE annotations 
            SET upvotes = upvotes + 1
            WHERE id = :id
            RETURNING id, upvotes
        """)
        
        try:
            result = await conn.execute(update_sql, {"id": id})
            await conn.commit()
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Annotation not found")
            return {"id": row[0], "upvotes": row[1]}
        except HTTPException:
            await conn.rollback()
            raise
        except Exception:
            await conn.rollback()
            logger.exception("Failed to upvote annotation")
            raise HTTPException(status_code=500, detail="Failed to upvote annotation")
