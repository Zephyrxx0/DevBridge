# DevBridge Documentation

DevBridge is repo intelligence platform.

Goal: answer "why code works this way" using code chunks, annotations, PR history, ingestion metadata.

## What this docs site covers

- System architecture and data flow.
- Product capabilities (chat, map, search, annotations, PR review).
- Backend (FastAPI, orchestrator, routes, auth context middleware).
- Frontend (Next.js app routes and core components).
- Database model and SQL migrations.
- Ingestion, embeddings, retrieval pipeline.
- Setup, local run, testing, deployment, security, operations.

Start here for user-facing workflows: [Project Capabilities](project-capabilities.md)

## Quick Start

```powershell
# from repo root
npm install
npx docsify-cli serve docs
```

Open `http://localhost:3000` for docs preview.

## Source of truth files

- `DEVBRIDGE_SPEC.md`
- `DEVBRIDGE_IMPLEMENTATION_SPEC.md`
- `SETUP.md`
- `SETUP_AND_TEST_GUIDE.md`
- `api/main.py`
- `api/routes/*.py`
- `sql/migrations/*.sql`

Use sidebar for full map.
