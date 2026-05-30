# Feature Landscape: v1.1 Chat System Rebuild

**Domain:** DevBridge AMD Edition chat workspace rebuild  
**Researched:** 2026-05-29  
**Overall confidence:** MEDIUM-HIGH  
**Downstream consumer:** Requirements  

## Table Stakes

Features users expect after this milestone. Missing = rebuild feels worse than current app.

| Feature | User-visible outcome | Complexity | Existing dependency | Testable acceptance signal |
|---------|----------------------|------------|---------------------|----------------------------|
| **Stable canonical chat workspace** | User opens a repo and sees one coherent chat surface: history left, conversation center, file/source panel right. No route-level flicker or broken state handoffs. | High | `repo/[id]/page.tsx`, `ChatLayout`, `HistorySidebar`, `ChatStream`, `ChatInput`, `FileExplorer` | Switch sessions, select files, open sources, refresh page; active session/branch/file state remains coherent. |
| **Streaming chat parity with stop/error states** | User sends a message, sees assistant stream, can stop generation, and gets clear terminal error state if stream fails/stalls. | High | Existing `/chat/stream`, `streamAbortRef`, `messages`, `isLoading` | Simulated chunk stream, error event, no-body response, and hung stream each leave UI interactive with no permanent spinner. |
| **Prompt context affordances stay usable** | User can `@mention` files, drag/drop files/folders/snippets, and see attached chips before send. | High | `ChatInput`, `SnippetChip`, file tree, Monaco selection, prompt assembly in route page | Mention autocomplete keyboard path works; dropped file/folder creates chip; sent user message preserves visible artifact chips. |
| **Source-to-file inspection loop** | User clicks assistant sources and lands in the right-panel file viewer at relevant file metadata without losing chat. | Medium | `ChatStream.onSelectSource`, `selectedSource`, `selectedFilePath`, Monaco viewer | Source button opens right panel with file path and line range; back returns to file explorer. |
| **Session management basics** | User can create, rename, delete, and switch chats without losing current repo context. | Medium | `HistorySidebar`, `/repo/{id}/chats`, localStorage active session | CRUD actions update sidebar and active conversation; deleting active chat selects valid replacement. |
| **Branch/file index visibility** | User understands why file context is missing/loading and can trigger indexing from repo utilities. | Medium | branch list, index status polling, `branchIndexMsg`, `FileExplorer` | Empty/unindexed branch shows actionable message; indexing has success/fail/timeout state. |
| **Thermo ownership remediation with no UX regression** | User sees same or better behavior, but system no longer feels brittle: fewer duplicate file trees, fewer stuck states, clearer model/tool display. | High | route-level orchestration, duplicated tree renderer, typed message boundary | Thermo blockers closed: extracted chat session state, stream transport, prompt context builder, canonical `FileTreeView`, typed assistant view model. |
| **Accessible motion baseline** | UI movement feels smoother but never blocks reading, keyboard use, reduced-motion users, or loading recovery. | Medium | current `motion` usage, layout/sidebar/right-panel transitions | `prefers-reduced-motion` disables nonessential motion; focus remains stable across sidebar/panel/chat transitions. |

## Differentiators

Valued beyond baseline. Build only where they reduce complexity or improve comprehension.

| Feature | User-visible outcome | Value proposition | Complexity | Existing dependency | Testable acceptance signal |
|---------|----------------------|-------------------|------------|---------------------|----------------------------|
| **OpenUI-rendered structured assistant cards** | Assistant can answer with structured cards/sections/follow-ups instead of only markdown when response shape benefits from UI. | Makes codebase guidance easier to scan: sources, follow-up actions, checklist blocks, and onboarding summaries can become interactive surfaces. | High | `ChatStream`, assistant message model, existing ai-elements renderer stack | OpenUI response renders through a guarded adapter; malformed OpenUI falls back to markdown without crashing. |
| **OpenUI CLI discovery/install workflow** | User may not see CLI directly, but product gains vetted generated component candidates instead of hand-rolled UI sprawl. | Keeps exploration reproducible: `npx @openuidev/cli@latest create` used in scratch path, then only selected components/patterns copied/adapted. | Low-Med | repo tooling/docs; no direct runtime dependency unless adopted | Research note or script documents created app/component path; installed packages only if component survives acceptance review. |
| **GSAP layout choreography** | Sidebar collapse, right-panel open/close, source jump, message entry, and file-tree expansion feel physically consistent. | Differentiates product polish; code intelligence UI feels intentional, not CRUD-like. | Medium-High | `ChatLayout`, `HistorySidebar`, `FileExplorer`, `ChatStream`, CSS tokens | Route/panel/chat transitions use one motion timing system; no layout jump, no double animation, reduced-motion respected. |
| **GSAP FLIP for panel/file transitions** | Moving from source citation to file viewer or explorer to selected file animates continuity instead of hard replacing panes. | Helps user keep spatial context in dense code navigation. | High | right panel selected-source/file state, file explorer state | Toggling explorer/file/source preserves scroll/focus and animates transform/opacity only. |
| **Typed assistant view models for reasoning/tools/model state** | User sees consistent model badges, reasoning disclosure, tool state, sources, and errors across old markdown and new OpenUI paths. | Reduces rendering bugs and makes routing/escalation explainable. | High | `Message`, `EscalationIndicator`, reasoning/tool casts in `ChatStream` | View model schema covers text, OpenUI, reasoning, tools, sources, model metadata, error; renderer has no broad `as never` casts. |
| **Backend-backed UI pattern review** | If useful, repo utilities/admin-like actions become consistent backend-backed surfaces with predictable loading/error states. | servercn-style review can inform reusable service/controller/component boundaries, but direct adoption likely low-fit. | Medium | Next API proxy, `/api/backend`, Supabase-backed app, repo utilities | One backend-backed UI pattern documented/applied only if it fits existing Next/Supabase architecture. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why avoid | What to do instead | Confidence |
|--------------|-----------|-------------------|------------|
| **Wholesale OpenUI scaffold replacement** | `create` scaffolds a new chat app; replacing DevBridge workspace would break repo/session/file/sidebar flows. | Use OpenUI CLI as discovery path. Adopt narrow renderer/components behind adapters. | HIGH |
| **OpenUI everywhere** | Dynamic UI is valuable for structured assistant output, not for every message/control. Overuse adds parser/runtime failure modes. | Use OpenUI for assistant answer blocks, follow-ups, onboarding summaries, or backend-backed cards only. Markdown stays default. | HIGH |
| **Animation as product feature** | Heavy motion can obscure code reading, hurt accessibility, and add cleanup bugs. | GSAP only for transforms/opacity/layout continuity; honor reduced motion; keep durations short. | HIGH |
| **Parallel animation systems** | Existing `motion` plus GSAP plus CSS animation creates inconsistent timing and teardown complexity. | Pick GSAP as canonical for rebuild surfaces; leave or remove old motion per component, not mixed inside same transition. | MEDIUM-HIGH |
| **Direct servercn backend install into current app** | Inspected npm package targets Node/TypeScript backend components, Express, MongoDB, MVC/feature architectures. Current app is Next/Supabase/backend proxy. Docs/site unavailable during research. | Treat servercn as pattern review only unless a component clearly matches. Do not add `servercn.json` or generated backend files to web app by default. | MEDIUM |
| **New chat features before ownership split** | Adding modes/cards/actions onto route-level monolith worsens thermo blockers. | First extract session/transport/prompt/file-tree/view-model boundaries, then layer UI features. | HIGH |
| **Hidden liveness failures** | Current thermo review flags SSE and polling paths with no hard watchdog. Users experience infinite “Thinking…” or “Indexing…” states. | Add inactivity timeout, max duration/attempts, explicit retry/cancel states. | HIGH |
| **Duplicate file browser variants** | Current app has repeated file tree/viewer concepts. More variants cause drift. | Create canonical `FileTreeView` + `useFileTree`; reuse in chat right panel and file routes. | HIGH |

## Feature Categories

| Category | Scope for v1.1 | User perspective | Table stakes vs differentiator | Primary dependencies | Notes |
|----------|----------------|------------------|-------------------------------|----------------------|-------|
| **Chat shell** | Preserve/rebuild layout, sessions, active state, loading/error states. | “I can work in one place without state surprises.” | Table stakes | `ChatLayout`, `HistorySidebar`, route state | First dependency for all other features. |
| **Transport/liveness** | Extract stream client, typed events, abort/watchdog/error states. | “If generation breaks, I know and can recover.” | Table stakes | `/chat/stream`, `isLoading`, `streamAbortRef` | Required before OpenUI streaming. |
| **Prompt context** | Extract `buildPromptContext`; keep mentions/snippets/folders visible and bounded. | “I know exactly what context I sent.” | Table stakes | `ChatInput`, file tree, Monaco selection, snippets | Must handle branch-aware file fetch later. |
| **File/source workspace** | Canonical file tree/viewer/source panel. | “Sources and snippets take me to code predictably.” | Table stakes | `FileExplorer`, right panel, files routes | Blocks duplicate renderer debt. |
| **Assistant rendering** | Typed view model; markdown default; optional OpenUI renderer. | “Rich answers render when useful, plain answers stay reliable.” | Differentiator | `ChatStream`, OpenUI packages if adopted | Guarded adapter required. |
| **Motion system** | GSAP timing, transforms, panel/message/sidebar movement. | “The UI feels smooth and spatially understandable.” | Differentiator, with accessibility table-stake | GSAP, `@gsap/react`, layout components | Avoid animating content height in chat stream if it harms reading. |
| **Backend-backed pattern mapping** | Review servercn-style component/service separation for repo utility/admin surfaces. | “Backend actions feel consistent: pending, success, failure, retry.” | Differentiator if applied narrowly | Next proxy/backend APIs, repo utility actions | Pattern source low-confidence; validate before implementation. |
| **Quality remediation** | Thermo blockers, file size, duplication, typed contracts. | “Fewer regressions as chat evolves.” | Table stakes | all chat workspace modules | Must precede flashy UI work. |

## Requirement Candidates

Candidate IDs designed for requirements grooming. Each is testable.

| ID | Candidate requirement | Category | Priority | Complexity | Depends on | Acceptance test |
|----|-----------------------|----------|----------|------------|------------|-----------------|
| CHAT-01 | Workspace page shall become composition shell; chat session state, stream transport, prompt context assembly, and file tree state shall move to named hooks/modules. | Quality remediation | Must | High | Existing `repo/[id]/page.tsx` | Route page no longer owns stream loop or prompt assembly; feature behavior unchanged in E2E smoke. |
| CHAT-02 | Chat stream transport shall expose typed events: chunk, metadata, sources, error, done, timeout, aborted. | Transport/liveness | Must | High | `/chat/stream` current protocol | Unit test feeds event chunks and verifies state transitions without React page. |
| CHAT-03 | Stream UI shall enforce inactivity timeout and user-visible recovery state. | Transport/liveness | Must | Medium | CHAT-02 | Hung stream simulation shows timeout message and enables retry/new send. |
| CHAT-04 | Index polling shall enforce max duration/attempt budget and terminal failed/stale state. | Transport/liveness | Must | Medium | branch index polling | Persistent pending status stops polling and displays action. |
| CHAT-05 | Prompt context builder shall be pure and return display artifacts plus backend prompt payload for text, mentions, snippets, files, and folders. | Prompt context | Must | High | `SnippetChip`, file tree/file fetch adapter | Given mixed chips/mentions, builder output is deterministic and bounded. |
| CHAT-06 | Chat input shall submit via explicit callback, not synthetic DOM submit event, and textarea ref shall be typed without `as any`. | Prompt context | Must | Low-Med | `PromptInputTextarea`, `ChatInput` | Enter submits once; TypeScript has no ref cast. |
| CHAT-07 | File tree rendering and drag payload creation shall be canonicalized in one `FileTreeView`. | File/source workspace | Must | Medium | `FileExplorer`, route duplicate renderer | Import graph shows one tree renderer used by right panel and workspace; drag file/folder still creates valid chips. |
| CHAT-08 | Source citation click shall open right-panel viewer with file path, line range, model similarity metadata, and stable back behavior. | File/source workspace | Must | Medium | selected source/file state | Playwright click on source opens viewer and closes back to explorer. |
| CHAT-09 | Assistant messages shall be normalized into a typed `AssistantMessageViewModel` before rendering. | Assistant rendering | Must | High | `Message`, `ChatStream` | Reasoning/tool/model/source rendering uses typed fields; no broad protocol casts in render path. |
| CHAT-10 | OpenUI renderer shall be available behind an adapter and feature gate for assistant messages marked as OpenUI Lang. | Assistant rendering | Should | High | CHAT-02, CHAT-09, OpenUI packages | Valid OpenUI card renders; invalid OpenUI logs error and falls back to markdown content. |
| CHAT-11 | OpenUI CLI exploration shall be documented/reproducible with exact command and candidate component notes. | Assistant rendering | Should | Low | none | Research/dev note includes `npx @openuidev/cli@latest create`; no scaffold files leak into app unless selected. |
| CHAT-12 | GSAP shall be the canonical animation system for chat workspace transitions touched in v1.1. | Motion system | Should | Medium | `gsap`, `@gsap/react`, current `motion` use | Touched components use `useGSAP` scoped cleanup; no same-element mix of GSAP and `motion`. |
| CHAT-13 | Motion shall respect `prefers-reduced-motion` and preserve keyboard focus during panel/sidebar/message transitions. | Motion system | Must | Medium | CHAT-12 | Reduced-motion browser setting disables nonessential transitions; keyboard focus remains on intended control. |
| CHAT-14 | Sidebar shall split session list from repo utilities as separate panels under one composition shell. | Chat shell | Should | Medium | `HistorySidebar` | Chat tab handles sessions only; utility tab handles map/search/annotations/index/theme/delete. |
| CHAT-15 | Backend-backed component pattern review shall produce one integration decision: adopt adapter pattern, defer, or reject servercn for this app. | Backend-backed pattern mapping | Should | Low-Med | servercn docs/package validation | Decision note cites fit/gaps; no runtime package added if rejected/deferred. |
| CHAT-16 | Chat workspace shall preserve existing onboarding entry and completion summary behavior after refactor. | Chat shell | Must | Medium | `OnboardingGuide`, onboarding event | Empty chat shows onboarding; completion creates reopen summary once. |
| CHAT-17 | Session/history actions shall expose non-blocking pending/error feedback instead of only prompt/confirm side effects. | Chat shell | Could | Medium | chat session API | Rename/delete failure shown inline/toast; sidebar remains usable. |
| CHAT-18 | File/folder context chips shall communicate scope limits for folder expansion. | Prompt context | Could | Low | CHAT-05 | Folder chip indicates capped files/count; user can remove before send. |

## Deferred Items

| Deferred item | Why defer | Revisit when |
|---------------|-----------|--------------|
| Full OpenUI chat app migration | Too disruptive; generated scaffold does not know DevBridge repo/session/file flows. | After adapter proves value on 2-3 assistant blocks. |
| Agent mode switcher / deep full-file mode | Present in thermo spec-gap list, but not a named v1.1 target. Adds backend/request contract work. | After chat ownership and prompt context builder are stable. |
| Admin health dashboard expansion | Valuable but outside chat rebuild target. | Separate admin/observability phase. |
| Removing parallel file routes | Needs route usage/UX decision beyond chat right panel. | After canonical file tree/viewer extracted and tested. |
| Broad servercn-generated backend adoption | Package/docs fit uncertain; current package appears Express/Mongo-only from tarball inspection. | If official docs become available and match Next/Supabase/backend proxy architecture. |
| Complex GSAP scroll choreography | High risk in chat streams; could fight sticky-to-bottom behavior. | After basic panel/message transforms pass accessibility/perf checks. |

## Feature Dependencies

```text
Thermo ownership split
  → typed stream transport
  → typed assistant message view model
  → OpenUI adapter / structured assistant cards

Thermo ownership split
  → pure prompt context builder
  → reliable mentions/snippets/folder chips
  → future mode/deep-context controls

Canonical file tree/viewer
  → source citation navigation
  → snippet drag/drop consistency
  → possible files-route consolidation

GSAP dependency + useGSAP cleanup pattern
  → sidebar/right-panel/message transitions
  → reduced-motion/focus verification

servercn review decision
  → optional backend-backed action surface pattern
```

## MVP Recommendation

Prioritize:

1. **Thermo-safe chat refactor**: extract session state, transport, prompt builder, file tree, assistant view model.
2. **User-visible liveness and parity**: no stuck streaming/indexing, no lost sessions/files/sources/snippets.
3. **GSAP minimal motion layer**: sidebar, right panel, message entry with reduced-motion support.
4. **OpenUI narrow adapter**: one structured assistant card path behind fallback.
5. **servercn decision note**: pattern review only; no default package/runtime adoption.

Defer broad OpenUI migration, complex motion choreography, agent modes, deep-context controls, and admin health dashboards.

## Sources

- Project context: `.planning/PROJECT.md` (v1.1 targets and constraints) — HIGH.
- Thermo review: `.planning/THERMO-NUCLEAR-REVIEW.md` and `.planning/THERMO-COVERAGE-MATRIX.md` — HIGH.
- Current chat code: `web/src/app/repo/[id]/page.tsx`, `web/src/components/chat/*` — HIGH.
- OpenUI docs via Context7 `/thesysdev/openui`: CLI `npx @openuidev/cli@latest create`, packages `@openuidev/react-lang`, `@openuidev/react-ui`, `Renderer` streaming/fallback-adapter implications — HIGH for API shape.
- GSAP docs via Context7 `/greensock/react` and `/websites/gsap_v3`: `useGSAP` scoped cleanup/contextSafe, transform aliases, FLIP caveats — HIGH.
- servercn npm package inspection (`servercn@1.0.0` tarball): CLI supports `init/list/add`, config targets Express + MongoDB + MVC/feature; official site/docs fetch failed — MEDIUM/LOW for ecosystem fit, enough to recommend pattern-review-only.
