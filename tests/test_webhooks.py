import hmac
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.fixture
def webhook_secret(monkeypatch):
    secret = "test_secret"
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", secret)
    # Also need to make sure the app uses this secret if it's cached in settings
    from api.core.config import settings
    monkeypatch.setattr(settings, "github_webhook_secret", secret)
    return secret

def test_webhook_missing_signature():
    response = client.post("/webhooks/github", json={"action": "opened"})
    assert response.status_code == 401

def test_webhook_invalid_signature(webhook_secret):
    headers = {"x-hub-signature-256": "sha256=invalid"}
    response = client.post("/webhooks/github", json={"action": "opened"}, headers=headers)
    assert response.status_code == 401

def test_webhook_valid_signature(webhook_secret):
    payload = {
        "action": "opened",
        "pull_request": {
            "number": 1,
            "title": "Test PR",
            "base": {"repo": {"full_name": "test/repo"}},
            "head": {"sha": "abc"}
        }
    }
    body = json.dumps(payload, separators=(',', ':'))
    signature = hmac.new(
        webhook_secret.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "x-hub-signature-256": f"sha256={signature}",
        "x-github-event": "pull_request",
        "Content-Type": "application/json"
    }
    
    response = client.post("/webhooks/github", content=body, headers=headers)
    assert response.status_code == 202
