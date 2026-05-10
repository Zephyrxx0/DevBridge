# ROADMAP

## Milestone 1: Foundational Bridge (v0.1) — COMPLETED
*Goal: E2E RAG pipeline with basic ingestion and single-agent search.*

- [x] **Phase 1: Project Skeleton & Core Orchestrator** (completed 2026-04-16)
- [x] **Phase 2: Data Foundation & Secret Management** (completed 2026-04-17)
- [x] **Phase 3: Code Parsing with Tree-sitter** (completed 2026-04-18)
- [x] **Phase 4: Event-Driven Ingestion Triggers** (completed 2026-04-24)
- [x] **Phase 5: Vector Index & Hybrid Search** (completed 2026-04-25)
- [x] **Phase 6: Basic Chat Interface & SSE** (completed 2026-04-25)
- [x] **Phase 7: History & Intent Ingestion** (completed 2026-04-26)
- [x] **Phase 12: Milestone Gap Wiring - Ingestion + Search** (completed 2026-04-26)
- [x] **Phase 13: Milestone Gap Hardening - E2E + Runtime Config** (completed 2026-04-26)
- [x] **Phase 15: WebUI Design Update** (completed 2026-04-27)
- [x] **Phase 17: Vercel Deployment** (completed 2026-04-27)

---

## Milestone 2: AMD GPU Integration (v0.2) — IN PROGRESS
*Goal: Multi-agent AI with dual-model routing on AMD MI300X GPU.*

### Phase 20: AMD GPU Infrastructure Setup
**Goal**: Configure single MI300X with VRAM partitioning and Docker volume for cache.
**Requirements**: IR-01, IR-02, IR-03
**Depends on**: None (new phase)
**Plans**: 3 plans

**Wave 1**
- [x] 20-01-PLAN.md — VRAM partitioning config (0.60/0.20/0.20) and context cap enforcement

**Wave 2 *(blocked on Wave 1 completion)***
- [x] 20-02-PLAN.md — Docker volume binding for persistent `/app/repo_cache`

**Wave 3 *(Gap Closure)***
- [x] 20-03-PLAN.md — Restore Vertex AI Embedding Continuity (D-03)

**Cross-cutting constraints:**
- System context limit: 48,000 tokens
- ROCm docker base image required


**Success Criteria**:
1. Big Model uses ≤60% VRAM
2. Fast Model uses ≤20% VRAM
3. No request exceeds 48K tokens

### Phase 21: Dual-Model Agent Orchestrator
**Goal**: Implement agent routing with Big Model (deep reasoning) and Fast Model (intent classification).
**Requirements**: MR-01, MR-02, FR-01
**Depends on**: Phase 20
**Plans**: 3 plans
- [x] 21-01-PLAN.md — Multi-Agent Foundation & Fast Path
- [x] 21-02-PLAN.md — Big Model Integration & Fallback
- [x] 21-03-PLAN.md — SSE Integration & UI Signaling

**Success Criteria**:
1. Intent classification responds in <5s
2. Fallback succeeds within 30s timeout
3. Both models load concurrently without OOM

### Phase 22: Knowledge Graph with Internal Resolution
**Goal**: Build graph with internal symbol resolution, dropping external/unresolvable CALLS edges.
**Requirements**: FR-02
**Depends on**: Phase 03 (code parsing)
**Plans**: 2 plans
- [x] 22-01-PLAN.md — Graph storage schema (repo_graph table with JSONB)
- [x] 22-02-PLAN.md — Internal symbol resolution: resolve only local definitions

**Success Criteria**:
1. CALLS edges only connect internal symbols
2. Unresolvable calls dropped silently
3. Graph updates on repo re-index

### Phase 23: Onboarding UX Improvements
**Goal**: AI-powered onboarding plan generator for repositories with SSE status updates and strict JSON validation.
**Requirements**: FR-03
**Depends on**: Phase 06 (SSE streaming)
**Plans**: 3 plans
- [x] 23-01-PLAN.md — Backend: SSE endpoint, Onboarding Agent, and DB caching
- [x] 23-02-PLAN.md — Frontend: SSE client integration and structured plan UI components
- [x] 23-03-PLAN.md — Gap Closure: Contract alignment, retrieval path, and React fixes

**Success Criteria**:
1. Frontend receives intermediate loading states
2. Generated plan conforms to JSON schema
3. Retry with exponential backoff on failure
4. Cached plans retrievable via standard GET

### Phase 24: GitHub Integration — IN PROGRESS
**Goal**: Issue-to-file mapping via pgvector, OAuth token extraction from Supabase.
**Requirements**: FR-04
**Depends on**: Phase 05 (vector search)
**Plans**: 2 plans
- [ ] 24-01-PLAN.md — Auth, Schema, and Migration
- [ ] 24-02-PLAN.md — Scheduler & Agent Tooling

**Success Criteria**:
1. Issue search returns relevant files
2. Uses user's OAuth token, not shared PAT
3. No VRAM spikes from large context

### Phase 25: Task Scheduling
**Goal**: APScheduler for daily async jobs (sync, cleanup, metrics).
**Requirements**: FR-05
**Depends on**: None (new phase)
**Plans**: 1 plan
- [ ] 25-01-PLAN.md — APScheduler integration in FastAPI

**Success Criteria**:
1. Daily sync job runs without manual trigger
2. Cache cleanup job prevents disk bloat

### Phase 26: Admin Dashboard
**Goal**: AI summarization of "intern confusion" topics using Gemma 4.
**Requirements**: FR-06
**Depends on**: Phase 21 (Fast Model available)
**Plans**: 1 plan
- [ ] 26-01-PLAN.md — Topic extraction and summarization dashboard

**Success Criteria**:
1. Dashboard shows confusion topics
2. Gemma 4 generates summaries
3. No pgvector clustering needed initially

---

## Milestone 3: Production Polish (v1.0)
*Goal: Production-ready performance, security, and UX.*

- [ ] **Phase 10: Performance & Optimization** — Optimize latency and throughput
- [ ] **Phase 11: Security Audit & E2E Testing** — Full security review
- [ ] **Phase 14: Design website pages** — Landing, code browser, PR dashboard
- [ ] **Phase 16: Premium SaaS Redesign** — Complete UI polish

---

*Last updated: 2026-05-11 - Phase 23 gap closure plan added*
