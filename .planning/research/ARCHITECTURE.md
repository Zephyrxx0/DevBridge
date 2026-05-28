# Architecture Research: v1.1 Chat System Rebuild

**Project:** DevBridge AMD Edition  
**Milestone:** v1.1 Chat System Rebuild  
**Researched:** 2026-05-29  
**Mode:** Project architecture / integration research  
**Confidence:** HIGH for current code boundaries; MEDIUM for OpenUI/GSAP/servercn adoption scope until component spikes run.

## Current Boundary Problem

The current chat flow works, but `web/src/app/repo/[id]/page.tsx` is still the ownership sink. It owns session lifecycle, message loading, stream parsing, prompt-context assembly, file tree state, branch/index state, Monaco selection state, snippet drag/drop, onboarding completion marker, and destructive repo removal. This makes any new chat feature risky because the route must change for almost every behavior.

Observed integration points:

| Current file | Current responsibility | Boundary problem | Keep behavior? |
|---|---|---|---|
| `web/src/app/repo/[id]/page.tsx` | Route shell + all chat/file/session orchestration | 991 LOC, many domains, stream loop can stall, polling unbounded | Yes, shrink into composition shell |
| `web/src/components/chat/ChatStream.tsx` | Message list, onboarding overlay, citations, artifact rendering, metadata badges | Protocol-shaped casts live in renderer | Yes, feed typed view models |
| `web/src/components/chat/ChatInput.tsx` | Prompt text, mention menu, snippet chips, submit control | Synthetic submit event and `ref as any`; mention UI coupled to file tree traversal | Yes, make submit explicit |
| `web/src/components/chat/FileExplorer.tsx` | Branch selector + recursive tree renderer + drag payloads | Duplicate renderer exists in route page | Yes, replace inner renderer with canonical `FileTreeView` |
| `web/src/components/chat/HistorySidebar.tsx` | Chat sessions + utility navigation + indexing + theme + repo deletion | Session list and repo utilities mixed | Yes, split panels |
| `web/src/components/chat/ChatLayout.tsx` | Sidebar/main/right-panel layout | Already near-presentational; uses Framer Motion | Yes, keep behavior; GSAP only if simpler |
| `web/src/components/ai-elements/prompt-input.tsx` | Prompt input framework | Oversized provider/store/view module | Do not rewrite first; adapt from outside, split later if needed |
| `web/src/components/ui/file-upload.tsx` | Upload framework | Oversized provider/store/view module | Not central to chat rebuild; defer unless touched |

Graphify reinforces this: frontend file/branch helpers cluster separately (`countTreeFiles`, `detectLanguage`, `loadBranches`, `loadFileTree`, `toggleFolder`) while chat input is a thin isolated cluster (`handleInputChange`, `handleKeyDown`, `insertMention`). Those are extraction seams, not places to add more behavior.

Main architectural finding: v1.1 should be a strangler refactor around the existing route, not a rewrite. New hooks/modules should first mirror current behavior behind tests or smoke checks, then the route swaps from inline logic to hook calls one boundary at a time.

## Target Boundaries

Target frontend shape:

```text
web/src/app/repo/[id]/page.tsx
  └─ RepoWorkspaceShell                      route composition only
      ├─ useChatSessionState(repoId)         sessions + messages + active session
      ├─ useRepoBranchState(repoId)          branches + selected branch + storage key
      ├─ useIndexingStatusPoll(repoId)       trigger + bounded polling + terminal states
      ├─ useFileWorkspace(repoId, branch)    tree + selected file/source + Monaco selection
      ├─ useChatStreamTransport(...)         SSE fetch/read/abort/watchdog typed events
      └─ buildPromptContext(...)             pure prompt synthesis from input/snippets/mentions/tree

components/chat/*
  ├─ ChatLayout                              presentational layout only
  ├─ HistorySidebar                          composition only
  │   ├─ SessionListPanel                    sessions CRUD UI
  │   └─ RepoUtilitiesPanel                  nav/index/theme/delete UI
  ├─ ChatStream                              renders AssistantMessageViewModel[]
  ├─ ChatInput                               controlled prompt UI, explicit callbacks
  ├─ FileExplorer                            branch selector + FileTreeView shell
  └─ FileTreeView                            canonical tree render + drag payloads
```

Boundaries by responsibility:

| Boundary | Owns | Must not own |
|---|---|---|
| Route shell | Layout wiring, passing repoId, composing hooks/components | SSE parsing, prompt assembly, recursive trees, polling loops |
| `useChatSessionState` | Create/rename/delete/select sessions, load messages, localStorage active session | Stream transport, file state, prompt parsing |
| `useChatStreamTransport` | POST `/api/backend/chat/stream`, parse SSE, expose typed events, abort, watchdog | React message rendering, prompt-context construction |
| `buildPromptContext` | Mention rewrite, snippet/folder expansion, prompt payload construction | React state, fetch UI state, message rendering |
| `useRepoBranchState` | Branch loading, selected branch persistence, default branch | File content viewer, indexing polling |
| `useIndexingStatusPoll` | Trigger index, poll `/index-status`, hard max duration/attempts | Sidebar presentation |
| `useFileWorkspace` | File tree fetch, selected file/source, Monaco selection snippet adapter | Chat sessions, stream parsing |
| `AssistantMessageViewModel` | Normalize backend message/SSE metadata/tool/reasoning shapes before render | Transport mechanics |
| `FileTreeView` | Recursive tree rendering and drag payload contract | Branch selector, file fetch, prompt expansion |

Backend contract should remain stable for v1.1:

- Keep `/api/backend/repo/{repoId}/chats`, `/api/backend/chats/{sessionId}/messages`, `/api/backend/chat/stream`, `/api/backend/repo/{repoId}/files`, `/api/backend/repo/{repoId}/branches`, `/api/backend/repo/{repoId}/index-status`, `/api/backend/repo/{repoId}/trigger-index` unchanged.
- Do not change `api/main.py` SSE event names in same phase as frontend extraction unless tests first pin current event grammar: `chunk`, `metadata`, `sources`, `done`, `error`.
- New frontend transport should tolerate unknown SSE event types but log/debug only in development.

## Modules to Extract

Build new modules beside existing code, then migrate call sites.

### New files

| New file | Purpose | First consumer | Notes |
|---|---|---|---|
| `web/src/hooks/chat/useChatSessionState.ts` | Session CRUD, active session persistence, message load/clear | `repo/[id]/page.tsx` | Moves lines 73-79, 117-237, `/clear` handling from submit path |
| `web/src/hooks/chat/useChatStreamTransport.ts` | Typed SSE transport, abort, inactivity watchdog, terminal event handling | `repo/[id]/page.tsx` | Must support current stream body `{ message, repo_id, thread_id }` |
| `web/src/lib/chat/buildPromptContext.ts` | Pure prompt assembly for user input, snippet chips, mentions, folder fan-out | `repo/[id]/page.tsx` submit handler | Accept injected `loadFileContent(path)` to keep pure-ish/testable boundary |
| `web/src/lib/chat/assistantMessageViewModel.ts` | Convert raw `Message` + metadata/tool fields into render-safe view model | `ChatStream.tsx` | Deletes render-time casts in `ChatStream` |
| `web/src/hooks/repo/useRepoBranchState.ts` | Branch list, selected branch, default branch, localStorage | `repo/[id]/page.tsx`, later map/files routes | Shared with map/files after chat stabilizes |
| `web/src/hooks/repo/useIndexingStatusPoll.ts` | Trigger index and bounded polling budget | `HistorySidebar` via route shell props | Add `maxDurationMs`/`maxAttempts`; expose `status: idle/running/succeeded/failed/timed_out` |
| `web/src/hooks/repo/useFileWorkspace.ts` | File tree load, selected source/file, content load, expanded folders, Monaco selection snippet | `repo/[id]/page.tsx` | May be split later if too large |
| `web/src/lib/files/fileTree.ts` | `FileNode`, `BranchInfo`, `countTreeFiles`, tree traversal helpers | `FileExplorer`, `ChatInput`, prompt builder | Move types out of `FileExplorer` to avoid component-as-domain import |
| `web/src/lib/files/language.ts` | `detectLanguage` and `languageMap` | route shell/file viewer | Removes duplicate route-local language maps |
| `web/src/components/chat/FileTreeView.tsx` | Canonical recursive tree renderer + drag payload creation | `FileExplorer`, route right panel if needed | Deletes duplicate `renderTreeNode` in route |
| `web/src/components/chat/SessionListPanel.tsx` | Chat session list + context menu | `HistorySidebar` | Presentation only |
| `web/src/components/chat/RepoUtilitiesPanel.tsx` | Utilities nav/index/theme/delete | `HistorySidebar` | Presentation only; destructive action prop stays explicit |
| `web/src/components/chat/FileViewerPanel.tsx` | Right-panel selected file/source header + Monaco viewer + add selection button | `repo/[id]/page.tsx` | Lets route stop owning JSX wall |

### Modified files

| Modified file | Change | Risk |
|---|---|---|
| `web/src/app/repo/[id]/page.tsx` | Replace inline state/effects/handlers with extracted hooks; keep component tree stable first | Highest; migrate in small PR/phase slices |
| `web/src/components/chat/ChatStream.tsx` | Accept normalized `messages` or internally call view-model adapter; remove protocol casts | Medium; renderer snapshot/unit tests needed |
| `web/src/components/chat/ChatInput.tsx` | Replace synthetic form submit with explicit `onSubmitIntent`; remove `ref as any`; use file helper for flat files | Medium; keyboard UX regression risk |
| `web/src/components/chat/FileExplorer.tsx` | Import `FileNode`/`BranchInfo` from `lib/files/fileTree`; delegate recursive render to `FileTreeView` | Low-medium |
| `web/src/components/chat/HistorySidebar.tsx` | Compose `SessionListPanel` and `RepoUtilitiesPanel`; preserve props | Low-medium |
| `web/src/components/chat/ChatLayout.tsx` | Keep presentational; optionally replace Framer motion with GSAP wrapper only after chat tests pass | Low if deferred |
| `web/src/components/chat/types.ts` | Add raw/message view-model types or re-export from `lib/chat/*` | Low |

### Do not modify first

| File/module | Why not first |
|---|---|
| `api/main.py` chat stream | Stable backend contract needed while frontend extraction happens |
| `api/routes/chats.py` | Session APIs already support current flow |
| `web/src/components/ai-elements/prompt-input.tsx` | Oversized, but touching it during route extraction expands blast radius |
| `web/src/components/ui/file-upload.tsx` | Not critical to chat path; defer |
| `web/src/app/repo/[id]/files/page.tsx` | Consolidation candidate, but changing route UX during chat rebuild risks navigation regressions |

## Component Adoption Strategy

OpenUI, GSAP, and servercn should be subordinate to boundary cleanup. Adopt only through adapters, never by replacing the chat route wholesale.

### OpenUI

Use OpenUI for isolated chat UI surfaces when it deletes local code or improves accessibility without changing data ownership.

Good adoption targets:

- Prompt surface replacement or smaller prompt subcomponents after `ChatInput` has explicit callbacks.
- Message/citation display primitives after `AssistantMessageViewModel` exists.
- Empty state/onboarding callout if it can replace bespoke JSX in `ChatStream`.

Avoid:

- Letting generated OpenUI components own sessions, stream transport, or prompt context.
- Importing generated components directly into route page before adapter review.
- Replacing `ChatStream` and `ChatInput` in same phase as transport extraction.

Adoption pattern:

```text
OpenUI generated component -> local adapter in components/chat/adapters/* -> existing chat components
```

### GSAP

GSAP should replace motion only where it centralizes behavior or improves capability. Current `ChatLayout` uses one Framer `motion.div`; this is not the top risk.

Good adoption targets:

- Route/panel enter-exit motion wrapper after layout boundaries stabilize.
- Sidebar/right-panel transitions with reduced-motion guard.
- Chat message arrival animation behind a `useChatMotion` or `GsapPresence` adapter.

Avoid:

- Per-message imperative GSAP calls inside `ChatStream` render map.
- GSAP migration before route orchestration shrinks.
- Mixing Framer and GSAP for same element long-term.

### servercn

Use servercn as a pattern source for backend-backed UI surfaces, not as a reason to move chat state server-side in v1.1.

Good adoption targets:

- Typed server/action-style adapters for backend-backed panels once frontend hooks are stable.
- Reusable backend UI patterns for indexing status, repo health, and session mutations.

Avoid:

- Changing the transport contract or moving SSE ownership during initial extraction.
- Adding servercn abstractions that hide `/api/backend/*` error states from UI.

## Build Order

Roadmap order should reduce blast radius before adding feature polish.

### Phase 1 — Pin current behavior and extract pure helpers

Goal: create safe seams with lowest runtime risk.

1. Add `web/src/lib/files/fileTree.ts` with `FileNode`, `BranchInfo`, `countTreeFiles`, traversal helpers.
2. Add `web/src/lib/files/language.ts` and replace route-local `detectLanguage`.
3. Add `web/src/lib/chat/buildPromptContext.ts` with unit tests for:
   - plain input unchanged
   - `@path` mention rewrite
   - snippet chip inclusion
   - file chip loads full file
   - folder chip caps fan-out at existing 8 files and slices content at existing 8000 chars
4. Modify `page.tsx` submit path to call `buildPromptContext`, but keep stream logic inline.

Why first: pure helpers are easiest to test and remove the most dangerous branch mass from `handleSubmit` without changing UI structure.

### Phase 2 — Extract session state without changing stream behavior

Goal: remove session/message ownership from route before touching SSE.

1. Add `useChatSessionState(repoId)`.
2. Move create/rename/delete/load/active-session persistence into hook.
3. Keep same `ChatSession` shape and endpoint URLs.
4. Keep `messages` updater available so inline stream can still append/update assistant message.
5. Move `/clear` command into hook (`clearMessages`) or a tiny command handler.

Risk boundary: active session localStorage and auto-create behavior. Verify: new repo opens first/created chat, existing repo restores saved chat, delete active chat selects remaining/creates new.

### Phase 3 — Extract transport with typed SSE events and watchdog

Goal: isolate liveness risk.

1. Add `useChatStreamTransport` or lower-level `createChatStreamClient` plus hook wrapper.
2. Define event union:
   - `{ type: "chunk"; content: string }`
   - `{ type: "metadata"; fallback?: boolean; model_used?: string; cascaded?: boolean }`
   - `{ type: "sources"; sources: SourceReference[] }`
   - `{ type: "done" }`
   - `{ type: "error"; message: string }`
3. Add inactivity timeout and absolute max duration. Default recommendation: `inactivityMs=30000`, `maxDurationMs=180000`, configurable constants.
4. Preserve current UI update semantics: add empty assistant message before stream, append chunks, merge metadata, attach sources.
5. Route submit handler becomes orchestration only: build prompt -> append user -> start transport -> reducer updates messages.

Risk boundary: streaming UX. Verify abort button, server 401, malformed event ignored, no body error, stream without chunks exits loading state, timeout creates terminal assistant error.

### Phase 4 — Extract repo branch/index/file workspace

Goal: isolate file/branch mechanics and bounded polling.

1. Add `useRepoBranchState(repoId)`.
2. Add `useIndexingStatusPoll(repoId, { maxAttempts/maxDuration })`.
3. Add `useFileWorkspace(repoId, selectedBranch/defaultBranch)`.
4. Move `loadFileTree`, `loadSelectedFile`, `expandedFolders`, `selectedSource`, `selectedFilePath`, Monaco selection snippet into hook.
5. Keep `FileExplorer` props stable where possible.

Risk boundary: branch defaulting and index auto-trigger. Verify default branch loads, selected branch persists, branch not found clears storage, polling stops on success/error/timeout/unmount.

### Phase 5 — Canonical components and typed render model

Goal: delete duplicated UI logic after state boundaries exist.

1. Add `FileTreeView` and replace both route-local `renderTreeNode` and `FileExplorer` inner renderer.
2. Add `AssistantMessageViewModel` adapter and update `ChatStream` to render normalized data, not protocol-shaped casts.
3. Split `HistorySidebar` into `SessionListPanel` and `RepoUtilitiesPanel` while keeping `HistorySidebar` as shell.
4. Extract `FileViewerPanel` from route right-panel JSX.
5. Update `ChatInput` to use explicit submit callback and typed ref.

Risk boundary: visual and keyboard regressions. Verify drag file/folder to prompt, click file, click citation source, select Monaco lines -> add snippet, Enter submits, Shift+Enter newline, mention menu keyboard works.

### Phase 6 — Controlled component adoption / motion polish

Goal: adopt OpenUI/GSAP/servercn only after ownership is clean.

1. Spike OpenUI components in separate adapter folder. Adopt only if it removes local code or fixes accessibility.
2. Replace Framer Motion in `ChatLayout` only if GSAP wrapper covers route/panel/message transitions cleanly and respects reduced motion.
3. Apply servercn-inspired backend-backed component patterns to indexing status/session mutations only if they keep errors explicit.
4. No backend endpoint changes unless frontend tests and transport grammar are pinned.

Recommended roadmap sequence:

```text
Pure helpers -> session hook -> stream transport/watchdogs -> repo/file hooks -> canonical components -> OpenUI/GSAP/servercn polish
```

Do not start with visual overhaul. It would animate a boundary problem and make regressions harder to isolate.

## Risks

### Critical risks

| Risk | What breaks | Mitigation |
|---|---|---|
| Route rewrite instead of strangler extraction | Current chat flow breaks across sessions/files/streaming at once | One boundary per phase; keep endpoint contracts stable |
| SSE extraction changes event semantics | Assistant messages stuck, metadata badges missing, sources lost | Typed event union, fixture tests from current stream chunks |
| Missing liveness budgets | Loading state hangs forever on stalled stream or pending index | Inactivity watchdog + max duration + terminal UI state |
| Prompt-context extraction changes prompt text | Backend answers degrade or referenced snippets disappear | Golden tests for exact current prompt assembly |
| Branch/index extraction changes default branch behavior | Empty file tree, wrong branch content, repeated indexing | Preserve localStorage key and default branch resolution; add timeout |

### Moderate risks

| Risk | What breaks | Mitigation |
|---|---|---|
| `FileNode` type remains imported from `FileExplorer` | Domain code depends on presentation component | Move type to `lib/files/fileTree.ts` first |
| ChatStream view model too broad | Renderer remains protocol-coupled under new name | Adapter owns all optional metadata/tool/reasoning shape; renderer gets stable booleans/arrays |
| Sidebar split changes collapsed behavior | Navigation/session list usability regression | Keep `HistorySidebar` shell and `useSidebar` usage centralized |
| ChatInput explicit submit changes keyboard UX | Enter/Shift+Enter regressions | Component tests/manual smoke for key behavior |
| GSAP + existing motion overlap | Double animations/jank | Adopt GSAP after deleting Framer use on same nodes |

### Risk boundaries / no-go lines

- Do not change backend chat stream endpoint and frontend stream parser in same phase unless a compatibility adapter supports both old and new grammar.
- Do not adopt OpenUI-generated stateful components that own sessions, file tree, or transport.
- Do not modify `prompt-input.tsx` internals until `ChatInput` has a typed wrapper and tests.
- Do not remove `files/page.tsx` or consolidate file routes during initial chat rebuild; mark for later after canonical `FileTreeView` lands.
- Do not add feature flags for every extraction unless needed for rollback; prefer small reversible commits/phases.

### Validation gates per phase

| Phase | Minimum validation |
|---|---|
| Pure helpers | Unit tests for prompt assembly, language detection, tree traversal |
| Session hook | Manual smoke: create/rename/delete/select/restore sessions |
| Stream transport | Mock SSE tests: chunk, metadata, sources, error, abort, timeout |
| Repo/file hooks | Manual smoke: branch select, index trigger, file open, source open, selection snippet |
| Component split | UI smoke: drag/drop, mention menu, right panel, sidebar tabs |
| Adoption polish | Visual regression/manual reduced-motion check |

## Sources

- `.planning/PROJECT.md` — v1.1 milestone goals and active requirements.
- `.planning/THERMO-NUCLEAR-REVIEW.md` — structural blockers and required chat extractions.
- `.planning/THERMO-COVERAGE-MATRIX.md` — audited file coverage.
- `.planning/codebase/ARCHITECTURE.md` — current system layers and endpoint flow.
- `.planning/codebase/STRUCTURE.md` — existing source layout and add-new-code guidance.
- `graphify-out/GRAPH_REPORT.md` — graph hubs, helper clusters, and frontend extraction seams.
- Current source reads: `web/src/app/repo/[id]/page.tsx`, `ChatStream.tsx`, `ChatInput.tsx`, `FileExplorer.tsx`, `HistorySidebar.tsx`, `ChatLayout.tsx`, `components/chat/types.ts`.
