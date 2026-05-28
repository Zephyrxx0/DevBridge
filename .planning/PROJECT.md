# DevBridge AMD Edition

## What This Is

DevBridge is a persistent, team-aware knowledge system for codebases, designed to answer: "Why does this codebase work the way it does?" Uses a multi-agent AI layer grounded in real code, human annotations, and PR history.

**Specialized for AMD GPU Infrastructure**: Optimized for single-GPU inference (MI300X) with strict VRAM partitioning for concurrent LLM serving.

## Core Value

Contextually grounded understanding and intent retrieval over simple code generation. Prioritizes deep codebase awareness through multi-agent reasoning.

## Current Milestone: v1.1 Chat System Rebuild

**Goal:** Rebuild the chat system around clearer ownership boundaries, OpenUI-powered interaction patterns where useful, GSAP-backed motion, and servercn-informed backend/component integration.

**Target features:**
- Updated chat system using OpenUI Lang and `npx @openuidev/cli@latest create` as the component exploration/install path
- Thermo review remediation for chat ownership, stream transport, prompt context assembly, file tree duplication, typed message boundaries, and liveness guardrails
- GSAP v3 animation overhaul for UI transforms, route/panel motion, chat transitions, and movement consistency
- servercn component/backend pattern review for reusable backend-backed UI surfaces and integration opportunities

## Requirements

### Validated

- [x] Interactive Frontend (Phase 06)
- [x] Tree-sitter Code Parsing (Phase 03)
- [x] Event-driven Ingestion (Phase 04, provider-agnostic)
- [x] Vector Indexing + Hybrid Search (Phase 05)
- [x] History & Intent Ingestion (Phase 07)
- [x] Human Annotation API (Phase 08)
- [x] Security Audit (Phase 11)
- [x] **AMD GPU Integration**: Single MI300X with VRAM partitioning for concurrent LLM inference
- [x] **Agent Orchestrator**: Dual-model routing (Big Model for deep reasoning, Fast Model for intent classification) (Validated in Phase 21)
- [x] **Knowledge Graph**: Internal symbol resolution with CALLS edges
- [x] **Onboarding UX**: Polling/SSE endpoint for plan generation with JSON schema validation
- [x] **GitHub Integration**: pgvector-based issue-to-file mapping, OAuth token extraction from Supabase
- [x] **Task Scheduling**: APScheduler for daily async jobs
- [x] **Admin Dashboard**: Gemma 4 summarization for "intern confusion" topics

### Active (v1.1 Milestone)

- [ ] **Chat System Rebuild**: Canonical chat workspace with extracted transport/session/prompt-context boundaries and reduced route-level orchestration
- [ ] **OpenUI Adoption**: Evaluate and integrate OpenUI-generated chat/interface components where they reduce local UI complexity without breaking established app flows
- [ ] **Motion Overhaul**: Port UI transforms and movement systems to GSAP v3 with stable, accessible animation behavior
- [ ] **Backend/Component Pattern Mapping**: Review servercn components/backend patterns and apply relevant backend-backed UI/server interaction patterns
- [ ] **Thermo Debt Closure**: Address high-priority thermo findings that block sustainable chat growth

### Out of Scope

- Multi-GPU clusters
- Stateless RAG
- Code autocompletion/generation

## Context

**Hackathon Environment**: AMD GPU cluster ($1.99/hr MI300X), 192GB VRAM, 5TB NVMe scratch disk. Budget: ~$100 total.

**Current Quality Context**: Thermo-nuclear review found the chat workspace is functional but not structurally approvable: route-level chat orchestration owns too many domains, prompt input/upload abstractions are oversized, file tree rendering is duplicated, stream/polling paths need watchdogs, and typed assistant-message boundaries are missing.

## Constraints

- **Models**: Gemini 2.5 Flash (Big), Gemma 4 (Fast) via Google AI Studio
- **Budget**: $100 total
- **Caching**: Persistent Docker volume for `/app/repo_cache`
- **Context Limit**: 48,000 tokens max per request (4.8GB KV cache)

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Google AI Studio (Gemini 2.5 Flash + Gemma 4) | Remote inference eliminates local VRAM partitioning complexity |
| 48K token context cap | Maintains consistency with previous architectural limits |
| Internal symbol resolution | Drops external/unresolvable CALLS edges |
| pgvector cosine distance | Avoids huge VRAM context spikes for issue mapping |
| APScheduler over RQ/Redis | Simpler stack, fewer external dependencies |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-29 after starting v1.1 Chat System Rebuild milestone*
