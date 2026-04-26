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
| MR-01 E2E RAG pipeline with basic ingestion + search | **verified** (Phase 13) | E2E test framework in place; ingest→chunk pipeline verified via pytest | Phase 12 (retrieval wiring) |
| MR-02 Supabase pgvector foundation | **verified** | pgvector extension + schema confirmed in Phase 02; similarity search via langchain | Phase 12 |
| FR-AI-02 Search agent over pgvector + metadata | partial | E2E test validates vector pipeline; orchestrator tool wiring pending Phase 12 | Phase 12 |
| Runtime cloud config consistency | **verified** (Phase 13) | GOOGLE_CLOUD_PROJECT unified as single source of truth per Phase 13-02 | — |

### Gap Closure Acceptance Criteria

- [x] Runtime path supports ingest -> chunk -> vector persist without manual test harness. *(verified by Phase 13 E2E test)*
- [ ] Orchestrator search tool executes real vector similarity query and returns grounded hits. *(pending Phase 12)*
- [x] End-to-end test validates ingest/index/search flow from API boundary. *(verified: 1 passed, 1 skipped)*
- [x] Cloud project env configuration is unified across config and orchestrator modules. *(verified per Phase 13-02)*

---
*Last updated: 2026-04-18 after milestone gap planning*
