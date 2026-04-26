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
- [x] **Phase 5: Vector Index & Hybrid Search** (completed 2026-04-25)
  - [x] Plan 01: Create indexing primitives (SQL & Vector store).
  - [x] Plan 02: Wire runtime ingestion-to-search flow.
- [x] **Phase 6: Basic Chat Interface & SSE** (completed 2026-04-25)
  - [x] Create Next.js dashboard for querying.
  - [x] Implement Server-Sent Events (SSE) for streaming agent responses.

**Plans:** 2 plans

- [x] 06-01-PLAN.md — SSE streaming endpoint on backend
- [x] 06-02-PLAN.md — Frontend SSE client with typewriter effect

### Gap Closure (Post v0.1 Audit)

- [x] **Phase 12: Milestone Gap Wiring - Ingestion + Search** (completed 2026-04-26)
  - [x] Wire runtime ingestion trigger path (`ingest -> chunk -> persist`).
  - [x] Connect orchestrator `code_search` to vector similarity search.
  - [x] Close MR-01 and FR-AI-02 wiring blockers from `v0.1-v0.1-MILESTONE-AUDIT.md`.

**Plans:** 1 plan

- [x] 12-01-PLAN.md — Tracking schema, trigger logic, and agent citations

- [ ] **Phase 13: Milestone Gap Hardening - E2E + Runtime Config**
  - [ ] Add milestone E2E test: ingest sample -> index write -> chat search hit.
  - [ ] Align cloud project env usage (`GOOGLE_CLOUD_PROJECT` vs `GCP_PROJECT_ID`).
  - [ ] Re-run milestone audit gates and close remaining v0.1 flow gaps.

**Plans:** 3 plans

- [ ] 13-01-PLAN.md — E2E Test Infrastructure
- [ ] 13-02-PLAN.md — Runtime Config Unification
- [ ] 13-03-PLAN.md — Milestone Audit Verification

## Milestone 2: Team Intelligence (v0.2)
*Goal: Context awareness from annotations and history.*

- [x] **Phase 7: History & Intent Ingestion** (completed 2026-04-26)
- [ ] **Phase 8: Human Annotation API**
  - [ ] Plan 01: Annotations table + CRUD API
  - [ ] Plan 02: Retrieval integration + feedback loop
- [ ] **Phase 9: Collaborative Agents (Debug & PR Review)**

**Plans:** 3 plans
- [x] 09-01-PLAN.md — Agent Personas (PR Reviewer & Debugger)
- [x] 09-02-PLAN.md — GitHub Webhooks & Background Dispatch
- [x] 09-03-PLAN.md — Configuration & Manual Trigger API

### Phase 7: History & Intent Ingestion

**Goal:** Ingest GitHub PR and commit history to provide context for "why" code changed.

**Success Criteria:**
1. PR history available in orchestrator context.
2. Commit messages linked to code chunks.

### Phase 8: Human Annotation API

**Goal:** Implement API for human feedback and annotations on code chunks and agent responses.

**Success Criteria:**
1. CRUD API for annotations.
2. Annotations included in retrieval context.
3. Feedback loop for agent response quality.

### Phase 10: Performance & Optimization

**Goal:** Optimize query latency and ingestion throughput for production-ready performance.

**Success Criteria:**
1. LLM response time reduced through caching or parallel tool calls.
2. Ingestion pipeline handles large batches without GCS/PubSub timeouts.
3. Database query plans optimized for large-scale chunk retrieval.

## Milestone 3: Scale & Polish (v1.0)
*Goal: Production-ready performance and UX.*

- [x] **Phase 10: Performance & Optimization**
 (completed 2026-04-26)
- [ ] **Phase 14: Design website pages from spec**
  - [ ] Run /gsd-plan-phase 14 to break down into plans
- [ ] **Phase 11: Security Audit & E2E Testing**

### Phase 11: Security Audit & E2E Testing

**Goal:** Conduct security audit (App + Infra) and implement E2E tests using Playwright.

**Success Criteria:**
1. Security vulnerabilities identified and documented.
2. Automated security scanners integrated into build process.
3. Full ingestion loop verified end-to-end via Playwright.

**Plans:** 2 plans

- [ ] 11-01-PLAN.md — Security Audit & Automated Scanning
- [ ] 11-02-PLAN.md — E2E Testing Framework & Ingestion Loop

### Phase 14: Design website pages from spec

**Goal:** Design website pages from spec
**Depends on**: Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 14 to break down)

---
*Last updated: 2026-04-26*
