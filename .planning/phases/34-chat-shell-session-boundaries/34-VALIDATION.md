# Phase 34: Chat Shell & Session Boundaries - Validation Strategy

## Dimensions

### 1. Functional Verification
- Backend title reset on clear is removed.
- Sidebar inline rename and delete confirmation flow working.
- `useChatSessions` restores and caches correct active session by repoId.

### 2. Edge Cases
- Clearing session while offline or backend error handles gracefully.
- Empty or unchanged inline rename returns immediately without API call.

### 8. Goal-Backward Must-Haves
- `useChatSessions.ts` handles session array and active id.
- `page.tsx` no longer has inline session methods.
