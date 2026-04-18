# REQUIREMENTS

## Functional

### AI & Agents
- [ ] **Orchestrator Agent**: Multi-step planning and tool routing.
- [ ] **Search Agent**: Hybrid search over `pgvector` and file metadata.
- [ ] **Debug Agent**: Explaining errors by tracing code logic and PR history.
- [ ] **PR Review Agent**: Context-aware review based on existing human annotations.

### Knowledge System
- [ ] **Code Ingestion**: Parse `.ts`, `.py`, `.go` files into semantic chunks via Tree-sitter.
- [ ] **Human Annotations**: API to attach/retrieve persistent comments on code blocks.
- [ ] **History Analysis**: Indexing git commit messages and PR descriptions for intent retrieval.

### Interface
- [ ] **Streaming Dashboard**: Real-time display of agent activities and final grounded answers.
- [ ] **Code Navigator**: View indexed code chunks alongside their AI-generated "Why" summaries.

## Non-Functional

### Performance
- [ ] **Latency**: Initial agent response within 2 seconds.
- [ ] **Throughput**: Support concurrent ingestion of up to 10 files via parallel Cloud Run Job tasks.

### Reliability
- [ ] **Groundedness**: Zero hallucinations for "Why" queries; system must say "I don't know" if intent is not found.
- [ ] **Persistence**: Database state preserved in Supabase; raw files in GCS.

### Security
- [ ] **Secret Hygiene**: No hardcoded API keys; use GCP Secret Manager.
- [ ] **Isolation**: Each user/team data isolated at the row level in Supabase RLS.

## Table Stakes
- [ ] Next.js project setup with Tailwind.
- [ ] FastAPI backend with Vertex AI integration.
- [ ] Supabase project with `pgvector` enabled.
- [ ] GitHub Actions for deployment to Cloud Run.

## Milestone v0.1 Gap Traceability

| Milestone Requirement | Current Status | Gap Evidence | Planned Closure Phase |
|-----------------------|----------------|--------------|-----------------------|
| MR-01 E2E RAG pipeline with basic ingestion + search | unsatisfied | Ingestion/search not wired end-to-end in runtime flow | Phase 12, Phase 13 |
| MR-02 Supabase pgvector foundation | partial | Vector foundation exists but not connected to orchestrator retrieval path | Phase 12 |
| FR-AI-02 Search agent over pgvector + metadata | unsatisfied | `code_search` tool remains mock-backed | Phase 12 |
| Runtime cloud config consistency | high-risk | Env key mismatch can force mock fallback | Phase 13 |

### Gap Closure Acceptance Criteria

- [ ] Runtime path supports ingest -> chunk -> vector persist without manual test harness.
- [ ] Orchestrator search tool executes real vector similarity query and returns grounded hits.
- [ ] End-to-end test validates ingest/index/search flow from API boundary.
- [ ] Cloud project env configuration is unified across config and orchestrator modules.

---
*Last updated: 2026-04-18 after milestone gap planning*
