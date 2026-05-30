# Phase 34: Chat Shell & Session Boundaries - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 34-Chat Shell & Session Boundaries
**Areas discussed:** Session restore meaning, Clear-session surface, Sidebar separation, Rename/delete UX, Shell ownership shape

---

## Session Restore Meaning

| Question | Selected | Alternatives Considered |
|----------|----------|--------------------------|
| Meaning of restore | Last active per repo | Recover cleared chat; Recover deleted chat; You decide |
| Missing saved session fallback | Newest existing | Always create new; Show empty state; You decide |
| Active session deleted fallback | Nearest by recency | Previous visible row; Always new chat; You decide |
| Restore scope | Strictly repo-scoped | Global last chat; Account-level sync; You decide |

**Notes:** Restore is not undo. It preserves current repo context and last-active-session behavior.

---

## Clear-Session Surface

| Question | Selected | Alternatives Considered |
|----------|----------|--------------------------|
| Clear entry point | Both explicit and `/clear` | Explicit session action; Keep `/clear` only; You decide |
| Explicit action location | Utilities tab | Session context menu; Chat header button; You decide |
| Utilities clear target | Active chat only | Per-session picker; Session menu also; You decide |
| Title after clear | Keep title | Reset to New chat; Ask during clear; You decide |
| Confirmation | Confirm clear | No confirmation; Undo snackbar; You decide |

**Notes:** Current backend title reset on clear conflicts with selected behavior.

---

## Sidebar Separation

| Question | Selected | Alternatives Considered |
|----------|----------|--------------------------|
| Separation model | Keep Chat/Utilities tabs | Permanent sections; Utilities collapsed menu; You decide |
| Chat tab contents | Sessions only | Sessions plus active clear; Sessions plus repo name; You decide |
| Utilities tab contents | Repo tools + active clear | Repo tools only; Grouped actions; You decide |
| Collapsed access | Icon tabs remain | Auto-show Chat only; Hover/tooltip menu; You decide |
| Repo avatar/header | Keep as-is | Shrink header; Remove image; You decide |

**Notes:** This is a boundary/action-separation phase, not a visual redesign phase.

---

## Rename/Delete UX

| Question | Selected | Alternatives Considered |
|----------|----------|--------------------------|
| Confirmation implementation | App-owned dialogs | Native prompt/confirm; Inline rename only; You decide |
| Rename interaction | Inline row edit | Dialog input; Side panel form; You decide |
| Empty/unchanged rename | Cancel no-op | Reject empty; Reset to New chat; You decide |
| Delete confirmation | App confirm dialog | Two-click menu confirm; No confirmation; You decide |
| Last session deleted | Create new session | Show no-chat empty state; Block delete last; You decide |

**Notes:** Native browser prompts should leave session flows.

---

## Shell Ownership Shape

| Question | Selected | Alternatives Considered |
|----------|----------|--------------------------|
| Target shell shape | ChatShell + hooks | Hooks only; Full container split; You decide |
| Non-session domains | Thin named boundaries | Extract all now; Session only; You decide |
| Final route shape | Repo/page shell only | Still main composer; Server wrapper; You decide |
| Session owner | useChatSessions hook | Session provider; Sidebar component; You decide |
| Route-shrink evidence | No inline session ops | Line-count target; Named boundary tests; You decide |

**Notes:** Phase 34 should not steal Phase 35 stream liveness or Phase 36 file/source workspace work.

## the agent's Discretion

- Exact file names and component boundaries are planner discretion within `ChatShell + hooks` and `useChatSessions` constraints.
- Planner may choose the minimum thin boundaries needed for stream/prompt/file composition without deep behavior refactors.

## Deferred Ideas

- Recover cleared chats.
- Undelete deleted chats.
- Undo snackbar or soft-delete behavior for clear/delete.
- Deep stream liveness ownership extraction for Phase 35.
- Deep file/source workspace ownership extraction for Phase 36.
