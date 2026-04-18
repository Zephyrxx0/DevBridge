# ROADMAP

## Milestone 1: Foundational Bridge (v0.1)
*Goal: E2E RAG pipeline with basic ingestion and single-agent search.*

- [x] **Phase 1: Project Skeleton & Core Orchestrator**
 (completed 2026-04-16)
  - [x] Initialize Next.js & FastAPI project structure.
  - [x] Implement basic ReAct loop with Gemini 1.5 Flash.
- [x] **Phase 2: Data Foundation & Secret Management**
 (completed 2026-04-17)
  - [x] Configure Supabase `pgvector` extension.
  - [x] Implement GCP Secret Manager integration for API keys.
- [x] **Phase 3: Code Parsing with Tree-sitter**
 (completed 2026-04-18)
  - [x] Implement chunking logic for .ts and .py using Tree-sitter.
  - [x] Define metadata schema for code chunks.
  - [x] Plan 01: Ingestion contracts and scoped file discovery.
  - [x] Plan 02: Tree-sitter semantic chunker with hybrid fallback.
- [ ] **Phase 4: GCS & Pub/Sub Ingestion Triggers**
  - [ ] Setup GCS bucket for code snapshots.
  - [ ] Implement Pub/Sub triggered Cloud Run Job flow.
- [ ] **Phase 5: Vector Indexing & Hybrid Search**
  - [ ] Integrate `text-embedding-004` logic into ingestion.
  - [ ] Implement PostgreSQL hybrid search functions.
- [ ] **Phase 6: Basic Chat Interface & SSE**
  - [ ] Create Next.js dashboard for querying.
  - [ ] Implement Server-Sent Events (SSE) for streaming agent responses.

## Milestone 2: Team Intelligence (v0.2)
*Goal: Context awareness from annotations and history.*

- [ ] **Phase 7: History & Intent Ingestion**
- [ ] **Phase 8: Human Annotation API**
- [ ] **Phase 9: Collaborative Agents (Debug & PR Review)**

## Milestone 3: Scale & Polish (v1.0)
*Goal: Production-ready performance and UX.*

- [ ] **Phase 10: Performance & Optimization**
- [ ] **Phase 11: Security Audit & E2E Testing**

---
*Last updated: 2026-04-18*
