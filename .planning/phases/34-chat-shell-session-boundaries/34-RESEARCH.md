# Phase 34: Chat Shell & Session Boundaries - Research

## Overview
This phase isolates session management out of `web/src/app/repo/[id]/page.tsx` into composed hooks (like `useChatSessions`) and simplifies the layout to be a `ChatShell`.

## Implementation Path

### 1. Backend Updates (`api/routes/chats.py`)
- Update `clear_chat_messages` to remove `title = 'New chat'` from the `UPDATE chat_sessions` query. Just update `updated_at = NOW()`.

### 2. Frontend State Hook (`web/src/hooks/useChatSessions.ts`)
- Extract `createSession`, `renameChat`, `deleteChat`, `loadSessions`, and active id restore/persistence from `page.tsx`.
- `useChatSessions` takes `repoId` and `apiUrl`.
- Manages `sessions: ChatSession[]`, `activeSessionId: string | null`, `isSessionsLoading: boolean`.
- Restore logic: reads `localStorage.getItem("repo:${repoId}:activeSessionId")`.
  - If valid, sets it.
  - If not found or invalid, sets newest session.
  - If no sessions exist, calls `createSession`.
- Expose a `clearSession(sessionId)` method that calls `DELETE /api/chats/${sessionId}/messages`.

### 3. Sidebar UI Updates (`web/src/components/chat/HistorySidebar.tsx`)
- Keep Chat/Utilities tabs.
- Chat tab: `sessions` list, with inline rename (Enter saves, Esc cancels) and app-owned delete confirmation (dialog instead of `window.confirm`).
- Utilities tab: Add "Clear active chat" action (needs confirmation dialog).

### 4. Layout & Shell Refactoring
- The route `page.tsx` should no longer declare inline `createSession`, `renameChat`, etc. It should just use `const { sessions, activeSessionId, ... } = useChatSessions(repoId)`.

## Validation Architecture
- **D-01, D-02, D-03, D-04:** Check `useChatSessions` restore logic tests.
- **D-07:** Verify backend endpoint does not reset title.
- **D-15, D-17:** Verify inline rename and dialog delete components in `HistorySidebar`.
