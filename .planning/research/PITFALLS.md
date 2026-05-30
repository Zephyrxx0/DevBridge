# Pitfalls: v1.1 Chat System Rebuild

**Domain:** Existing DevBridge chat workspace rebuild with OpenUI, GSAP, and servercn-informed patterns  
**Researched:** 2026-05-29  
**Overall confidence:** HIGH for existing-code pitfalls, MEDIUM for OpenUI/GSAP adoption rules, LOW for servercn specifics beyond npm package metadata.

## Critical Pitfalls

### 1. OpenUI import makes existing oversized AI elements worse

**What goes wrong:** `npx @openuidev/cli@latest create` is treated as an install path into this app instead of an exploration/scaffold path. Generated chat app/components get copied beside existing `web/src/components/ai-elements/*`, increasing duplicate ownership around `PromptInput`, `Conversation`, `Message`, `Reasoning`, `Tool`, and citation rendering.

**Why this is codebase-specific:** Current debt already includes `web/src/components/ai-elements/prompt-input.tsx` at 1467 LOC and `web/src/components/ui/file-upload.tsx` at 1415 LOC. `ChatInput` wraps `PromptInput` but still dispatches synthetic form events and uses `ref={inputRef as any}`. `ChatStream` already imports many AI Elements render pieces and casts tool input/output as `never`.

**Consequence:** Rebuild becomes a second chat system, not simplification. Route-level orchestration survives, AI Elements grows, and generated code hides boundary debt behind nicer UI.

**Prevention:** OpenUI may only enter through a throwaway sandbox branch/folder. Adopt patterns manually, not generated app structure. Any copied component must replace or shrink existing code in same PR. No new prompt/file-upload abstraction unless it deletes current pass-through/context layers.

**Confidence:** HIGH. Existing file sizes and ownership problems are documented in thermo review; OpenUI CLI README states `create` scaffolds a new Next.js app and installs dependencies.

### 2. Route page absorbs servercn-style backend-backed UI patterns

**What goes wrong:** servercn-inspired backend/component coupling gets implemented directly inside `web/src/app/repo/[id]/page.tsx`: server actions, fetch wrappers, state machines, or generated endpoint clients pile into the route that already owns session lifecycle, branch/index state, prompt context assembly, file selection, Monaco selection, and stream decoding.

**Why this is codebase-specific:** `repo/[id]/page.tsx` is 991 LOC and already handles `/chats`, `/messages`, `/files`, `/branches`, `/index-status`, `/chat/stream`, `/remove`, file-tree rendering, language detection, snippet expansion, mention rewriting, and stream parsing. It is the exact place new integration patterns are most tempting and most harmful.

**Consequence:** Backend/component patterns become route-level orchestration glue. Future features such as agent modes, deep/full-file mode, and admin health visibility add more branches instead of stable contracts.

**Prevention:** Treat servercn as pattern input only. First create local contracts: `chat-session-service`, `chat-stream-client`, `prompt-context-builder`, `repo-branch-state`, and `file-tree-model`. Only then map any servercn-like component/backend pattern onto those contracts.

**Confidence:** MEDIUM. Codebase risk is HIGH; servercn package specifics are LOW because npm metadata only identifies it as a backend components CLI for Node/TypeScript, with no README available.

### 3. Stream parser continues mutating UI state directly

**What goes wrong:** New OpenUI message parts, tool calls, reasoning blocks, sources, and model metadata are added inside the current `while (true) reader.read()` loop, with more `setMessages` calls and render-specific fields.

**Why this is codebase-specific:** Current stream loop parses `chunk`, `metadata`, `sources`, `done`, and `error` in `repo/[id]/page.tsx` and updates React state immediately. It has no typed event boundary, no inactivity watchdog, and no reducer. `ChatStream` compensates by casting message shape for tool calls/reasoning.

**Consequence:** Racey partial assistant messages, broken source/model metadata ordering, harder stop-generation behavior, and no clean way to test stream protocol separately from rendering.

**Prevention:** Extract `chat-stream-client` that emits typed events. Feed those events into `assistant-message-reducer`. `ChatStream` receives `AssistantMessageViewModel[]`, never transport events. Add inactivity timeout, abort propagation, malformed-event telemetry, and terminal states.

**Confidence:** HIGH. Existing loop and thermo review explicitly identify this as blocker.

### 4. GSAP adds imperative animation leaks on top of long-lived chat surfaces

**What goes wrong:** GSAP timelines/listeners are added directly in components or event handlers without `useGSAP` scoping, `contextSafe`, cleanup, reduced-motion gating, or route-transition teardown.

**Why this is codebase-specific:** Chat surfaces already have intervals, global events, polling, EventSource usage, generated CSS animations, Framer/Motion dependency, and sidebar/image fallback state. `ChatStream` has window events and a thinking interval. `repo/[id]/page.tsx` has polling and streaming. Animation leaks would be hard to distinguish from existing liveness issues.

**Consequence:** Ghost animations after route changes, stale DOM refs, scroll jank while streaming, inaccessible motion, duplicate animation systems (`motion` package + CSS `animate-in` + GSAP), and flaky tests.

**Prevention:** Add one `useGsapMotion` adapter and one `MotionBoundary` policy. GSAP only in leaf presentation components. No GSAP in stream/session/prompt hooks. All event-triggered animations must use `contextSafe` and explicit listener cleanup. Honor `prefers-reduced-motion`. Remove or quarantine overlapping Framer/Motion/CSS animations when GSAP replaces them.

**Confidence:** HIGH for React/GSAP lifecycle rules. GSAP React docs require context scoping, `contextSafe` for callbacks, and event listener cleanup.

### 5. File-tree duplication survives under prettier components

**What goes wrong:** OpenUI/servercn-inspired panels or GSAP animated trees add a third file tree while existing `FileExplorer` and route-level renderer remain.

**Why this is codebase-specific:** `FileExplorer` has `renderTreeNode`; `repo/[id]/page.tsx` has another recursive tree renderer and drag payload logic; `files/page.tsx` and `files/[...path]/page.tsx` are parallel file browsing surfaces. Language detection also exists route-local.

**Consequence:** Different drag payload semantics, folder fan-out bugs, branch mismatch, inconsistent selected-file state, and drift between workspace file viewer and files routes.

**Prevention:** Build `FileTreeView` + `useFileTree` + `detectLanguage` shared utility before visual redesign. Every file tree consumer must use the same node model, selection API, drag payload creator, branch parameter handling, and empty/indexing states.

**Confidence:** HIGH. Duplication exists in audited files.

### 6. Prompt context assembly remains hidden inside submit UX

**What goes wrong:** Agent modes, OpenUI prompt controls, attachment UX, folder references, and deep/full-file mode get bolted onto `ChatInput`/`handleSubmit` rather than a pure prompt-context builder.

**Why this is codebase-specific:** `handleSubmit` expands snippet chips, walks folder nodes, fetches file contents, rewrites `@mentions`, builds prompt strings, posts stream requests, and updates UI. `ChatInput` handles mention menu UX but route owns final prompt semantics.

**Consequence:** Hard-to-test prompt drift, accidental 48K context overruns, wrong branch file fetches, duplicate mention parsing, and future agent mode payloads mixed into raw prompt text.

**Prevention:** Create `buildPromptContext({ userText, snippets, mentions, mode, branch, budget })` as pure/tested module plus a separate async file-content resolver. Submit path should orchestrate contracts, not build strings.

**Confidence:** HIGH.

## Warning Signs

| Warning sign | Means | Immediate action |
|---|---|---|
| `repo/[id]/page.tsx` grows instead of shrinks | Rebuild is adding orchestration to existing monolith | Stop feature work; extract route shell boundary first |
| New files under `components/ai-elements` without deleting/splitting old code | OpenUI adoption is additive slop | Reject PR unless net LOC/complexity drops in prompt/message stack |
| `as any`, `as never`, or raw protocol fields added in `ChatStream` | Typed assistant-message boundary missing | Introduce/extend `AssistantMessageViewModel` before render changes |
| More `setMessages` calls inside stream loop | Transport and UI still coupled | Move stream handling into reducer/client module |
| New GSAP code outside a dedicated hook/leaf component | Imperative animation leaking into domain logic | Move into `useGsapMotion` or remove |
| Event listeners/timelines lack cleanup | Animation or DOM leak likely | Require cleanup in same hook; use GSAP context/contextSafe |
| New file-tree renderer, local `detectLanguage`, or drag payload builder | Duplication continuing | Route all file tree work through canonical model/view |
| servercn-generated/client code imported directly into route page | Backend pattern bypassing app boundaries | Wrap behind service adapter before use |
| `PromptInput` API changes force casts or synthetic form events | Existing input abstraction still wrong size/shape | Fix prompt input boundary before adding controls |
| Polling/stream code lacks max duration/inactivity timer | Liveness bug remains | Add watchdog before UI polish |
| New dependency in `package.json` for one generated component | OpenUI/servercn slop adoption | Vendor minimal code or reuse existing primitives |

## Prevention Strategy

### Guardrail 1: Net-deletion adoption rule

OpenUI and servercn-informed code may be adopted only when it deletes or shrinks existing local code. No parallel components. No generated full app import. No dependency added unless two existing abstractions disappear or a hard feature gap exists.

### Guardrail 2: Route shell target

`web/src/app/repo/[id]/page.tsx` must become composition shell. Target owners:

- `useChatSessionState(repoId)` owns sessions/messages loading and chat CRUD.
- `useChatStreamTransport()` owns fetch/abort/watchdog/protocol event parsing.
- `assistant-message-reducer` owns message state transitions.
- `buildPromptContext()` owns snippets/mentions/folder fan-out/budgeting.
- `useRepoBranchState()` owns branches, selected branch, indexing status, storage.
- `FileTreeView` + `useFileTree()` owns tree rendering, selection, drag payloads.

### Guardrail 3: Typed boundary before UI redesign

Before GSAP/OpenUI visual work, define:

```ts
type AssistantMessageViewModel = {
  id: string;
  content: string;
  status: "pending" | "streaming" | "complete" | "error" | "aborted";
  sources: SourceReference[];
  model?: { used?: string; cascaded?: boolean; fallback?: boolean };
  reasoning?: string;
  toolCalls: ToolCallViewModel[];
};
```

Rendering consumes this model only. Transport never leaks into `ChatStream`.

### Guardrail 4: GSAP policy

- Install/use `@gsap/react` with `useGSAP`; do not hand-roll unscoped `useEffect` timelines.
- Scope every animation to a container ref.
- Use `contextSafe()` for callbacks and delayed/event-triggered animation.
- Remove event listeners in returned cleanup.
- Honor `prefers-reduced-motion` and skip nonessential animations while streaming.
- One animation system per surface: replace existing `motion`/CSS animation in touched components rather than layering GSAP over it.

### Guardrail 5: servercn pattern adapter

Do not import generated/backend component patterns into app routes. Create adapters:

- `apiClient.chat.*` for chat/session operations.
- `apiClient.repoFiles.*` for tree/content operations.
- `apiClient.indexing.*` for branch/index status.
- Typed error envelopes and timeout policy shared across adapters.

Use servercn as naming/shape inspiration after these boundaries exist.

### Guardrail 6: Liveness budget

Every long-lived path must have:

- abort signal propagation
- inactivity timeout
- max duration or max attempts
- terminal UI state
- telemetry/log point for timeout/error/abort

Applies to chat stream, indexing polling, onboarding SSE, and future animated transitions that wait on route/panel state.

## Phase Ownership

| Phase | Owns | Must prevent | Exit criteria |
|---|---|---|---|
| Phase 1 — Chat Boundary Extraction | route shell, chat session hook, stream client, reducer, prompt-context builder | Adding OpenUI/GSAP/servercn before ownership is fixed | `repo/[id]/page.tsx` no longer parses stream events or builds prompt strings; stream has watchdog; reducer tested |
| Phase 2 — File Tree + Branch Canonicalization | `FileTreeView`, `useFileTree`, `useRepoBranchState`, `detectLanguage` utility | Third tree renderer, branch drift, duplicate language maps | All workspace/file routes consume same tree model/view or explicitly redirect/defer |
| Phase 3 — Prompt Input / Upload Simplification | `PromptInput` boundary, upload adapter, mention UX, snippet chips | OpenUI prompt controls expanding 1467 LOC prompt input or 1415 LOC upload file | `as any` ref removed; synthetic submit removed; headless controller split from view; net code smaller |
| Phase 4 — OpenUI Pattern Adoption | selective message/reasoning/tool/citation patterns | Full generated app import, duplicate AI Elements stack, extra deps | Adoption log says copied/reused components, deleted components, dependency impact, why simpler |
| Phase 5 — GSAP Motion Overhaul | motion adapter, panel/route/chat animations, reduced motion | imperative leaks, mixed animation stacks, streaming jank | All GSAP uses `useGSAP`/scope/contextSafe; reduced-motion path verified; no domain hook imports GSAP |
| Phase 6 — servercn-Informed Backend Pattern Mapping | API adapters, typed envelopes, backend-backed UI surfaces | Route-level backend glue, generated API code crossing boundaries | servercn-inspired pieces sit behind app-owned services; route imports no raw backend-pattern code |
| Phase 7 — Regression / Thermo Closure | tests, fallow, bundle/dependency review, UAT | slop surviving because UI looks better | thermo blockers closed or explicitly deferred; no new giant files; no new duplicate ownership |

## Stop Conditions

Stop phase and replan if any condition appears:

1. `web/src/app/repo/[id]/page.tsx` increases by more than 50 LOC before Phase 1 exit.
2. Any new chat component exceeds 300 LOC without explicit split plan.
3. `prompt-input.tsx` or `file-upload.tsx` grows before their decomposition phase.
4. New OpenUI-generated app structure appears inside production `web/src/app` or `web/src/components` without deletion of replaced code.
5. Any `gsap.to/from/timeline` appears outside approved motion hook/leaf animation component.
6. GSAP event-triggered animation lacks `contextSafe` or cleanup.
7. Stream parsing still calls `setMessages` directly after stream client phase.
8. `ChatStream` receives raw transport payloads or adds new casts.
9. New servercn/backend-generated code is imported directly by `repo/[id]/page.tsx`.
10. A second/third file-tree renderer is added instead of canonical `FileTreeView`.
11. New dependencies are added for generated UI without dependency review and replacement rationale.
12. Polling/stream/SSE code ships without max duration or inactivity timeout.

Source basis: `.planning/PROJECT.md`, `.planning/THERMO-NUCLEAR-REVIEW.md`, `.planning/THERMO-COVERAGE-MATRIX.md`, `.planning/DEFERRED.md`, inspected chat files under `web/src`, Context7 GSAP React docs, Context7 AI Elements docs, npm metadata for `@openuidev/cli` and `servercn`.
