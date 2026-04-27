from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from api.agents.orchestrator import Orchestrator
from api.db.models import Annotation
from api.routes import annotations as annotation_routes


class FakeRow:
    def __init__(self, mapping: dict):
        self._mapping = mapping

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self._mapping.values())[key]
        return self._mapping[key]


class FakeResult:
    def __init__(self, rows: list[dict]):
        self._rows = [FakeRow(r) for r in rows]

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class FakeConnection:
    def __init__(self):
        self.rows: dict[str, dict] = {}

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        params = params or {}

        if "INSERT INTO annotations" in sql:
            annotation_id = str(uuid4())
            row = {
                "id": annotation_id,
                "repo_id": params["repo_id"],
                "file_path": params["file_path"],
                "start_line": params["start_line"],
                "end_line": params["end_line"],
                "author_id": params["author_id"],
                "comment": params["comment"],
                "tags": params["tags"],
                "upvotes": 0,
                "created_at": datetime.now(timezone.utc),
            }
            self.rows[annotation_id] = row
            return FakeResult([row])

        if "SELECT author_id FROM annotations" in sql:
            row = self.rows.get(params["id"])
            return FakeResult([{"author_id": row["author_id"]}] if row else [])

        if "SELECT * FROM annotations WHERE id" in sql:
            row = self.rows.get(params["id"])
            return FakeResult([row] if row else [])

        if "SET upvotes = upvotes + 1" in sql:
            row = self.rows.get(params["id"])
            if not row:
                return FakeResult([])
            row["upvotes"] += 1
            return FakeResult([{"id": row["id"], "upvotes": row["upvotes"]}])

        if "UPDATE annotations" in sql and "RETURNING id, repo_id" in sql:
            row = self.rows.get(params["id"])
            if not row:
                return FakeResult([])
            if "comment" in params:
                row["comment"] = params["comment"]
            if "tags" in params:
                row["tags"] = params["tags"]
            return FakeResult([row])

        if "DELETE FROM annotations" in sql:
            self.rows.pop(params["id"], None)
            return FakeResult([])

        if "FROM annotations" in sql and "WHERE repo_id = :repo_id" in sql:
            repo_rows = [r for r in self.rows.values() if r["repo_id"] == params["repo_id"]]
            if params.get("file_path"):
                repo_rows = [r for r in repo_rows if r["file_path"] == params["file_path"]]
            if params.get("search_tags"):
                tag_set = set(params["search_tags"])
                repo_rows = [r for r in repo_rows if tag_set.intersection(r["tags"])]
            repo_rows = sorted(repo_rows, key=lambda r: r["upvotes"], reverse=True)
            return FakeResult(repo_rows)

        raise AssertionError(f"Unexpected SQL in fake DB: {sql}")

    async def commit(self):
        return None

    async def rollback(self):
        return None


class FakeEngineContext:
    def __init__(self, conn: FakeConnection):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeEngine:
    def __init__(self, conn: FakeConnection):
        self.conn = conn

    def connect(self):
        return FakeEngineContext(self.conn)


def make_request(user_id: str):
    return SimpleNamespace(state=SimpleNamespace(user_id=user_id))


@pytest.mark.asyncio
async def test_annotation_crud_operations(monkeypatch):
    conn = FakeConnection()
    engine = FakeEngine(conn)
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: engine)

    created = await annotation_routes.create_annotation(
        annotation_routes.AnnotationCreate(
            repo_id=str(uuid4()),
            file_path="api/main.py",
            start_line=1,
            end_line=20,
            comment="Watch startup lifespan behavior",
            tags=["warning"],
        ),
        request=make_request("00000000-0000-0000-0000-000000000001"),
    )

    listed = await annotation_routes.list_annotations(created["repo_id"], file_path="api/main.py")
    assert len(listed) == 1
    assert listed[0]["comment"] == "Watch startup lifespan behavior"

    updated = await annotation_routes.update_annotation(
        created["id"],
        annotation_routes.AnnotationUpdate(comment="Updated", tags=["context"]),
        request=make_request("00000000-0000-0000-0000-000000000001"),
    )
    assert updated["comment"] == "Updated"

    upvoted = await annotation_routes.upvote_annotation(created["id"])
    assert upvoted["upvotes"] == 1

    await annotation_routes.delete_annotation(
        created["id"], request=make_request("00000000-0000-0000-0000-000000000001")
    )
    assert created["id"] not in conn.rows


@pytest.mark.asyncio
async def test_annotation_update_rejects_non_author(monkeypatch):
    conn = FakeConnection()
    engine = FakeEngine(conn)
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: engine)

    created = await annotation_routes.create_annotation(
        annotation_routes.AnnotationCreate(
            repo_id=str(uuid4()),
            file_path="api/main.py",
            comment="Author-owned annotation",
            tags=["context"],
        ),
        request=make_request("00000000-0000-0000-0000-000000000001"),
    )

    with pytest.raises(HTTPException) as exc:
        await annotation_routes.update_annotation(
            created["id"],
            annotation_routes.AnnotationUpdate(comment="malicious overwrite"),
            request=make_request("00000000-0000-0000-0000-000000000099"),
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_annotation_requires_auth_context(monkeypatch):
    conn = FakeConnection()
    engine = FakeEngine(conn)
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: engine)

    with pytest.raises(HTTPException) as exc:
        await annotation_routes.create_annotation(
            annotation_routes.AnnotationCreate(
                repo_id=str(uuid4()),
                file_path="api/main.py",
                comment="Missing auth",
                tags=["context"],
            ),
            request=SimpleNamespace(state=SimpleNamespace()),
        )

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_upvote_missing_annotation_returns_404(monkeypatch):
    conn = FakeConnection()
    engine = FakeEngine(conn)
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: engine)

    with pytest.raises(HTTPException) as exc:
        await annotation_routes.upvote_annotation(str(uuid4()))

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_annotations_ranked(monkeypatch):
    captured = {}

    class QueryConn(FakeConnection):
        async def execute(self, stmt, params=None):
            captured["sql"] = str(stmt)
            captured["params"] = params or {}
            now = datetime.now(timezone.utc)
            rows = [
                {
                    "id": uuid4(),
                    "repo_id": UUID(captured["params"]["repo_id"]),
                    "file_path": "api/routes/annotations.py",
                    "start_line": 10,
                    "end_line": 30,
                    "author_id": uuid4(),
                    "comment": "Prefer validated tags",
                    "tags": ["warning"],
                    "upvotes": 3,
                    "created_at": now,
                }
            ]
            return FakeResult(rows)

    conn = QueryConn()
    monkeypatch.setattr("api.db.models.get_engine", lambda: FakeEngine(conn))

    repo_id = uuid4()
    rows = await Annotation.get_annotations(
        repo_id=repo_id,
        file_path="api/routes/annotations.py",
        tags=["warning"],
        limit=5,
    )

    assert rows[0].file_path == "api/routes/annotations.py"
    assert rows[0].upvotes == 3
    assert "ORDER BY file_match DESC, tag_match DESC, upvotes DESC" in captured["sql"]
    assert captured["params"]["limit"] == 5


def test_annotation_model_format():
    annotation = Annotation(
        id=uuid4(),
        repo_id=uuid4(),
        file_path="api/main.py",
        start_line=12,
        end_line=18,
        author_id=uuid4(),
        comment="Keep this route registered for annotation endpoints.",
        tags=["context", "architecture"],
        upvotes=2,
        created_at=datetime.now(timezone.utc),
    )

    formatted = annotation.format_for_llm()
    assert "@context, architecture" in formatted
    assert "line 12-18" in formatted
    assert "2 helpful votes" in formatted


@pytest.mark.asyncio
async def test_assemble_context_includes_annotations(monkeypatch):
    annotation = Annotation(
        id=uuid4(),
        repo_id=uuid4(),
        file_path="api/agents/orchestrator.py",
        start_line=20,
        end_line=50,
        author_id=uuid4(),
        comment="Include this context for why-intent prompts.",
        tags=["context"],
        upvotes=1,
        created_at=datetime.now(timezone.utc),
    )

    async def _fake_get_annotations(**kwargs):
        _ = kwargs
        return [annotation]

    monkeypatch.setattr("api.agents.orchestrator.Annotation.get_annotations", _fake_get_annotations)

    orchestrator = Orchestrator()
    output = await orchestrator.assemble_context(
        query="why context",
        repo_id=str(uuid4()),
        code_results=[
            {
                "file_path": "api/agents/orchestrator.py",
                "start_line": 1,
                "end_line": 60,
                "snippet": "async def chat(...)",
            }
        ],
    )

    assert "## Annotations (team knowledge)" in output
    assert "Include this context for why-intent prompts." in output


def test_tag_filter_validation():
    annotation_routes.validate_tags(["warning", "todo"])

    with pytest.raises(HTTPException):
        annotation_routes.validate_tags(["invalid-tag"])


def test_line_range_validation():
    annotation_routes.validate_line_range(1, 2)

    with pytest.raises(HTTPException):
        annotation_routes.validate_line_range(10, 2)

    with pytest.raises(HTTPException):
        annotation_routes.validate_line_range(0, 2)
