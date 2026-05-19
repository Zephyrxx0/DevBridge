# Requirements: v0.3 Integrate Cascadeflow & Hindsight

## Active Requirements

### Routing
- [x] **ROUT-01**: User can experience dynamic model routing (Gemma to Gemini 2.5 Flash) via Cascadeflow speculative execution.
- [x] **ROUT-02**: System implements standard rate-limit handling for Gemini 2.5 Flash requests via Google AI Studio.

### Memory
- [x] **MEM-01**: System invokes Hindsight recall() before execution and retain() post-execution for agent memory.
- [x] **MEM-02**: System points Hindsight embedded mode to existing Supabase pgvector instance for unified storage.
- [x] **MEM-03**: System offloads Hindsight reflect() operation to APScheduler to prevent UI blocking.
- [ ] **MEM-04**: User can curate and edit agent memory via a Memory Dashboard UI.

### UX
- [ ] **UX-01**: User can view Cascadeflow model escalation states via SSE frontend display.

## Future Requirements (Deferred)
- None

## Out of Scope
- Running Hindsight as a separate docker container (too much overhead for budget).
- Dual-model routing inside LangGraph intent router (replaced by Cascadeflow).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUT-01 | Phase 30 | Complete |
| ROUT-02 | Phase 30 | Complete |
| MEM-01 | Phase 29 | Complete |
| MEM-02 | Phase 29 | Complete |
| MEM-03 | Phase 29 | Complete |
| MEM-04 | Phase 31 | Pending |
| UX-01 | Phase 32 | Pending |
