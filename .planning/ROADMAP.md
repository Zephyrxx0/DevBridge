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
**Plans**: 4 plans

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

### Phase 24: GitHub Integration — COMPLETED (2026-05-16)
**Goal**: Issue-to-file mapping via pgvector, OAuth token extraction from Supabase.
**Requirements**: FR-04
**Depends on**: Phase 05 (vector search)
**Plans**: 2 plans
- [x] 24-01-PLAN.md — Auth, Schema, and Migration
- [x] 24-02-PLAN.md — Scheduler & Agent Tooling

**Success Criteria**:
1. Issue search returns relevant files
2. Uses user's OAuth token, not shared PAT
3. No VRAM spikes from large context

### Phase 25: Task Scheduling — COMPLETED (2026-05-16)
**Goal**: APScheduler for daily async jobs (sync, cleanup, metrics).
**Requirements**: FR-05, FR-06
**Depends on**: None (new phase)
**Plans**: 2 plans
- [x] 25-01-PLAN.md — Infrastructure (JobStore, Scheduler, Locking logic, History table)
- [x] 25-02-PLAN.md — Job implementation (Sync, Cleanup, Metrics) and Reports Hub

**Success Criteria**:
1. Daily sync job runs without manual trigger
2. Cache cleanup job prevents disk bloat
3. Reports Hub serves intelligence reports

### Phase 26: Admin Dashboard
**Goal**: AI summarization of "intern confusion" topics using Gemma 4.
**Requirements**: FR-06
**Depends on**: Phase 21, Phase 25
**Plans**: 3 plans

**Wave 0**
- [x] 26-00-PLAN.md — Test Scaffolding (Wave 0)

**Wave 1**
- [x] 26-01-PLAN.md — Backend: Auth, API, Generator refactor, and security verification

**Wave 2**
- [x] 26-02-PLAN.md — Frontend: Admin Dashboard UI

**Wave 3 *(Gap Closure)***
- [x] 26-03-PLAN.md — Gap closure: strict `is_admin` enforcement (remove internal-token bypass)

**Success Criteria**:
1. Dashboard shows confusion topics scoped by repository
2. Admin access strictly enforced via `is_admin` role
3. Markdown reports rendered correctly in the UI

---

## Milestone 3: Production Polish (v1.0)
*Goal: Production-ready performance, security, and UX.*

- [ ] **Phase 10: Performance & Optimization** — Optimize latency and throughput
- [ ] **Phase 11: Security Audit & E2E Testing** — Full security review
- [ ] **Phase 14: Design website pages** — Landing, code browser, PR dashboard
- [ ] **Phase 16: Premium SaaS Redesign** — Complete UI polish

### Phase 27: Model Migration: Replace Qwen with Google AI Studio (Gemini) and Clean Up Local Dependencies
**Goal**: Transition model inference from local Qwen models (running on AMD GPUs) to Google AI Studio (Gemini) while maintaining Gemma integration for testing and development.
**Requirements**: MR-01 (Refactored), MR-04 (New: Google AI Studio Integration)
**Depends on**: Phase 21
**Plans**: 2 plans

**Wave 1**
- [ ] 27-01-PLAN.md — Google AI Studio Integration (SDK, Config, and Orchestrator update)

**Wave 2**
- [ ] 27-02-PLAN.md — Infrastructure Cleanup (Docker, VRAM removal, Weights purge)

**Success Criteria**:
1. Qwen model dependencies and configuration removed from orchestrator and docker setup.
2. Google AI Studio (Gemini) integrated as the primary "Big Model" reasoning engine.
3. Application fully functional using external Google AI Studio API.
4. Gemma integration preserved as local or API-based fallback/fast-path.

### Phase 28: UI Overhaul: Landing Page, Chat Interface, and Global Polishing
**Goal**: Revitalize the frontend user experience with a modern, cohesive design across the landing page, chat interface, and dashboard components.
**Requirements**: FR-07 (New: UI Polishing)
**Depends on**: Phase 15, Phase 26
**Plans**: 7 plans

**Wave 0**
- [x] 28-00-PLAN.md — Test Scaffolding & AI Elements Init

**Wave 1**
- [x] 28-01-PLAN.md — Global Layout, Theme & Design Tokens
- [x] 28-02-PLAN.md — Landing Page Overhaul (Premium Polish)

**Wave 2**
- [x] 28-03-PLAN.md — Chat Interface: Modular Component Decomposition

**Wave 3**
- [x] 28-04-PLAN.md — Chat Interface: AI Elements Stream & Input integration

**Wave 4**
- [x] 28-05-PLAN.md — Chat Interface: Advanced Agent Feedback & Artifacts

**Wave 5**
- [x] 28-06-PLAN.md — Global Polishing & Mobile Optimization

**Wave 6 *(Gap Closure)***
- [x] 28-07-PLAN.md — Resilience, Optimization & Extended Polish

**Success Criteria**:
1. Landing page redesigned with modern aesthetics and clear value proposition.
2. Chat interface updated for better readability and interactive token streaming feedback.
3. Consistent design system (shadcn/ui) applied globally across all pages.
4. Mobile responsiveness improved for core user flows.

---

*Last updated: 2026-05-18 - Phase 28 plans created*
