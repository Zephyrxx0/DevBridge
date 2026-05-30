---
phase: 34-chat-shell-session-boundaries
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - api/routes/chats.py
  - web/src/hooks/useChatSessions.ts
  - web/src/components/chat/HistorySidebar.tsx
  - web/src/components/chat/ChatShell.tsx
  - web/src/app/repo/[id]/page.tsx
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

Session-boundary implementation has multiple access-control gaps in chat API and one frontend compile-time break. Main risk: cross-session/cross-user data access by direct UUID usage.

## Critical Issues

### CR-01: Missing ownership/authorization checks on chat session/message routes

**File:** `api/routes/chats.py:122-141, 144-193, 195-221`  
**Issue:** Endpoints accept `session_id` directly and operate without verifying session belongs to caller (or even repo scope). Any actor with guessed/leaked UUID can read/append/clear messages (IDOR).

**Fix:** Scope all operations by authenticated `user_id` and joined `chat_sessions` ownership.

```python
# Example pattern for list_chat_messages
query = text("""
SELECT cm.id, cm.session_id, cm.role, cm.content, cm.sources, cm.created_at
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cm.session_id = CAST(:session_id AS uuid)
  AND cs.created_by = CAST(:user_id AS uuid)
ORDER BY cm.created_at ASC
""")
```

### CR-02: List chats endpoint leaks sessions without user boundary

**File:** `api/routes/chats.py:53-83`  
**Issue:** `GET /repo/{repo_id}/chats` filters only by repo, not by owner/tenant. Users in shared environment can enumerate other users’ sessions and latest message text.

**Fix:** Add `created_by = :user_id` (or org/tenant policy) and require authenticated `request.state.user_id`.

### CR-03: Frontend compile/runtime break from undefined variable in hook deps

**File:** `web/src/components/chat/ChatShell.tsx:776`  
**Issue:** `removeRepoFromWorkspace` dependency array references `router`, but `router` is never declared/imported in this component. Breaks build (`no-undef`/TS error).

**Fix:** Remove `router` from deps or define it.

```tsx
// if unused:
}, [apiUrl, repoId]);
```

## Warnings

### WR-01: Mutable default value in Pydantic model

**File:** `api/routes/chats.py:50`  
**Issue:** `sources: list[dict] = []` uses mutable default. Can cause shared-state bugs across model instances.

**Fix:**

```python
from pydantic import Field
sources: list[dict] = Field(default_factory=list)
```

### WR-02: Error detail leakage to clients

**File:** `api/routes/chats.py:82,119,141,192,221,262,284,321`  
**Issue:** Raw exception text returned in HTTP detail strings. Can leak internal DB/runtime details.

**Fix:** Return generic client message; log server-side exception with structured logger.

### WR-03: `isLoading` can remain stuck on early return path

**File:** `web/src/components/chat/ChatShell.tsx:409-417`  
**Issue:** `setIsLoading(true)` occurs before `if (!activeSessionId) return;` inside `try`. If triggered, spinner may stay true.

**Fix:** Move session guard before setting loading, or explicitly reset on early return.

### WR-04: Stale closure state in `deleteSession`

**File:** `web/src/hooks/useChatSessions.ts:63-79`  
**Issue:** Uses captured `sessions` snapshot after async call. Concurrent updates can be dropped.

**Fix:** Use functional state update as source of truth.

### WR-05: Failed session load leaves stale UI state

**File:** `web/src/hooks/useChatSessions.ts:114-116`  
**Issue:** On non-OK response, function returns without resetting sessions/active session or surfacing error; stale data can persist.

**Fix:** Clear state or expose explicit error state on fetch failure.

## Info

### IN-01: Unused imports increase noise

**File:** `web/src/components/chat/ChatShell.tsx:6-18`  
**Issue:** Several imports appear unused (`ArrowUp`, `ChevronRight`, `GitBranch`, `Plus`, `Sun`, `Moon`, `Avatar`, `Badge`, `Input`, context-menu imports).

**Fix:** Remove unused imports or wire features using them.

### IN-02: Nested interactive controls in session row

**File:** `web/src/components/chat/HistorySidebar.tsx:197-236`  
**Issue:** `ContextMenuTrigger` wraps a `<button>`; nested interactive elements can create accessibility/event inconsistencies.

**Fix:** Use single interactive root (button/div role) and attach context menu trigger directly.

---

_Reviewed: 2026-05-30T00:00:00Z_  
_Reviewer: gsd-code-reviewer_  
_Depth: standard_
