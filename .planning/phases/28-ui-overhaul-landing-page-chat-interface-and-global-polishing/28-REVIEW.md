---
phase: 28-ui-overhaul-landing-page-chat-interface-and-global-polishing
reviewed: 2026-05-17T20:26:47Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - web/package.json
  - web/src/app/globals.css
  - web/src/app/layout.tsx
  - web/src/app/page.tsx
  - web/src/app/repo/[id]/page.tsx
  - web/src/components/ai-elements/artifact.tsx
  - web/src/components/ai-elements/attachments.tsx
  - web/src/components/ai-elements/code-block.tsx
  - web/src/components/ai-elements/conversation.tsx
  - web/src/components/ai-elements/inline-citation.tsx
  - web/src/components/ai-elements/jsx-preview.tsx
  - web/src/components/ai-elements/message.tsx
  - web/src/components/ai-elements/prompt-input.tsx
  - web/src/components/ai-elements/reasoning.tsx
  - web/src/components/ai-elements/shimmer.tsx
  - web/src/components/ai-elements/tool.tsx
  - web/src/components/auth-button.tsx
  - web/src/components/chat/ArtifactViewer.tsx
  - web/src/components/chat/ChatInput.tsx
  - web/src/components/chat/ChatLayout.tsx
  - web/src/components/chat/ChatStream.tsx
  - web/src/components/chat/FileExplorer.tsx
  - web/src/components/chat/HistorySidebar.tsx
  - web/src/components/chat/types.ts
  - web/src/components/landing/FeaturesSection.tsx
  - web/src/components/landing/HeroSection.tsx
  - web/src/components/layout/AppSidebar.tsx
  - web/src/components/layout/LayoutTransition.tsx
  - web/src/components/ui/badge.tsx
  - web/src/components/ui/button-group.tsx
  - web/src/components/ui/carousel.tsx
  - web/src/components/ui/collapsible.tsx
  - web/src/components/ui/command.tsx
  - web/src/components/ui/dropdown-menu.tsx
  - web/src/components/ui/hover-card.tsx
  - web/src/components/ui/input-group.tsx
  - web/src/components/ui/select.tsx
  - web/src/components/ui/separator.tsx
  - web/src/components/ui/sidebar.tsx
  - web/src/components/ui/spinner.tsx
  - web/src/components/ui/textarea.tsx
  - web/src/components/ui/tooltip.tsx
  - web/tests/chat.spec.ts
  - web/tests/landing.spec.ts
  - web/tests/theme.spec.ts
findings:
  critical: 2
  warning: 2
  info: 1
  total: 5
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-05-17T20:26:47Z  
**Depth:** standard  
**Files Reviewed:** 45  
**Status:** issues_found

## Summary

Phase UI overhaul reviewed adversarially across landing, chat workspace, sidebar primitives, and ai-elements integration files. Found correctness and robustness defects in stream handling and async state lifecycle. Found additional security/maintainability defects in JSX preview handling.

## Critical Issues

### CR-01 (BLOCKER): SSE stream parser drops/corrupts messages on chunk boundaries

**File:** `web/src/app/repo/[id]/page.tsx:476-537`  
**Issue:** Stream parsing splits each `reader.read()` payload by `"\n\n"` and parses each fragment immediately. SSE events frequently span multiple network chunks; partial JSON gets parsed, throws, then is silently discarded in catch. Result: lost assistant tokens, missing sources, inconsistent final message state.

**Fix:** Buffer incomplete chunks between reads and parse only complete SSE frames.

```ts
let sseBuffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  sseBuffer += decoder.decode(value, { stream: true });
  const frames = sseBuffer.split("\n\n");
  sseBuffer = frames.pop() ?? ""; // keep incomplete frame

  for (const frame of frames) {
    if (!frame.startsWith("data: ")) continue;
    const data = JSON.parse(frame.slice(6));
    // existing event handling
  }
}
```

### CR-02 (BLOCKER): Loading state can deadlock when no active session exists

**File:** `web/src/app/repo/[id]/page.tsx:441-449`  
**Issue:** `setIsLoading(true)` set before stream request. Inside `try`, code exits early on `if (!activeSessionId) return;` without resetting loading state. User can hit this race before session initialization completes; UI remains permanently loading and submit disabled.

**Fix:** Guard before toggling loading, or force reset in a `finally`.

```ts
if (!activeSessionId) return;
setIsLoading(true);
try {
  // stream request...
} finally {
  setIsLoading(false);
}
```

## Warnings

### WR-01 (WARNING): State updates during render in JSXPreview

**File:** `web/src/components/ai-elements/jsx-preview.tsx:150-153`  
**Issue:** Component calls `setPrevJsx` and `setError` directly in render path (`if (jsx !== prevJsx)`). This is React anti-pattern; can cause extra renders and unstable behavior under Strict Mode/concurrent rendering.

**Fix:** Move sync logic into `useEffect` keyed by `jsx`.

```ts
useEffect(() => {
  setPrevJsx(jsx);
  setError(null);
}, [jsx]);
```

### WR-02 (WARNING): JSX sanitizer incomplete; script URL/event bypass variants remain

**File:** `web/src/components/chat/ArtifactViewer.tsx:63-69`  
**Issue:** Regex sanitizer strips only narrow patterns (double-quoted handlers/`href="javascript:..."`). Misses single-quoted attrs, mixed casing forms, and other URL-bearing attrs. Preview path can still render unsafe JSX patterns.

**Fix:** Avoid regex sanitization for executable markup. Prefer strict allow-list parser or disable JSXPreview for untrusted model output unless transformed through safe AST filtering.

## Info

### IN-01 (WARNING): Nested interactive controls in chat history rows

**File:** `web/src/components/chat/HistorySidebar.tsx:68-83`  
**Issue:** `ContextMenuTrigger` rendered as interactive wrapper containing inner `<button>`. Nested controls degrade keyboard/accessibility behavior and can produce inconsistent click/context-menu handling.

**Fix:** Make trigger itself the row button (single interactive element), attach select handler on trigger.

---

_Reviewed: 2026-05-17T20:26:47Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
