# ROADMAP

## Milestone 1: Foundational Bridge (v0.1)
*Goal: E2E RAG pipeline with basic ingestion and single-agent search.*

- [ ] **Phase 1: Environment & Orchestration**
  - [ ] Initialize Next.js & FastAPI project structure.
  - [ ] Configure Supabase `pgvector` and GCP Secret Manager.
  - [ ] Implement basic Orchestrator with Gemini 1.5 Flash.
- [ ] **Phase 2: Semantic Ingestion**
  - [ ] Integrate Tree-sitter for `.ts` and `.py`.
  - [ ] Implement GCS → Cloud Run Job ingestion flow.
  - [ ] Basic vector indexing with `text-embedding-004`.
- [ ] **Phase 3: Grounded Search**
  - [ ] Implement Search agent with hybrid retrieval.
  - [ ] Create simple Next.js frontend for querying.

## Milestone 2: Team Intelligence (v0.2)
*Goal: Context awareness from annotations and history.*

- [ ] **Phase 4: Intent Ingestion**
  - [ ] Index git commit history and PR descriptions.
  - [ ] Implement Human Annotation API.
- [ ] **Phase 5: Collaborative Agents**
  - [ ] Build Debug agent using annotations context.
  - [ ] Build PR Review agent.
- [ ] **Phase 6: Advanced Dashboard**
  - [ ] Monaco editor integration.
  - [ ] Multi-agent "Thought" visualization.

## Milestone 3: Scale & Polish (v1.0)
*Goal: Production-ready performance and UX.*

- [ ] **Phase 7: Performance Optimization**
  - [ ] Implement caching for common intent queries.
  - [ ] Transition to Gemini 1.5 Pro for complex orchestration if needed.
- [ ] **Phase 8: Security & Governance**
  - [ ] Row Level Security (RLS) deep audit.
  - [ ] Comprehensive E2E test suite.

---
*Last updated: 2026-04-15*
