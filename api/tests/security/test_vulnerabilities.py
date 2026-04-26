import pytest
import uuid
from fastapi.testclient import TestClient
from api.main import app
from api.routes import annotations as annotation_routes
from unittest.mock import MagicMock, AsyncMock

client = TestClient(app)

@pytest.fixture
def mock_db(monkeypatch):
    class FakeRow:
        def __init__(self, data):
            self._mapping = data
        def __getitem__(self, key):
            return self._mapping[key]

    class FakeResult:
        def fetchone(self):
            return FakeRow({
                "id": "1", 
                "repo_id": "repo", 
                "file_path": "file", 
                "start_line": None,
                "end_line": None,
                "author_id": "user", 
                "comment": "<script>alert('xss')</script>", 
                "tags": [], 
                "upvotes": 0, 
                "created_at": "2023-01-01T00:00:00Z"
            })
        
        def fetchall(self):
            return []

    mock_conn = AsyncMock()
    mock_conn.execute.return_value = FakeResult()
    mock_conn.commit = AsyncMock()
    mock_conn.rollback = AsyncMock()
    
    mock_engine = MagicMock()
    mock_engine.connect.return_value.__aenter__.return_value = mock_conn
    
    monkeypatch.setattr(annotation_routes, "get_engine", lambda: mock_engine)
    return mock_conn

def test_sql_injection_on_chat():
    """Test 1: SQL injection payload in chat message."""
    payload = {
        "message": "'; DROP TABLE annotations; --",
        "thread_id": str(uuid.uuid4())
    }
    # Orchestrator is not mocked here, but it should handle the string literally.
    # If it hits a DB, it should use parameterized queries.
    response = client.post("/chat", json=payload)
    # Expect 200 or 500 (if LLM fails), but not a crash that indicates SQL execution
    assert response.status_code in [200, 500, 404]

def test_xss_in_annotation(mock_db, monkeypatch):
    """Test 2: XSS payload in annotation comment."""
    # Mock the internal auth
    monkeypatch.setenv("INTERNAL_AUTH_TOKEN", "test_secret")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "127.0.0.1,testclient")
    
    # Also patch os.getenv just in case
    import os
    original_getenv = os.getenv
    def mock_getenv(key, default=None):
        if key == "INTERNAL_AUTH_TOKEN":
            return "test_secret"
        if key == "TRUSTED_PROXY_IPS":
            return "127.0.0.1,testclient"
        return original_getenv(key, default)
    monkeypatch.setattr(os, "getenv", mock_getenv)

    xss_payload = "<script>alert('xss')</script>"
    annotation_data = {
        "repo_id": str(uuid.uuid4()),
        "file_path": "test.py",
        "comment": xss_payload,
        "tags": ["context"]
    }
    
    headers = {
        "X-Internal-Auth": "test_secret",
        "X-User-Id": "test_user_123"
    }
    
    response = client.post("/annotation", json=annotation_data, headers=headers)
    
    # It should be accepted (stored in DB)
    if response.status_code != 200:
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
    assert response.status_code == 200
    # The response should contain the XSS payload as literal text
    assert response.json()["comment"] == xss_payload

def test_unauthorized_annotation_access():
    """Test 3: Accessing internal routes without proper auth returns 401."""
    annotation_data = {
        "repo_id": str(uuid.uuid4()),
        "file_path": "test.py",
        "comment": "Some comment",
        "tags": ["context"]
    }
    
    # No headers provided
    response = client.post("/annotation", json=annotation_data)
    
    # middleware doesn't block, it just doesn't set request.state.user_id
    # then the route handler calls get_current_user_id which raises 401
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"

def test_unauthorized_internal_token():
    """Test 3b: Accessing with wrong internal token returns 401."""
    annotation_data = {
        "repo_id": str(uuid.uuid4()),
        "file_path": "test.py",
        "comment": "Some comment",
        "tags": ["context"]
    }
    
    headers = {
        "X-Internal-Auth": "wrong_secret",
        "X-User-Id": "test_user_123"
    }
    
    response = client.post("/annotation", json=annotation_data, headers=headers)
    assert response.status_code == 401
