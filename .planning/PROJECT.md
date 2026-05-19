# DevBridge AMD Edition

## What This Is

DevBridge is a persistent, team-aware knowledge system for codebases, designed to answer: "Why does this codebase work the way it does?" Uses a multi-agent AI layer grounded in real code, human annotations, and PR history.

**Specialized for AMD GPU Infrastructure**: Optimized for single-GPU inference (MI300X) with strict VRAM partitioning for concurrent LLM serving.

## Core Value

Contextually grounded understanding and intent retrieval over simple code generation. Prioritizes deep codebase awareness through multi-agent reasoning.

## Current Milestone: v0.3 Integrate Cascadeflow & Hindsight

**Goal:** Integrate Cascadeflow and Hindsight into the application in a faithful and optimized way.

**Target features:**
- Integrate Cascadeflow (https://github.com/lemony-ai/cascadeflow)
- Integrate Hindsight (https://github.com/vectorize-io/hindsight)

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

### Active (v0.3 Milestone)

- [ ] **Cascadeflow Integration**: Faithful and optimized integration
- [ ] **Hindsight Integration**: Faithful and optimized integration

### Out of Scope

- Multi-GPU clusters
- Stateless RAG
- Code autocompletion/generation

## Context

**Hackathon Environment**: AMD GPU cluster ($1.99/hr MI300X), 192GB VRAM, 5TB NVMe scratch disk. Budget: ~$100 total.

## Constraints

- **GPU**: Single MI300X, 192GB VRAM, strict partitioning (0.60/0.20/0.20)
- **Models**: Qwen2.5-72B-Instruct-AWQ (Big), Gemma-2-9B-it (Fast)
- **Budget**: $100 total (~50 hours of MI300X)
- **Caching**: Persistent Docker volume for `/app/repo_cache`
- **Context Limit**: 48,000 tokens max per request (4.8GB KV cache)

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Single GPU with VRAM partitioning | Budget constraint: $1.99/hr MI300X vs multi-GPU |
| Qwen2.5-72B + Gemma-4-9B | Balance of reasoning capability vs. latency |
| 48K token context cap | Prevents KV cache OOM on shared GPU |
| Internal symbol resolution | Drops external/unresolvable CALLS edges |
| pgvector cosine distance | Avoids huge VRAM context spikes for issue mapping |
| APScheduler over RQ/Redis | Simpler stack, fewer external dependencies |

---

*Last updated: 2026-05-10 - Phase 21 complete (dual-model orchestrator validated)*
