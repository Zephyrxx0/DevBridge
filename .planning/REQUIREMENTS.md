# Requirements: v0.3 Integrate Cascadeflow & Hindsight

## Active Requirements

### Routing
- [ ] **ROUT-01**: User can experience dynamic model routing (Gemma to Qwen) via Cascadeflow speculative execution.
- [ ] **ROUT-02**: System enforces concurrency limits on Big model (Qwen) requests to prevent OOM.

### Memory
- [ ] **MEM-01**: System invokes Hindsight recall() before execution and retain() post-execution for agent memory.
- [ ] **MEM-02**: System points Hindsight embedded mode to existing Supabase pgvector instance for unified storage.
- [ ] **MEM-03**: System offloads Hindsight reflect() operation to APScheduler to prevent UI blocking.
- [ ] **MEM-04**: User can curate and edit agent memory via a Memory Dashboard UI.

### UX
- [ ] **UX-01**: User can view Cascadeflow model escalation states via SSE frontend display.

## Future Requirements (Deferred)
- None

## Out of Scope
- Running Hindsight as a separate docker container (too much overhead for budget).
- Dual-model routing inside LangGraph intent router (replaced by Cascadeflow).

## Traceability
*(To be filled by roadmap)*
