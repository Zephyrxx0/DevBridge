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
- [x] **Phase 4: GCS & Pub/Sub Ingestion Triggers**
  (completed 2026-04-24)
  - [x] Setup GCS bucket for code snapshots.
  - [x] Implement Pub/Sub triggered Cloud Run Job flow.

### Phase 4: GCS & Pub/Sub Ingestion Triggers

**Goal:** Setup GCS bucket for code snapshots and implement Pub/Sub triggered Cloud Run Job flow for ingestion.

**Requirements:** No explicit requirements mapped (infrastructure setup)

**Plans:** 2 plans

- [x] 04-01-PLAN.md — GCS bucket and Pub/Sub topic configuration
- [x] 04-02-PLAN.md — Pub/Sub triggered Cloud Run Job for ingestion
- [x] **Phase 5: Vector Indexing & Hybrid Search** (completed 2026-04-25)
  - [x] Plan 01: Create indexing primitives (SQL & Vector store).
  - [x] Plan 02: Wire runtime ingestion-to-search flow.
- [ ] **Phase 6: Basic Chat Interface & SSE**
  - [ ] Create Next.js dashboard for querying.
  - [ ] Implement Server-Sent Events (SSE) for streaming agent responses.

### Gap Closure (Post v0.1 Audit)

- [ ] **Phase 12: Milestone Gap Wiring - Ingestion + Search**
  - [ ] Wire runtime ingestion trigger path (`ingest -> chunk -> persist`).
  - [ ] Connect orchestrator `code_search` to vector similarity search.
  - [ ] Close MR-01 and FR-AI-02 wiring blockers from `v0.1-v0.1-MILESTONE-AUDIT.md`.
- [ ] **Phase 13: Milestone Gap Hardening - E2E + Runtime Config**
  - [ ] Add milestone E2E test: ingest sample -> index write -> chat search hit.
  - [ ] Align cloud project env usage (`GOOGLE_CLOUD_PROJECT` vs `GCP_PROJECT_ID`).
  - [ ] Re-run milestone audit gates and close remaining v0.1 flow gaps.

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
