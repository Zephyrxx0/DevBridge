# Thermo-Nuclear Code Quality Review (Chunks 1-4)

Date: 2026-05-23
Scope: Main app logic only (`web/src`), chunked pass
Standard: Thermo-nuclear (structural simplification first, no cosmetic-only feedback)

## Executive Verdict

- Not approvable under thermo bar.
- No obvious infinite CPU-spin loops found.
- Major blocker is structural sprawl and ownership mixing.

## Chunk 1 - Repo Workspace Flow

Files:
- `web/src/app/repo/[id]/page.tsx`

Blockers:
- File at 991 LOC. Next feature likely crosses 1k threshold.
- Single component owns too many domains: chat sessions, stream transport, mention/snippet expansion, file tree, branch/index state, Monaco selection, onboarding trigger, repo deletion.
- `handleSubmit` path is orchestration-heavy and branch-heavy in one flow.

Loop check:
- `while (true)` at stream reader is not CPU spin, but can hang indefinitely if stream never closes.

Code-judo move:
- Extract `useChatStreamTransport` hook.
- Extract `buildPromptContext` pure module.
- Extract `useRepoBranchState` and `useIndexingStatusPoll`.
- Keep page as composition shell.

## Chunk 2 - Map/Dependency Graph Flow

Files:
- `web/src/app/repo/[id]/map/page.tsx`

Blockers:
- Cast-heavy graph layer (`any` on graph refs, nodes, links, force callbacks).
- Duplicate branch/default-branch logic also in workspace page.
- `fetchGraph` bundles tree fetch, retry policy, import parse, graph build, progressive UI updates in one function.

Loop check:
- Recursive retry guarded by `fresh` flag. Not runaway.

Code-judo move:
- Extract graph build service (`buildDependencyGraph`).
- Share branch-state hook with workspace page.
- Replace `any` with explicit `GraphNode/GraphLink` contracts.
- Centralize timeout/retry policy in utility.

## Chunk 3 - Giant Input/Upload Abstractions

Files:
- `web/src/components/ai-elements/prompt-input.tsx` (1467 LOC)
- `web/src/components/ui/file-upload.tsx` (1415 LOC)

Blockers:
- Both files far past healthy size boundaries.
- Provider/context/store/UI concerns co-located, high concept count.
- Indirection layers add cognitive load; flow tracing expensive.

Code-judo move:
- Split headless logic from view layer.
- `prompt-input`: `usePromptInputController`, `usePromptAttachments`, `PromptInputView`.
- `file-upload`: `useFileUploadStore`, validators/utilities, thin presentational wrappers.
- Remove pass-through wrappers that only relay refs/callbacks.

## Chunk 4 - Surrounding Orchestration

Files:
- `web/src/app/repo/[id]/layout.tsx`
- `web/src/components/chat/ChatInput.tsx`
- `web/src/contexts/repo-context.tsx`

Findings:
- Polling loops clear correctly on unmount/success/error, but no hard polling deadline.
- `ref={inputRef as any}` indicates weak type boundary.
- Manual `new Event("submit")` dispatch is brittle indirection.

Code-judo move:
- Type `PromptInputTextarea` forward-ref correctly; remove `as any`.
- Replace synthetic form event dispatch with explicit submit callback.
- Add max polling lifetime/backoff policy.

## Aggregate Loop Risk Assessment

Status:
- No clear infinite loop bug.

Residual risks:
- SSE stream read loop can stall forever if stream never terminates.
- Polling loops can run unbounded under persistent pending states.

Hardening:
- Add inactivity timeout and watchdog for SSE.
- Add polling budget (`maxAttempts` or `maxDuration`) with terminal UI state.

## Priority Order (Thermo)

1. Decompose oversized monoliths (`prompt-input`, `file-upload`, then `repo/[id]/page.tsx`).
2. Create canonical shared branch/index state layer for repo pages.
3. Extract stream transport + prompt-context assembly into isolated modules.
4. Remove cast-heavy graph contracts and formalize typed boundaries.
5. Add loop guardrails (SSE watchdog + polling budgets).

## Approval Bar Result

- Result: FAIL (presumptive blockers present).
- Required before pass:
  - Demonstrable decomposition of oversized files.
  - Reduced orchestration complexity in repo workspace flow.
  - Shared canonical branch/index logic reused across pages.
  - Typed graph boundary without broad `any` casts.

---

## Chunk 5 - Remaining App Routes (Update)

Files:
- `web/src/app/repo/[id]/notes/page.tsx`
- `web/src/app/repo/[id]/annotations/page.tsx`
- `web/src/app/repo/[id]/search/page.tsx`
- `web/src/app/repo/[id]/pr/page.tsx`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/profile/page.tsx`

### Findings

1) **Notes page mixes editor orchestration + persistence + graph-link sync in one component**
- `notes/page.tsx` combines Tiptap lifecycle, autosave debounce, link extraction, note creation, link upsert, and router syncing.
- This is working, but brittle. Too many interdependent effects and refs (`loadedNoteIdRef`, `activeNoteRef`, `saveTimeout`).

2) **Search and PR pages duplicate same fetch/filter/sort shell pattern**
- `search/page.tsx` and `pr/page.tsx` use near-identical route-level loading/mounted/search/filter scaffolding with custom render blocks.
- Repeated structure implies missing reusable query-shell abstraction.

3) **Annotations page has UI-heavy state with no domain boundary**
- `annotations/page.tsx` carries filter state + form state + fetch logic + derived stats + list rendering in one module.
- No service layer for annotation operations, no validation boundary before submission flow.

4) **Profile page tightly couples data fetch/update with very large presentation tree**
- `profile/page.tsx` owns auth fetch, profile fetch, metadata mapping, avatar preview/upload dialog, edit/view mode rendering.
- Coupling to `file-upload` giant component increases maintenance blast radius.

### Code-Judo Remedies

- **Notes**: extract `useNotesState(repoId)` + `useNoteAutosave(editor, noteId)` + `syncNoteLinks` service module.
- **Search + PR**: introduce a shared `useQueryPageState` hook (mounted/loading/query/filter/sort) and a common list shell component.
- **Annotations**: split into `useAnnotations(repoId)` domain hook and `AnnotationFilters`/`AnnotationForm` presentational components.
- **Profile**: split into `useProfileData` hook + `ProfileView` + `ProfileEditor`; isolate avatar upload adapter from page.

### Loop/Risk Status (Chunk 5)

- No obvious infinite loops in this chunk.
- Main risk is effect coupling and stale-closure regressions in notes autosave orchestration.

---

## Chunk 6 - Chat Component Stack (Update)

Files:
- `web/src/components/chat/ChatStream.tsx`
- `web/src/components/chat/ChatInput.tsx`
- `web/src/components/chat/FileExplorer.tsx`
- `web/src/components/chat/HistorySidebar.tsx`
- `web/src/components/chat/ChatLayout.tsx`

### Findings

1) **Canonical ownership split still incomplete**
- `repo/[id]/page.tsx` still owns critical chat orchestration while chat components mostly render.
- Data/behavior split is uneven: parent still handles stream semantics, mention context resolution, snippet payload expansion.

2) **Duplicate tree renderer remains active debt**
- `FileExplorer` has `renderTreeNode`, and a near-duplicate tree renderer exists in `repo/[id]/page.tsx`.
- This is direct redundancy and drift risk.

3) **ChatStream has mixed rendering concerns and protocol-specific shape casts**
- `ChatStream` handles rich UI rendering plus transport-shaped metadata (`toolCalls`, `reasoning`, dynamic tool states).
- Cast-heavy access (`input/output as never`) signals boundary mismatch.

4) **Sidebar utility area bundles unrelated actions**
- `HistorySidebar` mixes session list, utility nav, branch indexing action, theme switch, and destructive repo removal.
- Component remains legible, but ownership is broad and feature growth will add spaghetti quickly.

5) **Loop status in chat components**
- `ThinkingIndicator` interval has proper cleanup.
- No infinite loop found in this chunk.

### Code-Judo Remedies

- Move all tree rendering and drag payload creation into one canonical `FileTreeView` used by both file browser and right panel state.
- Introduce typed assistant-message model (`AssistantMessageViewModel`) before render to remove protocol casts in `ChatStream`.
- Split sidebar into `SessionListPanel` and `RepoUtilitiesPanel`; keep `HistorySidebar` as composition shell.
- Keep `ChatLayout` presentation-only (already close); avoid adding behavior there.

---

## Iterative Review Protocol (Forward)

Goal:
- Review whole app codebase in chunks for optimizations, redundancies, and removable dead weight without breaking current app flow logic.

Guardrails:
- No behavior-changing recommendations unless explicitly marked as optional redesign.
- No `.env` usage assumptions; use `.env.example` only.
- Dotfiles only when directly relevant to runtime/build flow.
- Every chunk ends with: findings -> blockers -> code-judo remedy -> loop-risk check -> next chunk map.

### Remaining Chunk Map

Chunk 7 (next):
- App route surfaces not yet deeply audited:
  - `web/src/app/repo/[id]/files/page.tsx`
  - `web/src/app/repo/[id]/files/[...path]/page.tsx`
  - `web/src/app/repo/[id]/admin/page.tsx`
  - `web/src/app/repo/[id]/settings/page.tsx`
  - `web/src/app/signin/page.tsx`
  - `web/src/app/page.tsx`
  - `web/src/app/pricing/page.tsx`
  - `web/src/app/dashboard/memory/page.tsx`

Chunk 8:
- Shared infra + boundaries:
  - `web/src/hooks/**`
  - `web/src/contexts/**`
  - `web/src/lib/**`
  - `web/src/utils/supabase/**`
  - `web/src/proxy.ts`

Chunk 9:
- API/route adapters and edge boundaries:
  - `web/src/app/api/**`
  - `web/src/app/auth/callback/route.ts`

Chunk 10:
- Unneeded file candidates and redundancy consolidation pass:
  - cross-check imports, dead components, duplicate UI wrappers, stale demo artifacts.
  - produce safe-delete shortlist with confidence level and no-flow-break rationale.

---

## Chunk 7 - Remaining Route Surfaces (Update)

Files:
- `web/src/app/repo/[id]/files/page.tsx`
- `web/src/app/repo/[id]/files/[...path]/page.tsx`
- `web/src/app/repo/[id]/admin/page.tsx`
- `web/src/app/repo/[id]/settings/page.tsx`
- `web/src/app/signin/page.tsx`
- `web/src/app/page.tsx`
- `web/src/app/pricing/page.tsx`
- `web/src/app/dashboard/memory/page.tsx`

### Findings

1) **File browsing has parallel implementations (structural duplication)**
- `files/page.tsx` builds its own tree browser + preview.
- `files/[...path]/page.tsx` separately implements Monaco file viewer with annotation sidebar.
- `repo/[id]/page.tsx` already has another file explorer + viewer flow.
- This is a 3-path split for one concept. high drift risk.

2) **Language detection duplicated again**
- `files/[...path]/page.tsx` repeats `languageMap` + `detectLanguage` already duplicated elsewhere.
- Canonical helper missing (`lib/language.ts` style module).

3) **`files/page.tsx` likely legacy/parallel UX path**
- Uses `ShikiCode` preview and old tree interactions while primary workspace uses Monaco + right panel.
- Strong candidate for consolidation into one canonical file-browse flow.

4) **Signin route leaks provider toggles into page logic**
- OAuth provider toggles hard-coded from env flags in component (`signin/page.tsx`).
- Should move to auth config boundary to keep page focused on presentation + action dispatch.

5) **Landing/pricing mostly presentation, low architectural risk**
- `page.tsx`, `pricing/page.tsx` are content-heavy but structurally straightforward.
- Main issue there is potential reuse extraction, not correctness risk.

6) **Memory dashboard flow mostly clean but non-atomic optimistic delete rollback**
- `dashboard/memory/page.tsx` performs optimistic delete with full list rollback.
- Works, but rollback granularity broad; edit/delete state model can be isolated into reducer.

### Code-Judo Remedies

- Pick one canonical file browsing model:
  - Keep `files/[...path]/page.tsx` viewer as canonical detail view.
  - Rework `files/page.tsx` into lightweight router/list shell, or remove if redundant.
  - Reuse explorer state from workspace flow via shared `FileTreeView` + `useFileTree`.
- Extract `detectLanguage` to shared utility and remove all route-local copies.
- Introduce `authProvidersConfig` (single source of truth from `.env.example` flags) and map UI from config.
- For memory dashboard, centralize mutations with reducer (`delete-start/success/fail`, `edit-start/save/fail`) for atomic UI state transitions.

### Unneeded/Redundant Candidate Signals (Preliminary)

- `web/src/app/repo/[id]/files/page.tsx`: likely redundant with workspace + catch-all viewer route.
- Keep as **candidate only** until navigation analytics or route usage confirms low traffic.

### Loop/Risk Status (Chunk 7)

- No infinite loops detected in this chunk.
- Main risk remains architectural duplication, not runtime loop behavior.

---

## Next Chunk Map (Revised)

Chunk 8 (next): Shared infra and boundaries
- `web/src/hooks/**`
- `web/src/contexts/**`
- `web/src/lib/**`
- `web/src/utils/supabase/**`
- `web/src/proxy.ts`

Chunk 9: API and auth callback boundaries
- `web/src/app/api/**`
- `web/src/app/auth/callback/route.ts`

Chunk 10: Redundancy + safe-delete final pass
- Cross-import validation for unneeded files.
- Safe-delete shortlist with confidence + rollback notes.

---

## Chunk 8 - Shared Infra and Boundaries (Update)

Files:
- `web/src/hooks/useOnboarding.ts`
- `web/src/hooks/use-as-ref.ts`
- `web/src/hooks/use-lazy-ref.ts`
- `web/src/hooks/use-isomorphic-layout-effect.ts`
- `web/src/contexts/repo-context.tsx`
- `web/src/lib/icon-utils.ts`
- `web/src/lib/utils.ts`
- `web/src/utils/supabase/client.ts`
- `web/src/utils/supabase/server.ts`
- `web/src/utils/supabase/proxy.ts`
- `web/src/proxy.ts`

### Findings

1) **Auth/session boundary has risky fallback secret behavior**
- `utils/supabase/proxy.ts` sets `X-Internal-Auth` using fallback `'dev-token-default'` if env missing.
- This is brittle boundary design. default secret fallback should not exist in shared runtime path.

2) **Repeated env non-null assertions hide startup invariants**
- `client.ts`, `server.ts`, `proxy.ts` use `process.env.*!` directly.
- If env missing, failures happen indirectly. boundary should fail fast with explicit config error.

3) **Onboarding hook couples transport protocol handling into UI hook**
- `useOnboarding.ts` does cache check + SSE lifecycle + status accumulation + error semantics in one hook.
- Works, but protocol parsing and UI state transitions are fused.

4) **Repo context keeps demo-mode logic in primary provider path**
- UUID detection and demo object fallback in `repo-context.tsx` mixes production data path and demo path.
- This adds special-case branching into canonical data provider.

5) **Icon utility manipulates DOM singleton directly**
- `icon-utils.ts` appends hidden helper element and keeps global singleton/cache.
- Functional now, but side-effectful singleton could leak across route transitions and tests.

### Code-Judo Remedies

- Introduce central `env.ts` with explicit validation (`required("NEXT_PUBLIC_SUPABASE_URL")` etc.).
- Remove fallback `dev-token-default`; require explicit `INTERNAL_AUTH_TOKEN` in runtime, documented in `.env.example`.
- Split onboarding into:
  - transport module (`onboardingSseClient`) for protocol events
  - state hook (`useOnboardingState`) for UI transitions
- Move demo-mode logic from `repo-context` into route-level adapter or dedicated demo provider.
- Wrap icon DOM helper behind lifecycle-managed utility with deterministic cleanup path for tests.

### Loop/Risk Status (Chunk 8)

- No infinite loops detected.
- Key risk in this chunk is boundary fragility and hidden runtime invariants.

---

## Next Chunk Map (Updated)

Chunk 9 (next): API and auth callback boundaries
- `web/src/app/api/highlight/route.ts`
- `web/src/app/auth/callback/route.ts`

Chunk 10: redundancy and safe-delete closure pass
- Validate unused/stale route/components with import graph checks.
- Produce final safe-delete list with confidence levels and app-flow safety notes.

---

## Chunk 9 - API and Auth Callback Boundaries (Update)

Files:
- `web/src/app/api/highlight/route.ts`
- `web/src/app/auth/callback/route.ts`

### Findings

1) **Highlight API swallows all errors and returns success**
- `api/highlight/route.ts` returns `200` with empty html on any failure.
- This hides operational faults and makes client fallback behavior ambiguous.

2) **Auth callback allows unsanitized `next` redirect composition**
- `auth/callback/route.ts` redirects with `${origin}${next}` from query.
- If `next` is unexpected path form, behavior can become unsafe or inconsistent.

### Code-Judo Remedies

- `highlight` route: return typed error envelope with non-200 status for parse/highlight failures.
- `auth/callback`: enforce internal-path allowlist (`next.startsWith("/")` and reject `//`, protocol-like patterns).
- Add shared route utility for safe redirect resolution (`resolveSafeNextPath`).

### Loop/Risk Status (Chunk 9)

- No loop risk in this chunk.
- Main risk is boundary correctness and observability.

---

## Chunk 10 - Redundancy and Safe-Delete Closure Pass (Update)

### High-confidence redundancy candidates

1) `web/src/components/dev/AgentationMount.tsx`
- Import graph check found no references.
- Safe-delete candidate: **High confidence**.

2) `web/src/components/shadcn-studio/dropdown-menu/dropdown-menu-01.tsx`
- No references found in source imports.
- Safe-delete candidate: **High confidence**.

### Medium-confidence consolidation candidates (do not delete yet)

1) `web/src/app/repo/[id]/files/page.tsx`
- Overlaps with workspace file explorer and catch-all code viewer route.
- Candidate for removal or shrink to redirect shell after route usage verification.

2) Duplicated `detectLanguage`/`languageMap` definitions
- Found in multiple routes/components.
- Replace with shared utility first; then remove local copies.

### Final optimization themes across full review

- Decompose oversized files before adding new feature branches.
- Remove duplicate ownership for branch/index/file-tree state.
- Centralize env + auth boundary validation.
- Replace cast-heavy render-time contracts with typed view models.
- Add explicit watchdogs for long-lived stream/polling paths.

---

## Completion State

- Main app logic reviewed in iterative chunks (1-10).
- Dotfiles intentionally ignored unless runtime-relevant.
- Env assumptions constrained to `.env.example` contract.

---

## In-Depth User Chat Review (Thermo)

Scope:
- `web/src/app/repo/[id]/page.tsx`
- `web/src/components/chat/ChatStream.tsx`
- `web/src/components/chat/ChatInput.tsx`
- `web/src/components/chat/HistorySidebar.tsx`
- `web/src/components/chat/FileExplorer.tsx`
- `web/src/components/chat/ChatLayout.tsx`

### Structural Blockers

1) **Chat orchestration is still a monolith in route page**
- `repo/[id]/page.tsx` remains a multi-domain orchestrator (session lifecycle, snippets, mentions, stream protocol decode, branch/index controls, file-view selection).
- this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.

2) **Protocol handling and presentation are entangled**
- Stream event parse (`chunk`, `metadata`, `sources`, `error`, `done`) updates view state directly in page-level loop.
- Missing contract boundary for assistant events; UI state transitions and transport parsing are fused.

3) **Chat input command path mixes UX parsing with retrieval assembly**
- `@mention` rewrite, snippet expansion, folder fan-out fetches, and message payload synthesis are inside submit path.
- This adds branching complexity where a dedicated prompt-context builder should exist.

4) **Duplicate file tree rendering path**
- Route page and `FileExplorer` both render recursive tree and drag payload semantics.
- this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?

5) **Sidebar scope too broad**
- `HistorySidebar` owns session switching and unrelated utility actions (indexing, theme, destructive repo removal).
- feature logic leaking into shared path; needs panel split.

### Type/Boundary Issues

- `ChatInput` used cast-based ref handoff (`as any`) earlier and still depends on non-explicit boundary between `PromptInputTextarea` and local textarea semantics.
- `ChatStream` uses shape-extending message casts for tool calls/reasoning; typed view model missing.
- `repo/[id]/page.tsx` still implicitly trusts heterogeneous stream payload shape.

### Loop and Liveness Risks

- SSE read loop bounded by `reader.read()` completion/abort, but no inactivity watchdog.
- polling loops for indexing have cleanup, but no hard budget (`maxDuration`/`maxAttempts`).

### Code-Judo Restructure (No Flow Change)

- Extract `useChatSessionState(repoId)`.
- Extract `useChatStreamTransport({ repoId, sessionId })` returning typed event stream.
- Extract `buildPromptContext({ input, snippets, fileTree })` as pure module.
- Extract canonical `FileTreeView` and delete duplicate renderer.
- Split sidebar into `SessionListPanel` + `RepoUtilitiesPanel`.
- Keep `ChatLayout` strictly presentational.

Approval bar for chat path: **Fail** until ownership and typed boundaries are reduced.

---

## Spec Gap Audit: Missing/Broken vs `devbridge-amd-spec.md`

Source baseline:
- `devbridge-amd-spec.md` sections 6-13.

### A) Agent Modes (Spec §6)

Expected:
- 4 user-selectable modes (`explorer`, `teacher`, `debugger`, `searcher`) with UI mode pills and mode in every chat request.

Observed:
- No mode switcher component in `web/src`.
- No mode payload wiring in current chat request path from reviewed frontend code.

Status:
- **Missing feature** (frontend side).

### B) Inline Annotation Overhaul (Spec §7)

Expected:
- In-context Monaco line decorations + click popover + "Ask DevBridge about this" + inline create annotation from text selection.

Observed:
- Partial presence: Monaco annotation decorations and annotation sidebar exist in `files/[...path]/page.tsx`.
- Missing/unclear from current frontend pass: integrated inline create annotation popover flow in primary workspace chat/file viewer path.
- Annotation experience remains split across separate route (`annotations/page.tsx`) and parallel file routes.

Status:
- **Partially implemented / fragmented UX**.

### C) Intern Onboarding Flow (Spec §8 + §10)

Expected:
- 3-step onboarding wizard, profile save, async planner trigger, dedicated start-here destination.

Observed:
- `useOnboarding` hits `/api/backend/repo/{id}/start-here?focus=...` SSE endpoint.
- No `repo/[id]/start-here` page found in current frontend tree.
- No frontend path found for `/api/user/profile` or `/api/onboarding/generate-plan` contracts from spec.

Status:
- **Partially implemented backend integration hook; key frontend flow missing**.

### D) Admin Dashboard Health Metrics (Spec §9)

Expected:
- Admin health metrics endpoint and dashboard showing coverage/freshness/dark zones/confusion repeats.

Observed:
- Current admin page is focused on markdown confusion reports list (`repo/[id]/admin/page.tsx`), not spec-level health metric dashboard.
- No frontend wiring found for `/admin/repo/{repo_id}/health` style metric view.

Status:
- **Missing or not surfaced in current app UI**.

### E) Code Health Monitor Agent (Spec §11)

Expected:
- Scheduled health monitor outputs persisted reports and visible in admin context.

Observed:
- No direct frontend evidence of health monitor report surfaces in reviewed routes.

Status:
- **Missing visibility at UI layer** (backend unknown in this pass).

### F) Multi-Model Query Router (Spec §12)

Expected:
- Query classification and fast-vs-big model route behavior.

Observed:
- Chat UI shows model metadata badges in stream output path, but no frontend controls or explicit route-state for model router behavior.
- No user-facing mode/model explainability tied to spec classifier categories.

Status:
- **Likely backend-only; frontend observability gap**.

### G) Large-Context Full-File Mode (Spec §13)

Expected:
- Deep/full-context mode toggle in file viewer/chat context.

Observed:
- No deep-mode toggle in current reviewed file viewers.

Status:
- **Missing feature (frontend toggle and affordance)**.

---

## Spec-Gap Priority (Thermo Order)

1. **Unify chat/file ownership first** (remove parallel file-view paths).
2. **Add agent mode switcher + request wiring** (spec §6) in canonical chat shell.
3. **Finish onboarding product loop** (`wizard -> planner trigger -> start-here page`) before adding new sidebar routes.
4. **Consolidate annotations into primary reading flow** and de-emphasize detached annotation route.
5. **Expose admin health metrics** and separate from confusion-report list.
6. **Add deep/full-file mode toggle** only after canonical viewer unification.

These are presumptive blockers for calling the AMD spec fully implemented from frontend perspective.
