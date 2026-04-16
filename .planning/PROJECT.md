# DevBridge

## What This Is

DevBridge is a persistent, team-aware knowledge system for codebases, designed to answer the question: "Why does this codebase work the way it does?" It uses a multi-agent AI layer grounded in real code, human annotations, and PR history to provide deep context and understanding for developers.

## Core Value

DevBridge prioritizes contextually grounded understanding and intent retrieval over simple code generation or autocompletion.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Multi-Agent AI Layer**: Orchestrator, Search, Debug, and PR Review agents using Gemini 1.5 Flash.
- [ ] **GCP Infrastructure**: Serverless backend on Cloud Run, GCS snapshots, and Pub/Sub queues.
- [ ] **Ingestion Pipeline**: Automated file parsing and semantic chunking using Tree-sitter.
- [ ] **RAG Pipeline**: Vector search integration using Supabase and `pgvector`.
- [ ] **Interactive Frontend**: Next.js dashboard with Monaco editor and SSE for streaming responses.
- [ ] **Annotation System**: Persistent human-written metadata attached to code chunks.

### Out of Scope

- **Code Autocompletion**: Explicitly focused on understanding rather than generation.
- **Enterprise-Scale Infrastructure**: Focused on Hackathon-ready GCP Free Tier implementation.
- **Stateless RAG**: Deliberately avoiding statelessness in favor of accumulated memory.

## Context

DevBridge is being built for the Google Solutions Hackathon. It addresses the gap in developer onboarding and complex codebase maintenance by capturing not just the 'how' but the 'why' behind code changes. It leverages Gemini 1.5 Flash's long context window and Vertex AI's text-embedding-004.

## Constraints

- **Stack**: Next.js/Tailwind (Frontend), FastAPI/Python (Backend), Supabase (Database).
- **AI**: Gemini 1.5 Flash (LLM), `text-embedding-004` (Embeddings).
- **Budget**: Must fit within GCP Always Free Tier or $300 account credits.
- **Security**: Secret Manager for all keys; no secrets in environment variables.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Agentic Loop over Pipeline | ReAct pattern allows strategy selection based on query type | — Pending |
| Semantic Chunking | Functions/classes are better units than tokens for reasoning | — Pending |
| Scale-to-Zero | Essential for cost control in GCP Free Tier | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-16 after phase 01 completion*
