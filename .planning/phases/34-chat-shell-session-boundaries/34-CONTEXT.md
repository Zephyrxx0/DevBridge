# Phase 34: Chat Shell & Session Boundaries - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 34 delivers a repo-scoped chat shell where session ownership and sidebar concerns move out of `web/src/app/repo/[id]/page.tsx` into named boundaries. Users can create, rename, delete, switch, clear, and restore sessions for a repo without losing repo context. The sidebar keeps session-list actions separate from repo utilities. This phase should create thin named boundaries for stream, prompt-context, branch/index, and file workspace composition, but deep stream liveness work remains Phase 35 and deep file/source workspace ownership remains Phase 36.

</domain>

<decisions>
## Implementation Decisions

### Session Restore
- **D-01:** Restore means restoring the last active session for the current repo, not recovering cleared or deleted chats.
- **D-02:** If the saved last-active session no longer exists, select the newest existing session.
- **D-03:** If deleting the active session, activate the nearest session by recency; create a new session only when none remain.
- **D-04:** Session restore is strictly repo-scoped. Switching repos must never pull in another repo's chat session.

### Clear Session
- **D-05:** Keep `/clear` as a power-user path and add an explicit visible clear action.
- **D-06:** The explicit clear action belongs in the Utilities tab and clears the active chat only.
- **D-07:** Clearing a session deletes messages but keeps the session title. Downstream agents should change current backend behavior that resets the title to `New chat`.
- **D-08:** Clearing requires confirmation. Do not implement undo/soft-restore in this phase.

### Sidebar Separation
- **D-09:** Preserve the current Chat/Utilities tab model rather than replacing it with permanent sections or overflow-only utilities.
- **D-10:** The Chat tab contains sessions only: new chat plus session list/menu. Repo utilities stay out of this tab.
- **D-11:** The Utilities tab contains repo tools plus active-chat clear: Map, Search, Annotations, Notes, Index files, Theme, Back home, Remove repository, and Clear active chat.
- **D-12:** In collapsed mode, Chat and Utilities icon tabs remain available.
- **D-13:** Keep the large repo avatar/header as-is in Phase 34. Avoid visual redesign unless required for ownership separation.

### Rename And Delete UX
- **D-14:** Replace native `window.prompt` and `window.confirm` session flows with app-owned UI.
- **D-15:** Rename should be inline on the session row. Enter saves; Escape/cancel exits edit mode.
- **D-16:** Empty or unchanged rename is a no-op and should not call the API.
- **D-17:** Delete uses an app-owned confirmation dialog that names the session and makes the destructive action clear.
- **D-18:** Deleting the last remaining session creates a new session so the chat shell remains usable.

### Shell Ownership
- **D-19:** Target shape is `ChatShell + hooks`: the repo route passes repo identity/context into a composed shell, while session/sidebar logic lives in named hooks/modules.
- **D-20:** Add thin named boundaries for non-session domains as needed, but do not deeply refactor stream transport, prompt-context internals, or file/source workspace behavior beyond composition boundaries in this phase.
- **D-21:** After Phase 34, `web/src/app/repo/[id]/page.tsx` should be a repo/page shell only: params/repo redirect plus `ChatShell` render, with no inline session operation implementations.
- **D-22:** Session persistence and active-session selection live in a `useChatSessions` hook that owns repo-scoped load/create/rename/delete/clear/restore and localStorage key handling.
- **D-23:** Route-shrink evidence should be behavioral/structural: no inline session operations in `page.tsx`. Do not set a brittle line-count target.

### the agent's Discretion
Planner may choose exact file names and component boundaries within the locked shape above. Planner should prefer the smallest extraction that removes session/sidebar ownership from the route without stealing Phase 35/36 work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 34 goal, requirements, success criteria, dependency on Phase 33, and boundaries with Phases 35/36.
- `.planning/REQUIREMENTS.md` — `SHELL-01`, `SHELL-02`, `SHELL-04`; out-of-scope future requirements and Phase 35/36 split.
- `.planning/PROJECT.md` — v1.1 chat rebuild goal and thermo context: route-level chat orchestration owns too many domains.
- `.planning/STATE.md` — accumulated milestone sequencing: boundary cleanup first, liveness second, canonical UI third.
- `.planning/phases/33-behavior-pinning-prompt-helpers/33-CONTEXT.md` — prior locked prompt/onboarding behavior; do not re-litigate Phase 33 prompt helper decisions.

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — route page should not grow; helpers/hooks preferred for UI logic.
- `.planning/codebase/STRUCTURE.md` — relevant source/test locations and frontend shared hook/component conventions.
- `.planning/codebase/CONCERNS.md` — route fragility and hardcoded backend call concerns; avoid broad unrelated route churn.

### Source References
- `web/src/app/repo/[id]/page.tsx` — current route-owned sessions, active session localStorage restore, `/clear`, sidebar wiring, repo utility handlers, branch/file state, and chat composition.
- `web/src/components/chat/HistorySidebar.tsx` — current Chat/Utilities tab sidebar, session list/context menu, repo utility actions, theme toggle, index action, and remove repo action.
- `web/src/components/chat/ChatLayout.tsx` — current composed layout shell and sidebar/right-panel slots.
- `web/src/components/layout/AppSidebar.tsx` — older/parallel sidebar/session list pattern that should not be accidentally revived or duplicated.
- `api/routes/chats.py` — current chat session/message endpoints, clear endpoint title reset behavior, rename/delete routes, and repo-scoped session queries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HistorySidebar`: reuse the Chat/Utilities tab concept, but keep it presentation-focused and move session operation ownership out.
- `ChatLayout`: keep slot-based layout composition; likely wrap with a `ChatShell` that supplies session/sidebar/chat/right-panel pieces.
- `api/routes/chats.py`: existing endpoints already cover list/create/rename/delete/clear messages; clear title reset needs adjustment for D-07.
- `ChatInput`, `ChatStream`, and Phase 33 prompt helpers: should be composed through the shell without new prompt or stream semantics in Phase 34.

### Established Patterns
- Frontend modules use `@/` aliases and feature components under `web/src/components/chat/`.
- Frontend route state is currently concentrated in `web/src/app/repo/[id]/page.tsx`; new session ownership should move into `web/src/hooks/`, `web/src/lib/`, or chat-local hooks/components.
- Session active id is currently stored as `repo:${repoId}:activeSessionId`; keep repo-scoped restore behavior while centralizing this key in `useChatSessions`.
- Sidebar already separates Chat and Utilities via internal tab state; preserve this product shape while clarifying contents.

### Integration Points
- `RepoWorkspacePage` should become a thin page shell that renders `ChatShell` after repo param/loading/error handling.
- `useChatSessions` should replace route-local `createSession`, `renameChat`, `deleteChat`, `loadSessions`, active id restore, active id persistence, and active-chat clear orchestration.
- `HistorySidebar` needs props/events for active clear placement in Utilities, inline rename state, app-owned delete confirmation, and session list selection.
- Backend clear endpoint should delete messages and update timestamp without resetting title.

</code_context>

<specifics>
## Specific Ideas

- Explicit clear action lives in Utilities and targets only the currently active chat; `/clear` remains supported.
- Inline rename should no-op on empty or unchanged text and avoid an API call.
- The Chat tab should not include repo utilities or active clear.
- Route-shrink proof is no inline session operations in `web/src/app/repo/[id]/page.tsx`, not a line-count budget.

</specifics>

<deferred>
## Deferred Ideas

- Recovering cleared chats and undeleting deleted chats are not part of Phase 34.
- Undo snackbar/soft-delete behavior for clear/delete is deferred.
- Deep stream transport/liveness extraction remains Phase 35.
- Deep branch, index, file, snippet, and source workspace ownership remains Phase 36.

### Reviewed Todos (not folded)
- `Investigate GitHub SameSite cookie warnings` — reviewed during cross-reference; left deferred because auth cookie warnings are outside Phase 34 chat shell/session/sidebar boundaries.

</deferred>

---

*Phase: 34-Chat Shell & Session Boundaries*
*Context gathered: 2026-05-29*
