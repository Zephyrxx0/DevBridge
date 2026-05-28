# Project Research Summary

**Project:** DevBridge AMD Edition
**Domain:** v1.1 Chat System Rebuild
**Researched:** 2026-05-29
**Confidence:** HIGH for current-code refactor shape; MEDIUM for optional OpenUI/GSAP/servercn adoption until spikes validate fit.

## Executive Summary

v1.1 is not a new chat product; it is a strangler rebuild of an already-working repo-aware chat workspace. Expert implementation means preserving the existing FastAPI/Next session, stream, file, branch, source, and prompt flows while extracting ownership out of `web/src/app/repo/[id]/page.tsx`. The current route is the failure hub: session lifecycle, SSE parsing, prompt assembly, file tree state, branch/index polling, Monaco snippets, and destructive repo actions all converge there.

Recommended approach: first make boundaries explicit, then add polish. Build pure helpers, hooks, typed transport events, bounded liveness, canonical file tree/viewer, and assistant view models before touching OpenUI or GSAP. Add `gsap`/`@gsap/react` only for a small scoped motion layer; use OpenUI only through a guarded adapter for selected assistant artifacts; treat servercn as pattern research, not runtime stack.

Main risks are additive slop and hidden liveness failure. Stop if the route grows, a third tree renderer appears, raw stream payloads leak into `ChatStream`, GSAP escapes leaf motion hooks, OpenUI scaffold code lands in production, or any long-lived stream/poll lacks timeout and terminal UI state.

## Key Findings

### Recommended Stack

Primary v1.1 work is architecture extraction, not dependency growth.

**Stack additions:**
- **GSAP `3.15.0` + `@gsap/react` `2.1.2`:** install from `web/` for scoped chat/sidebar/panel/message motion. Use `useGSAP`, container refs, cleanup, reduced-motion policy, and central tokens.
- **OpenUI CLI `0.0.7`:** use with `npx @openuidev/cli@latest create` in scratch only. No production install unless a spike proves a narrow adapter reduces code.
- **OpenUI runtime packages:** maybe later: `@openuidev/react-ui`, `@openuidev/react-headless`, `@openuidev/react-lang`, `@openuidev/lang-core`. Use only behind assistant artifact adapter, never as DevBridge session/transport owner.
- **servercn-cli `2.0.5`:** inspection only. Borrow env validation, response envelopes, request validation, health/liveness shape. Do not add Express, ORM, Passport, or servercn runtime files.

**Stack constraints:**
- Keep FastAPI `/chat/stream` and existing Next proxy/backend contract stable during extraction.
- Do not run `motion`, GSAP, and CSS animations as equal first-class systems on same surfaces.
- Do not add new chat state manager before extracting current ownership boundaries.

### Expected Features

**Must have / table stakes:**
- Stable canonical chat workspace: history left, conversation center, file/source panel right, no route-level state surprises.
- Streaming parity: chunk streaming, stop generation, explicit error/timeout/abort states, no permanent spinner.
- Prompt context affordances: `@mention`, snippets, file/folder chips, drag/drop, visible sent artifacts.
- Source-to-file inspection loop: citations open right-panel file viewer with path/line/model metadata and back behavior.
- Session basics: create, rename, delete, switch, restore active session per repo.
- Branch/file index visibility: actionable unindexed/loading/failed states and bounded polling.
- Thermo remediation: session hook, stream transport, prompt builder, canonical `FileTreeView`, typed assistant view model.
- Accessible motion baseline: smooth movement without focus, keyboard, reading, or reduced-motion regressions.

**Should have / differentiators:**
- OpenUI-rendered structured assistant cards behind feature gate and markdown fallback.
- Reproducible OpenUI CLI discovery notes, not scaffold adoption.
- GSAP layout choreography for sidebar, right panel, source jump, and message entry.
- Typed assistant view models for reasoning, tools, model badges, sources, errors.
- Narrow backend-backed pattern review for repo utilities/session/indexing surfaces.

**Defer to v2+ / later:**
- Full OpenUI chat app migration.
- Agent mode switcher and deep full-file mode.
- Admin health dashboard expansion.
- Broad servercn backend adoption.
- Complex GSAP scroll choreography.
- Files route consolidation beyond canonical shared tree/viewer extraction.

### Architecture Approach

Use a strangler refactor around the route shell. Build new modules beside existing code, migrate one boundary at a time, and keep UI behavior stable until contracts are tested.

**Major components:**
1. **Route shell / `RepoWorkspaceShell`:** compose hooks/components only; no SSE parsing, prompt building, tree recursion, or polling loops.
2. **`useChatSessionState(repoId)`:** session CRUD, active session persistence, message loading/clearing.
3. **`useChatStreamTransport` / stream client:** POST stream request, parse typed SSE events, abort, inactivity watchdog, max duration, terminal states.
4. **`buildPromptContext`:** pure prompt synthesis for text, mentions, snippets, files, folders, branch-aware resolver, and budgets.
5. **`useRepoBranchState` + `useIndexingStatusPoll`:** branch persistence/defaulting and bounded index trigger/polling.
6. **`useFileWorkspace` + `FileTreeView`:** tree fetch, selected file/source, expanded folders, Monaco selection snippet, canonical drag payload.
7. **`AssistantMessageViewModel`:** normalize backend/protocol metadata before rendering; `ChatStream` consumes stable render model only.
8. **`SessionListPanel` + `RepoUtilitiesPanel`:** split sidebar concerns while keeping `HistorySidebar` as shell.

### Critical Pitfalls

1. **OpenUI becomes second chat system** — only use sandbox/adapter adoption; copied code must delete or shrink existing code in same PR.
2. **Route keeps absorbing patterns** — servercn/OpenUI/backend patterns must go behind app-owned service/hook contracts, never directly into `repo/[id]/page.tsx`.
3. **Stream parser mutates UI directly** — extract typed event client + reducer before new metadata/tool/OpenUI parts.
4. **GSAP leaks into domain logic** — GSAP only in scoped leaf motion hooks/components with cleanup, `contextSafe`, reduced-motion, no stream/session/prompt imports.
5. **File-tree duplication survives** — canonicalize `FileTreeView`, file model, drag payloads, and `detectLanguage` before visual redesign.
6. **Prompt context remains submit-side magic** — move mentions/snippets/files/folders/budgeting into tested `buildPromptContext`.

## Implications for Roadmap

Suggested roadmap shape: boundary cleanup first, liveness second, canonical UI third, adoption polish last.

### Phase 1: Pin Behavior + Pure Helpers
**Rationale:** Lowest runtime risk and highest leverage. Extract prompt/file/language logic before touching sessions or streams.
**Delivers:** `lib/files/fileTree.ts`, `lib/files/language.ts`, `lib/chat/buildPromptContext.ts`, unit tests for mention rewrite, snippets, file/folder caps, language/tree helpers.
**Addresses:** prompt context table stakes, thermo remediation.
**Avoids:** prompt drift, hidden submit-side context assembly, route growth.

### Phase 2: Session State Extraction
**Rationale:** Session ownership must leave route before stream and rendering change.
**Delivers:** `useChatSessionState(repoId)`, create/rename/delete/select/restore, `/clear`, active-session persistence.
**Addresses:** stable workspace, session management basics.
**Avoids:** route as orchestration sink, session loss during later transport work.

### Phase 3: Typed Stream Transport + Liveness Budgets
**Rationale:** Streaming is highest user-visible failure risk and prerequisite for OpenUI artifact streaming.
**Delivers:** typed SSE event union, stream client/hook, abort propagation, inactivity timeout, max duration, reducer/terminal states.
**Addresses:** streaming parity, stop/error states, liveness remediation.
**Avoids:** direct `setMessages` in stream loop, raw protocol payloads in renderer, permanent spinner.

### Phase 4: Branch, Index, File Workspace Hooks
**Rationale:** File/source behavior depends on branch/index state and must be reliable before canonical components.
**Delivers:** `useRepoBranchState`, `useIndexingStatusPoll`, `useFileWorkspace`, bounded index polling, selected file/source/snippet state.
**Addresses:** branch/file visibility, source-to-file inspection, prompt chips.
**Avoids:** branch drift, unbounded polling, wrong file context.

### Phase 5: Canonical Components + Typed Rendering
**Rationale:** Once state boundaries exist, delete duplicate UI logic and normalize assistant rendering.
**Delivers:** `FileTreeView`, `AssistantMessageViewModel`, `SessionListPanel`, `RepoUtilitiesPanel`, `FileViewerPanel`, explicit `ChatInput` submit callback and typed ref.
**Addresses:** canonical workspace, typed model/tool/source rendering, duplicate file-tree remediation.
**Avoids:** third tree renderer, `as any`/`as never`, sidebar concern mixing, keyboard/drag regressions.

### Phase 6: Controlled Adoption + Motion Polish
**Rationale:** OpenUI/GSAP/servercn are safe only after ownership is clean.
**Delivers:** OpenUI artifact adapter/fallback if spike passes; GSAP motion layer for touched chat surfaces; servercn-inspired decision note/adapters for backend-backed UI patterns.
**Uses:** GSAP runtime, optional OpenUI packages, servercn pattern references.
**Avoids:** full scaffold replacement, mixed animation stacks, generated backend imports.

### Phase 7: Regression / Thermo Closure
**Rationale:** Ensure rebuild actually reduces risk and does not trade monolith for prettier slop.
**Delivers:** smoke/UAT matrix, reduced-motion check, fallow/code-health review, dependency review, stop-condition audit, documented deferrals.
**Addresses:** quality remediation and launch confidence.
**Avoids:** new giant files, dead adapters, hidden duplicate ownership.

### Architecture Build Order

```text
Pure helpers
  -> session hook
  -> typed stream transport + watchdogs
  -> branch/index/file workspace hooks
  -> canonical components + view models
  -> OpenUI/GSAP/servercn adoption polish
  -> regression / thermo closure
```

Do not start with visual overhaul. It would animate the boundary problem and make regressions harder to isolate.

### Requirement Categories Suggested

- **Chat shell:** composition shell, sessions, active state, onboarding behavior, sidebar split.
- **Transport/liveness:** typed SSE events, abort, timeout, retry/recovery, index polling budgets.
- **Prompt context:** pure builder, mentions, snippets, file/folder chips, scope limits, explicit submit.
- **File/source workspace:** canonical tree, viewer, citation navigation, branch-aware loading.
- **Assistant rendering:** view model, model/reasoning/tool/source/error display, optional OpenUI artifact path.
- **Motion/accessibility:** GSAP policy, reduced motion, focus preservation, one animation system per surface.
- **Backend-backed patterns:** servercn decision/adapters, typed envelopes, explicit error states.
- **Quality remediation:** route shrink, no duplicate renderers, no broad casts, no new giant files, regression gates.

### Watch-outs / Stop Conditions

Stop and replan if:
- `web/src/app/repo/[id]/page.tsx` grows by more than 50 LOC before boundary exit.
- Any new chat component exceeds 300 LOC without split plan.
- `prompt-input.tsx` or `file-upload.tsx` grows before decomposition phase.
- OpenUI-generated app structure lands in production source.
- New dependency appears for generated UI without deletion/replacement rationale.
- `gsap.to/from/timeline` appears outside approved motion hook/leaf component.
- GSAP callback/listener lacks cleanup or `contextSafe` where needed.
- Stream parsing still calls `setMessages` directly after stream-client phase.
- `ChatStream` receives raw transport payloads or adds broad casts.
- servercn/generated backend code is imported by the route.
- Another file-tree renderer or local `detectLanguage` appears.
- Any stream/poll/SSE path ships without inactivity timeout or max duration/attempts.

### Research Flags

Phases likely needing deeper research or spike during planning:
- **Phase 3:** SSE fixture design, exact timeout constants, abort semantics across Fetch reader and existing FastAPI stream.
- **Phase 6:** OpenUI adapter/package fit, GSAP migration boundaries, servercn pattern value. Run spikes before production install/adoption.
- **Phase 7:** Bundle/dependency impact if OpenUI packages land.

Phases with standard patterns; skip extra research unless code surprises appear:
- **Phase 1:** pure helper extraction and unit tests.
- **Phase 2:** session-state hook extraction around existing endpoints.
- **Phase 4:** branch/index/file hooks, provided endpoint contracts stay stable.
- **Phase 5:** component decomposition and typed view-model adapter.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | GSAP/OpenUI versions and docs verified; servercn fit low enough to recommend pattern-only; existing stack not re-researched. |
| Features | MEDIUM-HIGH | Strong basis from current code, project goals, and thermo blockers; OpenUI/servercn differentiators need spike validation. |
| Architecture | HIGH | Current route/component boundaries inspected; graph/code docs align on extraction seams and build order. |
| Pitfalls | HIGH for existing code; MEDIUM for integrations | Route, stream, prompt, file-tree, and cast issues are concrete; OpenUI/GSAP/servercn risks inferred from docs/package fit. |

**Overall confidence:** HIGH for roadmap ordering; MEDIUM for optional adoption details.

### Gaps to Address

- **OpenUI runtime value:** prove one structured assistant artifact with fallback before installing persistent packages.
- **GSAP vs existing `motion`:** define exact surfaces to migrate and cleanup policy before adding animation work.
- **servercn specifics:** docs/package fit is weak for FastAPI/Next app; require a decision note before any adoption.
- **SSE fixtures:** capture/pin current `chunk`, `metadata`, `sources`, `done`, `error` grammar before transport refactor.
- **Files-route consolidation:** do not decide in v1.1 unless canonical `FileTreeView` exposes obvious low-risk reuse.
- **Prompt budgets:** confirm 8-file folder cap, 8000-char slice behavior, and 48K context constraints during Phase 1 tests.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — dependency recommendations and install/adoption constraints.
- `.planning/research/FEATURES.md` — table stakes, differentiators, anti-features, requirement candidates.
- `.planning/research/ARCHITECTURE.md` — target boundaries, modules, build order, validation gates.
- `.planning/research/PITFALLS.md` — critical pitfalls, warning signs, guardrails, stop conditions.
- `.planning/PROJECT.md`, `.planning/THERMO-NUCLEAR-REVIEW.md`, `.planning/THERMO-COVERAGE-MATRIX.md` — v1.1 goals and structural blockers.
- Current chat source: `repo/[id]/page.tsx`, `ChatStream.tsx`, `ChatInput.tsx`, `FileExplorer.tsx`, `HistorySidebar.tsx`, `ChatLayout.tsx`.

### Secondary (MEDIUM confidence)
- GSAP official docs and Context7 refs — React `useGSAP`, context cleanup, matchMedia/reduced-motion patterns.
- OpenUI docs and package checks — CLI, chat install/API contract, renderer/fallback behavior.

### Tertiary (LOW confidence)
- servercn npm/docs/package inspection — enough to reject production stack adoption for v1.1; insufficient for deeper architecture claims.

---
*Research completed: 2026-05-29*
*Ready for roadmap: yes*
