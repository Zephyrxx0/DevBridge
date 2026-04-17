# DevBridge Setup, Run, and Test Guide (Phases 1-2)

This guide gives step-by-step setup and validation instructions for everything implemented up through Phase 2.

## 1. Prerequisites

1. Install Git.
2. Install Node.js 20+ and npm.
3. Install Python 3.12.
4. Optional but recommended: install Google Cloud SDK (`gcloud`) for GCP auth checks.

## 2. Clone and Open the Project

1. Clone the repo.
2. Open the project root in a terminal:

```powershell
git clone <your-repo-url> DevBridge
cd DevBridge
```

## 3. Backend Setup (API)

Use the project venv for all Python tasks.

1. Create venv with Python 3.12:

```powershell
py -3.12 -m venv .venv
```

2. Activate venv:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Upgrade pip:

```powershell
python -m pip install --upgrade pip
```

4. Install API dependencies:

```powershell
python -m pip install -r api/requirements.txt
```

## 4. Frontend Setup (Web)

1. Install web dependencies:

```powershell
cd web
npm install
cd ..
```

## 5. Environment Configuration

1. Copy `.env.example` to `.env` in project root.
2. Fill values as needed:
- `SUPABASE_CONNECTION_STRING` for DB/vector setup.
- `GOOGLE_CLOUD_PROJECT` if using GCP Secret Manager.
- `GOOGLE_APPLICATION_CREDENTIALS` only if using a local service account key.

Notes:
- If `GOOGLE_CLOUD_PROJECT` is not set, local env/.env fallback is used.
- If GCP credentials are unavailable, orchestrator falls back to mock LLM behavior.

## 6. What Is Complete Through Phase 2

1. Phase 1: project skeleton + basic orchestrator loop.
2. Phase 2:
- Secret/config system with pydantic-settings and GCP Secret Manager source.
- Async DB engine lifecycle via FastAPI lifespan.
- LangChain Postgres vector store wiring.
- SQL setup helper script for vector extension.
- Startup import compatibility fix and smoke test.

## 7. Run the Backend

From project root with venv activated:

```powershell
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Health check endpoint:

```text
GET http://localhost:8000/
```

Expected response includes `status: online`.

## 8. Run the Frontend

From project root:

```powershell
cd web
npm run dev
```

Open:

```text
http://localhost:3000
```

## 9. Execute All Tests Up to Now

From project root with venv activated:

1. Run full test suite:

```powershell
python -m pytest tests -q
```

2. Run startup smoke test only:

```powershell
python -m pytest tests/test_startup_import.py -q
```

3. Run secrets and vector tests only:

```powershell
python -m pytest tests/test_secrets.py tests/test_vector_db.py -q
```

## 10. Runtime Smoke Checks

From project root with venv activated:

1. Verify app imports cleanly:

```powershell
python -c "from api.main import app; print(app.title)"
```

Expected output:

```text
DevBridge API
```

2. Optional API quick check (new terminal while uvicorn is running):

```powershell
curl http://localhost:8000/
```

## 11. Database Prep Notes (Phase 2)

If you are preparing pgvector manually, use:

- `sql/setup_vector_store.sql`

Core SQL in that file:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Optional HNSW example index is documented in the file.
```

## 12. Troubleshooting

1. `ModuleNotFoundError` for Python packages:
- Ensure venv is activated.
- Re-run `python -m pip install -r api/requirements.txt`.

2. Pydantic core / DLL issues:
- Use Python 3.12 venv (not Python 3.14 alpha).

3. GCP credential warnings:
- Expected in local mode without GCP auth; mock LLM fallback is used.

4. Frontend cannot call backend:
- Confirm backend is running on port 8000.
- Confirm frontend env points to `http://localhost:8000`.

## 13. Phase Status

Phase 2 is closed in planning artifacts:
- `.planning/ROADMAP.md` marks Phase 2 complete.
- `.planning/STATE.md` advances focus to Phase 3.
