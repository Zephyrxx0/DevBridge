# Project Roadmap

## Phases
- [x] **Phase 29: Memory Storage & Foundations** - Integrate Hindsight for persistent agent memory backed by pgvector (completed 2026-05-19)
- [x] **Phase 30: Speculative Router Setup** - Implement Cascadeflow for dynamic, speculative model routing (completed 2026-05-19)
- [x] **Phase 31: Memory Curation Dashboard** - Build UI for curating and editing agent mental models (completed 2026-05-19)
- [x] **Phase 32: Streaming Escalation UX** - Expose model escalation states to the frontend via SSE (completed 2026-05-19)
- [ ] **Phase 33: Behavior Pinning & Prompt Helpers** - Pin current onboarding/input behavior while extracting pure prompt-context helpers
- [ ] **Phase 34: Chat Shell & Session Boundaries** - Move session ownership and sidebar concerns out of the route shell
- [ ] **Phase 35: Typed Transport & Liveness Budgets** - Replace raw stream handling with typed events, aborts, timeouts, and terminal polling states
- [ ] **Phase 36: Repo File/Source Workspace Hooks** - Extract branch, index, file, snippet, and source navigation ownership into workspace hooks
- [ ] **Phase 37: Canonical Chat UI & Assistant Models** - Canonicalize file tree rendering and assistant message view models
- [ ] **Phase 38: Controlled OpenUI, Motion & Backend Patterns** - Adopt OpenUI, GSAP, and servercn-informed patterns only behind stable app-owned boundaries
- [ ] **Phase 39: Regression & Thermo Closure** - Prove v1.1 meets thermo stop conditions and regression coverage gates

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
- [x] 29-05-PLAN.md — Gap closure: startup smoke + Hindsight initialization contract tests
- [x] 29-06-PLAN.md — Gap closure: recall binding + retain non-blocking behavioral tests

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
**UI hint**: yes

### Phase 32: Streaming Escalation UX
**Goal**: Users are visually informed of model routing and escalation in real-time
**Depends on**: Phase 30, Phase 31
**Requirements**: UX-01
**Success Criteria**:
  1. User sees real-time UI indicators when the fast model is drafting
  2. User receives explicit visual notification via SSE events when an escalation to the big model occurs
  3. UI maintains a stable chat experience during model transitions
**Plans**:
- [x] 32-01-PLAN.md — Enrich SSE protocol and frontend message state with model metadata
- [x] 32-02-PLAN.md — Implement animated escalation indicators and E2E verification
**UI hint**: yes

### Phase 33: Behavior Pinning & Prompt Helpers
**Goal**: Users keep current onboarding and prompt-submission behavior while prompt context assembly becomes pure, typed, and testable
**Depends on**: Phase 32
**Requirements**: SHELL-03, PRMP-01, PRMP-02, PRMP-03
**Success Criteria** (what must be TRUE):
  1. User can enter chat from onboarding and complete existing onboarding flows with no changed route or completion behavior.
  2. User can compose messages with text, mentions, snippets, files, and folders and see the same sent context before and after helper extraction.
  3. User can remove file, folder, and snippet chips before send while seeing scope and cap information clearly.
  4. Tests verify the pure prompt builder returns both display artifacts and backend payloads without DOM submit events or broad ref casts.
**Plans:** 3 plans
Plans:
**Wave 1**
- [ ] 33-01-PLAN.md — Extract pure typed prompt-context contracts and exact builder tests
- [ ] 33-03-PLAN.md — Pin onboarding cached/reopen/completion behavior with tests

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 33-02-PLAN.md — Wire typed ChatInput submit, scoped chips, and route prompt builder integration
**UI hint**: yes

### Phase 34: Chat Shell & Session Boundaries
  **Goal**: Users can manage repo-scoped chat sessions through a composed route shell with named ownership boundaries
  **Depends on**: Phase 33
  **Requirements**: SHELL-01, SHELL-02, SHELL-04
  **Success Criteria** (what must be TRUE):
    1. User can create, rename, delete, switch, clear, and restore sessions for a repo without losing current repo context.
    2. User sees session-list actions separated from repo utilities while existing navigation, indexing, theme, and repo-delete access still work.
    3. The repo chat route composes named hooks/modules and no longer owns session, stream, prompt-context, branch/index, and file workspace behavior directly.
    4. Route-level changes shrink or isolate orchestration rather than growing `web/src/app/repo/[id]/page.tsx`.
  **Plans**: 3 plans
  - [ ] 34-01-PLAN.md — Update backend clear endpoint and extract useChatSessions hook
  - [ ] 34-02-PLAN.md — Update HistorySidebar UI to include app-owned dialogs/inline editing
  - [ ] 34-03-PLAN.md — Extract the heavy route orchestration into a ChatShell module
  **UI hint**: yes

### Phase 35: Typed Transport & Liveness Budgets
**Goal**: Users can stream, stop, and recover from chat/index liveness failures without permanent loading states
**Depends on**: Phase 34
**Requirements**: STRM-01, STRM-02, STRM-03
**Success Criteria** (what must be TRUE):
  1. Chat stream handling exposes typed chunk, metadata, sources, error, done, timeout, and aborted events before UI state updates.
  2. User can stop generation and see a terminal aborted state without corrupting the session or leaving a spinner.
  3. User sees recoverable error states for no-body responses, malformed events, hung streams, and auth failures.
  4. Index polling reaches visible success, failure, stale, or timeout states within max attempt or duration budgets.
**Plans**: TBD
**UI hint**: yes

### Phase 36: Repo File/Source Workspace Hooks
**Goal**: Users can rely on branch, index, file, source, and snippet state through canonical repo/file workspace ownership
**Depends on**: Phase 35
**Requirements**: FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. User can select branches, load files, expand folders, and create Monaco snippets without route-local state drift.
  2. User can click a source citation and open the right-panel viewer at the correct path and line range with model or similarity metadata.
  3. User can navigate back from source/file inspection to the prior chat workspace state predictably.
  4. Branch, indexing, selected source, selected file, snippet, and file-tree expansion behavior lives in repo/file workspace hooks.
**Plans**: TBD
**UI hint**: yes

### Phase 37: Canonical Chat UI & Assistant Models
**Goal**: Users see one canonical chat/file interface backed by typed assistant render models instead of duplicate render paths
**Depends on**: Phase 36
**Requirements**: FILE-01, RND-01
**Success Criteria** (what must be TRUE):
  1. User sees identical file tree behavior anywhere v1.1 surfaces file browsing because rendering and drag payloads use one `FileTreeView`.
  2. User sees assistant reasoning, tools, model badges, sources, errors, and markdown content rendered from a normalized `AssistantMessageViewModel`.
  3. `ChatStream` consumes typed view models, not raw transport payloads or broad render-time casts.
  4. No third file tree renderer or route-local `detectLanguage` implementation is introduced.
**Plans**: TBD
**UI hint**: yes

### Phase 38: Controlled OpenUI, Motion & Backend Patterns
**Goal**: Users get guarded OpenUI rendering, consistent accessible GSAP motion, and explicit backend-backed action states only after chat ownership boundaries are stable
**Depends on**: Phase 37
**Requirements**: RND-02, RND-03, MOTN-01, MOTN-02, MOTN-03, BKND-01, BKND-02
**Success Criteria** (what must be TRUE):
  1. User can view OpenUI Lang assistant rendering only through a guarded adapter and feature gate, with markdown fallback when payloads are invalid.
  2. OpenUI CLI exploration is reproducible via `npx @openuidev/cli@latest create`, and generated scaffold code stays out of production unless explicitly selected by adapter review.
  3. User experiences consistent sidebar, right-panel, source-jump, file-tree, and message-entry transitions using GSAP without scroll fighting.
  4. Motion respects `prefers-reduced-motion`, preserves keyboard focus, and cleans up scoped GSAP hooks/components.
  5. Backend-backed session, index, and repo utility actions expose loading, success, failure, retry, and typed error states, with servercn patterns explicitly adopted, deferred, or rejected.
**Plans**: TBD
**UI hint**: yes

### Phase 39: Regression & Thermo Closure
**Goal**: v1.1 is safe to ship because thermo stop conditions and regression coverage are closed without new structural debt
**Depends on**: Phase 38
**Requirements**: QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Thermo stop conditions pass: route shrink, no third file tree renderer, no raw stream payloads in `ChatStream`, no broad protocol casts, and no new giant files.
  2. Regression checks cover sessions, stream lifecycle, prompt context, file/source navigation, reduced motion, OpenUI fallback, and backend action errors.
  3. Code health review shows no dead adapters, hidden duplicate ownership, uncontrolled dependency growth, or new liveness paths without budgets.
  4. Documented deferrals preserve out-of-scope boundaries for agent modes, deep full-file mode, broad servercn adoption, and full OpenUI app migration.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 29. Memory Storage & Foundations | 6/6 | Complete | 2026-05-20 |
| 30. Speculative Router Setup | 4/4 | Complete | 2026-05-19 |
| 31. Memory Curation Dashboard | 4/4 | Complete | 2026-05-19 |
| 32. Streaming Escalation UX | 2/2 | Complete | 2026-05-19 |
| 33. Behavior Pinning & Prompt Helpers | 0/0 | Not started | - |
| 34. Chat Shell & Session Boundaries | 0/0 | Not started | - |
| 35. Typed Transport & Liveness Budgets | 0/0 | Not started | - |
| 36. Repo File/Source Workspace Hooks | 0/0 | Not started | - |
| 37. Canonical Chat UI & Assistant Models | 0/0 | Not started | - |
| 38. Controlled OpenUI, Motion & Backend Patterns | 0/0 | Not started | - |
| 39. Regression & Thermo Closure | 0/0 | Not started | - |
