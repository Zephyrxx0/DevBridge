# Requirements: v1.1 Chat System Rebuild

**Defined:** 2026-05-29
**Core Value:** Contextually grounded understanding and intent retrieval over simple code generation.

## v1.1 Requirements

Requirements for the chat system rebuild milestone. Each maps to exactly one roadmap phase.

### Chat Shell

- [ ] **SHELL-01**: Route page becomes a composition shell; session, stream, prompt context, branch/index, and file workspace behavior move to named hooks/modules.
- [ ] **SHELL-02**: User can create, rename, delete, switch, clear, and restore chat sessions per repo without losing current repo context.
- [ ] **SHELL-03**: User keeps existing onboarding entry and completion behavior after the chat refactor.
- [ ] **SHELL-04**: Sidebar separates session-list actions from repo utilities while preserving existing navigation, indexing, theme, and repo-delete access.

### Transport And Liveness

- [ ] **STRM-01**: Chat stream transport exposes typed events for chunk, metadata, sources, error, done, timeout, and aborted states.
- [ ] **STRM-02**: User can stop generation and recover from stream errors, no-body responses, malformed events, hung streams, and auth failures without a permanent spinner.
- [ ] **STRM-03**: Index polling has max attempt or duration budgets and terminal success, failure, stale, or timeout UI states.

### Prompt Context

- [ ] **PRMP-01**: Prompt context builder is pure and tested, returning display artifacts plus backend prompt payload for text, mentions, snippets, files, and folders.
- [ ] **PRMP-02**: Chat input submits through an explicit typed callback, not synthetic DOM submit events or broad ref casts.
- [ ] **PRMP-03**: File, folder, and snippet chips show scope, caps, and removable sent context clearly before send.

### File And Source Workspace

- [ ] **FILE-01**: File tree rendering and drag payload creation use one canonical `FileTreeView`.
- [ ] **FILE-02**: Source citation click opens the right-panel viewer with path, line range, model or similarity metadata, and stable back behavior.
- [ ] **FILE-03**: Branch selection, file loading, selected source/file state, Monaco snippet creation, and file tree expansion live in repo/file workspace hooks.

### Assistant Rendering

- [ ] **RND-01**: Assistant messages normalize into a typed `AssistantMessageViewModel` before rendering reasoning, tools, model badges, sources, errors, and markdown content.
- [ ] **RND-02**: OpenUI Lang assistant rendering is available behind a guarded adapter and feature gate with markdown fallback on invalid OpenUI payloads.
- [ ] **RND-03**: OpenUI CLI exploration is documented with `npx @openuidev/cli@latest create`; scaffold code does not enter production unless selected by adapter review.

### Motion And Accessibility

- [ ] **MOTN-01**: GSAP is the canonical motion system for chat workspace surfaces touched in v1.1.
- [ ] **MOTN-02**: Motion respects `prefers-reduced-motion`, preserves keyboard focus, and uses scoped cleanup-safe GSAP hooks/components.
- [ ] **MOTN-03**: Sidebar, right panel, source jump, file tree, and message-entry transitions use consistent transform/opacity timing without fighting chat scroll.

### Backend Pattern Mapping

- [ ] **BKND-01**: servercn review produces an explicit adopt, defer, or reject decision for backend-backed UI patterns.
- [ ] **BKND-02**: Any adopted backend-backed pattern preserves explicit loading, success, failure, retry, and typed error states for session, index, and repo utility actions.

### Quality Closure

- [ ] **QUAL-01**: Thermo stop conditions are enforced: route shrink, no third file tree renderer, no raw stream payloads in `ChatStream`, no broad protocol casts, and no new giant files.
- [ ] **QUAL-02**: Regression checks cover sessions, stream lifecycle, prompt context, file/source navigation, reduced motion, OpenUI fallback, and backend action errors.

## Future Requirements

Deferred to future milestones. Tracked but not in the current roadmap.

### Product Extensions

- **MODE-01**: User can select agent modes (`explorer`, `teacher`, `debugger`, `searcher`) with mode payload wiring in every chat request.
- **CTX-01**: User can enable deep or full-file context mode from the canonical file/chat workspace.
- **ADMIN-01**: Admin can view health metrics for coverage, freshness, dark zones, and confusion repeats.
- **FILES-01**: Parallel file routes are consolidated or reduced after canonical file tree/viewer reuse proves safe.

## Out of Scope

Explicit exclusions for v1.1.

| Feature | Reason |
|---------|--------|
| Wholesale OpenUI chat app migration | Generated scaffold does not know DevBridge repo, session, file, branch, or source flows. |
| Broad servercn backend adoption | Current app uses Next/Supabase/FastAPI proxy boundaries; servercn fit must be proven before runtime adoption. |
| Complex GSAP scroll choreography | High risk in streaming chat; basic transforms and panel continuity come first. |
| Admin health dashboard expansion | Valuable but not part of the chat rebuild milestone. |
| Agent mode switcher and deep full-file mode | Still desirable, but depend on stable prompt/context and chat ownership boundaries. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | TBD | Pending |
| SHELL-02 | TBD | Pending |
| SHELL-03 | TBD | Pending |
| SHELL-04 | TBD | Pending |
| STRM-01 | TBD | Pending |
| STRM-02 | TBD | Pending |
| STRM-03 | TBD | Pending |
| PRMP-01 | TBD | Pending |
| PRMP-02 | TBD | Pending |
| PRMP-03 | TBD | Pending |
| FILE-01 | TBD | Pending |
| FILE-02 | TBD | Pending |
| FILE-03 | TBD | Pending |
| RND-01 | TBD | Pending |
| RND-02 | TBD | Pending |
| RND-03 | TBD | Pending |
| MOTN-01 | TBD | Pending |
| MOTN-02 | TBD | Pending |
| MOTN-03 | TBD | Pending |
| BKND-01 | TBD | Pending |
| BKND-02 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after v1.1 requirements definition*
