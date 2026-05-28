# Phase 33: Behavior Pinning & Prompt Helpers - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 33 preserves current onboarding entry/completion and chat prompt-submission behavior while extracting prompt context assembly into pure, typed, testable helpers. It covers existing text, `@path` mentions, snippets, files, and folders. It does not add new attachment/upload behavior, transport/liveness behavior, OpenUI, GSAP, or shell/session ownership changes.

</domain>

<decisions>
## Implementation Decisions

### Prompt Contract
- **D-01:** The pure prompt builder must return a three-part result: `displayMessage`, `backendPrompt`, and `artifacts`.
- **D-02:** `displayMessage` preserves the visible user text and artifacts shown in chat; `backendPrompt` contains the expanded sent context.
- **D-03:** File and folder content load failures must remain explicit in `backendPrompt` as failure notes, preserving current behavior instead of blocking send or omitting references.
- **D-04:** `@path` mentions remain lightweight labels only. The helper rewrites/list-references them like today; it must not fetch file contents for mentions in this phase.
- **D-05:** Prompt builder tests must assert exact key section strings/order for `Referenced snippets` and `Referenced files`, plus display artifacts.

### Chip Scope Display
- **D-06:** Chips must show type plus scope before send: snippet path/line range, file path, or folder path with cap text.
- **D-07:** Folder chips must communicate the fixed cap text `up to 8 files, 8k chars each` before send. Do not add dynamic count work unless planner finds it trivial and behavior-neutral.
- **D-08:** Replace optional `kind` with a discriminated union for the existing chip concept so file, folder, and snippet metadata are typed.
- **D-09:** Chip removal remains immediate with no confirmation or undo.

### Submit Behavior
- **D-10:** Replacing synthetic DOM submit must preserve keyboard semantics exactly: Enter sends only when non-empty and not loading; Shift+Enter inserts newline; mention-menu keyboard behavior remains unchanged.
- **D-11:** `ChatInput` should expose an explicit typed value callback such as `onSubmit({ text })` or `onSubmit(text)`. `FormEvent` should not leave `ChatInput`.
- **D-12:** Phase 33 must stay with existing snippet/file/folder chips. Do not adopt `PromptInput` attachment files as a new runtime capability.
- **D-13:** Stop generation behavior is preserve-only in this phase. Abort/liveness UX changes belong to Phase 35.

### Onboarding Guardrail
- **D-14:** Onboarding behavior pins include the full current flow states: `IDLE -> QUALIFYING -> STREAMING -> PLAN_READY -> DONE`, including cancel and try-again behavior.
- **D-15:** Cached onboarding plan reuse is mandatory: `useOnboarding` must keep checking `/api/backend/repo/{repoId}/onboarding-plan` before opening EventSource generation.
- **D-16:** Phase 33 should add behavior pins/tests around onboarding only. Do not extract or move onboarding ownership in this phase.
- **D-17:** Required onboarding regression evidence: keep/extend `useOnboarding` hook tests and add/extend `ChatStream` render tests for first-run/reopen/completion behavior.

### the agent's Discretion
No user-delegated gray areas remain. Planner may choose exact file/module names and helper signatures within the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 33 goal, requirements, success criteria, and phase boundaries.
- `.planning/REQUIREMENTS.md` — `SHELL-03`, `PRMP-01`, `PRMP-02`, and `PRMP-03`; out-of-scope future requirements.
- `.planning/PROJECT.md` — v1.1 chat rebuild goals, thermo context, and milestone constraints.
- `.planning/STATE.md` — accumulated context: Phase 33 avoids GSAP/OpenUI polish and starts with behavior pinning plus pure prompt-context helpers.

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — relevant source/test locations and directory conventions.
- `.planning/codebase/CONVENTIONS.md` — route page should not grow; helpers/hooks preferred for UI logic.
- `.planning/codebase/TESTING.md` — Jest/Testing Library patterns and commands for frontend tests.
- `.planning/codebase/CONCERNS.md` — thermo/route fragility context; avoid broad unrelated route churn.

### Source References
- `web/src/app/repo/[id]/page.tsx` — current route-owned prompt assembly, snippet/file/folder fetching, submit, chip state, and ChatInput/ChatStream integration.
- `web/src/components/chat/ChatInput.tsx` — current input behavior, mention menu, synthetic submit dispatch, `PromptInput` usage, and broad textarea ref cast.
- `web/src/components/chat/types.ts` — current `SnippetChip`, `Message`, and source types.
- `web/src/components/chat/ChatStream.tsx` — onboarding entry/reopen behavior and user-message artifact rendering.
- `web/src/hooks/useOnboarding.ts` — cached plan lookup, EventSource generation, cancellation, error handling, and reset flow.
- `web/src/components/onboarding/OnboardingGuide.tsx` — current onboarding flow states and completion behavior.
- `web/src/hooks/useOnboarding.test.ts` — existing hook regression patterns for cached/SSE/error behavior.
- `web/src/components/chat/__tests__/ChatStream.test.tsx` — existing ChatStream Jest setup pattern to extend.
- `web/src/components/ai-elements/prompt-input.tsx` — dependency API that currently emits `(message, event)`; Phase 33 should hide that from app-level submit handling.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChatInput`: keep visual/input shell, mention menu, and stop button wiring; change its app-facing submit API to typed value callback.
- `SnippetChip`: reuse the app-level chip concept, but strengthen it into discriminated variants for snippet/file/folder.
- `useOnboarding`: already owns cached plan lookup and EventSource lifecycle; treat as behavior to pin, not ownership to move.
- `ChatStream`: owns first-run onboarding rendering and reopen summary card behavior; add regression tests without large refactor.

### Established Patterns
- Frontend tests use Jest + Testing Library with local mocks near source.
- Frontend imports prefer `@/` aliases and named exports for shared modules.
- Route page is already oversized; new prompt assembly code should move into `web/src/lib/`, `web/src/hooks/`, or a chat-local helper rather than adding route-local logic.
- Existing prompt format appends `Referenced snippets` and `Referenced files` sections to the backend prompt while keeping the visible user message unexpanded.

### Integration Points
- `RepoWorkspacePage.handleSubmit` currently builds `fullPrompt`; planner should extract that logic behind a pure builder and minimal async content-loading boundary.
- `ChatInput` currently receives `onSubmit(event)` and dispatches a synthetic `submit` event on Enter; replace with typed callback while preserving keyboard behavior.
- File/folder content loading currently fetches `/api/backend/repo/{repoId}/files/{path}` and folder mode caps to first 8 files with 8000 chars per file.
- Onboarding tests should exercise `useOnboarding` and `ChatStream` rather than moving onboarding state ownership.

</code_context>

<specifics>
## Specific Ideas

- Preferred prompt builder result shape: `{ displayMessage, backendPrompt, artifacts }`.
- Folder chip copy should explicitly show `up to 8 files, 8k chars each`.
- The sent backend prompt should keep explicit failure notes for failed file/folder loads.
- The implementation should not introduce `PromptInput` runtime attachment support in Phase 33.

</specifics>

<deferred>
## Deferred Ideas

- Fetching file contents for `@path` mentions is deferred; mentions remain lightweight labels in Phase 33.
- Transport abort/liveness state improvements are deferred to Phase 35.
- Onboarding ownership extraction is deferred to later shell/ownership phases if still needed.

### Reviewed Todos (not folded)
- `Investigate GitHub SameSite cookie warnings` — reviewed during cross-reference; left deferred because auth cookie warnings are outside Phase 33 prompt helper/onboarding behavior pinning.

</deferred>

---

*Phase: 33-Behavior Pinning & Prompt Helpers*
*Context gathered: 2026-05-29*
