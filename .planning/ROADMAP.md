# Project Roadmap

## Phases
- [x] **Phase 29: Memory Storage & Foundations** - Integrate Hindsight for persistent agent memory backed by pgvector (completed 2026-05-19)
- [x] **Phase 30: Speculative Router Setup** - Implement Cascadeflow for dynamic, speculative model routing (completed 2026-05-19)
- [x] **Phase 31: Memory Curation Dashboard** - Build UI for curating and editing agent mental models (completed 2026-05-19)
- [ ] **Phase 32: Streaming Escalation UX** - Expose model escalation states to the frontend via SSE

## Phase Details

### Phase 29: Memory Storage & Foundations
**Goal**: System has persistent biomimetic agent memory using Hindsight without blocking execution
**Depends on**: None
**Requirements**: MEM-01, MEM-02, MEM-03
**Success Criteria**:
  1. System initializes Hindsight using the existing Supabase pgvector instance for unified storage
  2. Agent workflows retrieve contextual priming by invoking `recall()` before execution
  3. System saves interaction history by offloading `reflect()` to an asynchronous APScheduler job
**Plans**:
- [x] 29-01-PLAN.md — Setup Hindsight dependencies, isolated DB schema, and test scaffold
- [x] 29-02-PLAN.md — Define memory state in AgentState and implement HindsightManager service
- [x] 29-03-PLAN.md — Integrate recall/retain nodes into LangGraph and schedule async reflection
- [x] 29-04-PLAN.md — Enforce authentication in chat endpoints and implement isolation tests

### Phase 30: Speculative Router Setup
**Goal**: System dynamically routes to the large model only when necessary to preserve GPU VRAM
**Depends on**: Phase 29
**Requirements**: ROUT-01, ROUT-02
**Success Criteria**:
  1. System uses Cascadeflow to let the fast model (Gemma) draft responses and validates them heuristically
  2. System automatically escalates entire conversation turns to the big model (Gemini 2.5 Flash) on validation failure
  3. System implements standard rate-limit handling for Gemini 2.5 Flash requests via Google AI Studio
**Plans**:
- [x] 30-01-PLAN.md — Setup Cascadeflow dependencies, validation schemas, and test scaffold
- [x] 30-02-PLAN.md — Implement speculative cascade node with Pydantic validation
- [x] 30-03-PLAN.md — Integrate cascade node into LangGraph agent workflow
- [x] 30-04-PLAN.md — Fix escalation logic and implement robust routing tests (GAP CLOSURE)

### Phase 31: Memory Curation Dashboard
**Goal**: Users can view and manage the agent's long-term memory via a dashboard
**Depends on**: Phase 29
**Requirements**: MEM-04
**Success Criteria**:
  1. User can access a Memory Dashboard UI to view stored "Experiences" and "World Facts"
  2. User can edit or delete specific memory entries
  3. Curated memory updates take effect immediately in subsequent agent interactions
**Plans**:
- [x] 31-01-PLAN.md — Memory Backend API with List and Delete endpoints
- [x] 31-02-PLAN.md — Dashboard Foundation and Navigation
- [x] 31-03-PLAN.md — Memory Management UI (Listing and Deletion)
- [x] 31-04-PLAN.md — Memory Editing and Direct Updates

### Phase 32: Streaming Escalation UX
**Goal**: Users are visually informed of model routing and escalation in real-time
**Depends on**: Phase 30, Phase 31
**Requirements**: UX-01
**Success Criteria**:
  1. User sees real-time UI indicators when the fast model is drafting
  2. User receives explicit visual notification via SSE events when an escalation to the big model occurs
  3. UI maintains a stable chat experience during model transitions
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 29. Memory Storage & Foundations | 4/4 | Complete    | 2026-05-19 |
| 30. Speculative Router Setup | 4/4 | Complete   | 2026-05-19 |
| 31. Memory Curation Dashboard | 4/4 | Complete   | 2026-05-19 |
| 32. Streaming Escalation UX | 0/0 | Not started | - |
