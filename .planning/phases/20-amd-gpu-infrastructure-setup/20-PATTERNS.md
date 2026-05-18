# Phase 20: AMD GPU Infrastructure Setup - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 8
**Analogs found:** 6 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/core/config.py` | config | configuration | `api/core/config.py` | exact |
| `api/utils/tokenizer.py` | utility | transform | `api/ingestion/tree_sitter_chunker.py` | role-match |
| `api/routes/chats.py` | route | request-response | `api/routes/chats.py` | exact |
| `scripts/download_models.sh` | script | file-I/O | `scripts/security_scan.sh` | role-match |
| `tests/test_phase20_truncation.py` | test | transform | `tests/test_chunking_phase03.py` | role-match |
| `tests/test_phase20_config.py` | test | configuration | `tests/test_chunking_phase03.py` | partial |
| `docker-compose.yml` | config | N/A | None | N/A |
| `api/requirements.txt` | config | N/A | None | N/A |

## Pattern Assignments

### `api/core/config.py` (config, configuration)

**Analog:** `api/core/config.py`

**Core Pattern: Settings extension** (lines 75-81):
```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_connection_string: str = Field(default="", validation_alias="SUPABASE_CONNECTION_STRING")
    google_cloud_project: str | None = Field(default=None, validation_alias="GOOGLE_CLOUD_PROJECT")
    github_webhook_secret: str | None = Field(default=None, validation_alias="GITHUB_WEBHOOK_SECRET")
    env: str = Field(default="development", validation_alias="ENV")
```
**Planner Action:** Add `max_context_tokens`, `big_model_port`, and `fast_model_port` configurations here.

---

### `api/utils/tokenizer.py` (utility, transform)

**Analog:** `api/ingestion/tree_sitter_chunker.py`

**Imports and Core Pattern** (lines 3-10):
```python
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from api.ingestion.types import CodeChunk, make_chunk, normalize_file_path
```

**Function pattern** (lines 20-25):
```python
def detect_language(file_path: str) -> str:
    suffix = Path(file_path).suffix.lower()
    if suffix not in LANGUAGE_BY_SUFFIX:
        raise ValueError(f"Unsupported file extension: {suffix}")
    return LANGUAGE_BY_SUFFIX[suffix]
```

---

### `api/routes/chats.py` (route, request-response)

**Analog:** `api/routes/chats.py`

**Core CRUD/Route pattern with error handling** (lines 62-90):
```python
@router.post("/repo/{repo_id}/chats")
async def create_chat(repo_id: str, payload: ChatSessionCreate, request: Request):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=500, detail="Database engine not initialized")

    if payload.repo_id != repo_id:
        raise HTTPException(status_code=400, detail="repo_id mismatch")

    user_id = getattr(request.state, "user_id", None)
    title = (payload.title or "New chat").strip() or "New chat"

    # ... DB operations ...
    try:
        async with engine.connect() as conn:
            # ...
            return dict(row._mapping)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Chat create unavailable: {exc}")
```
**Planner Action:** Integrate tokenizer truncation and API calls to separate model endpoints in `/chats/{session_id}/messages` handler, following FastAPI route conventions.

---

### `scripts/download_models.sh` (script, file-I/O)

**Analog:** `scripts/security_scan.sh`

**Bash Script Pattern** (lines 1-8):
```bash
#!/bin/bash
# Security Scan Script for DevBridge
# Unified entry point for automated security scanning.

set -e

echo "Starting Security Scan..."
```

---

### `tests/test_phase20_truncation.py` & `tests/test_phase20_config.py` (test, transform/configuration)

**Analog:** `tests/test_chunking_phase03.py`

**Imports and Function Test pattern** (lines 3-9, 137-142):
```python
from __future__ import annotations

from dataclasses import dataclass

import pytest

# ...

def test_chunk_schema_and_deterministic_id() -> None:
    chunk_a = make_chunk(
        # ... setup ...
    )

    assert chunk_a.chunk_id == chunk_b.chunk_id
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docker-compose.yml` | config | N/A | No existing docker-compose orchestration in root directory. Refer to RESEARCH.md pattern 1. |
| `api/requirements.txt` | config | N/A | Standard python package file, simple append. |

## Shared Patterns

### Error Handling
**Source:** `api/routes/chats.py`
**Apply to:** All new route handler logic
```python
    try:
        # Operations
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Operation unavailable: {exc}")
```

## Metadata

**Analog search scope:** `api/`, `tests/`, `scripts/`, `**/docker-compose*.yml`
**Files scanned:** 6
**Pattern extraction date:** 2026-05-09