import pytest
from uuid import uuid4, UUID
from fastapi import HTTPException
from api.routes import pr as pr_routes
from api.db.models import RepoConfig

class FakeRow:
    def __init__(self, mapping: dict):
        self._mapping = mapping
    def __getitem__(self, key):
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
        self.configs = {}
    async def execute(self, stmt, params=None):
        sql = str(stmt)
        params = params or {}
        if "INSERT" in sql:
            self.configs[params["repo_id"]] = params["review_depth"]
            return FakeResult([{"repo_id": UUID(params["repo_id"]), "review_depth": params["review_depth"]}])
        if "SELECT" in sql:
            depth = self.configs.get(params["repo_id"])
            if depth:
                return FakeResult([{"repo_id": UUID(params["repo_id"]), "review_depth": depth}])
            return FakeResult([])
        return FakeResult([])
    async def commit(self): pass
    async def rollback(self): pass

class FakeEngine:
    def __init__(self, conn):
        self.conn = conn
    def connect(self):
        class Context:
            def __init__(self, conn): self.conn = conn
            async def __aenter__(self): return self.conn
            async def __aexit__(self, *args): pass
        return Context(self.conn)

@pytest.mark.asyncio
async def test_pr_config_lifecycle(monkeypatch):
    conn = FakeConnection()
    engine = FakeEngine(conn)
    monkeypatch.setattr("api.db.models.get_engine", lambda: engine)
    
    repo_id = str(uuid4())
    
    # Test update
    updated = await pr_routes.update_config(
        pr_routes.PRConfigUpdate(repo_id=repo_id, review_depth="deep")
    )
    assert updated["review_depth"] == "deep"
    
    # Test get
    fetched = await pr_routes.get_config(repo_id)
    assert fetched["review_depth"] == "deep"

@pytest.mark.asyncio
async def test_pr_analyze_trigger(monkeypatch):
    # Mock the PR reviewer agent trigger
    async def fake_invoke(input_data, config=None):
        from langchain_core.messages import AIMessage
        return {"messages": [AIMessage(content="Review complete")]}
    
    class FakeAgent:
        async def ainvoke(self, input_data, config=None):
            return await fake_invoke(input_data, config)
            
    monkeypatch.setattr("api.routes.pr.create_pr_reviewer_agent", lambda: FakeAgent())
    
    # Mock RepoConfig.get_config to return default
    monkeypatch.setattr("api.db.models.get_engine", lambda: None)
    
    repo_id = str(uuid4())
    pr_number = 42
    
    result = await pr_routes.analyze_pr(
        pr_routes.PRAnalyzeRequest(repo_id=repo_id, pr_number=pr_number)
    )
    assert "Review complete" in result["summary"]
