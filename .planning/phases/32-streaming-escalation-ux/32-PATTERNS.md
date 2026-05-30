# Phase 32: Streaming Escalation UX - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/main.py` | controller | streaming | `api/main.py` | exact |
| `web/src/app/repo/[id]/page.tsx` | controller | streaming | `web/src/app/repo/[id]/page.tsx` | exact |
| `web/src/components/chat/types.ts` | model | N/A | `web/src/components/chat/types.ts` | exact |
| `web/src/components/chat/ChatStream.tsx` | component | streaming | `web/src/components/chat/ChatStream.tsx` | exact |
| `web/src/components/chat/EscalationIndicator.tsx` | component | UI | `web/src/components/ui/status-dot.tsx` | role-match |

## Pattern Assignments

### `api/main.py` (controller, streaming)

**Analog:** `api/main.py`

**Metadata event yielding pattern** (lines 532-540):
```python
                fallback_sent = False
                yield f"data: {json.dumps({'type': 'metadata', 'fallback': False})}\n\n"

                chunk_count = 0
                accumulated_response = ""
                async for event in stream_graph_events(payload.message, payload.thread_id, user_id):
                    if not fallback_sent and _contains_fallback(event):
                        fallback_sent = True
                        yield f"data: {json.dumps({'type': 'metadata', 'fallback': True})}\n\n"
```
*Note: Extend the metadata event to include `model_used` and `cascaded`.*

---

### `web/src/app/repo/[id]/page.tsx` (controller, streaming)

**Analog:** `web/src/app/repo/[id]/page.tsx`

**SSE event loop pattern** (lines 515-535):
```typescript
            const data = JSON.parse(eventChunk.slice(6)) as {
              type: string;
              content?: string;
              fallback?: boolean;
              sources?: SourceReference[];
              message?: string;
            };

            if (data.type === "chunk" && data.content) {
              // ... chunk handling
            } else if (data.type === "metadata" && data.fallback === true) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    fallback: true,
                  };
                }
                return next;
              });
```
*Note: Handle new fields in the `metadata` event and update the last message in state.*

---

### `web/src/components/chat/ChatStream.tsx` (component, streaming)

**Analog:** `web/src/components/chat/ChatStream.tsx`

**Conditional badge rendering pattern** (lines 145-149):
```tsx
                      {!isUser && message.fallback ? (
                        <div className="mb-1 flex items-center gap-2 text-xs text-[var(--foreground-subtle)]">
                          <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-600">Fast Mode</Badge>
                        </div>
                      ) : null}
```

**Loading indicator pattern** (lines 280-286):
```tsx
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-[var(--space-lg)] py-[var(--space-md)]">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:300ms]" />
                    </div>
                  </div>
```

---

### `web/src/components/chat/EscalationIndicator.tsx` (component, UI)

**Analog:** `web/src/components/ui/status-dot.tsx`

**Animated dot pattern** (lines 10-21):
```tsx
const statusConfig = {
  online: {
    color: "bg-[var(--accent-emerald)]",
    ring: "shadow-[0_0_0_3px_var(--accent-emerald-muted)]",
    animation: "animate-pulse-dot",
    label: "Online",
  },
  indexing: {
    color: "bg-[var(--accent-amber)]",
    ring: "shadow-[0_0_0_3px_var(--accent-amber-muted)]",
    animation: "animate-pulse-dot",
    label: "Indexing",
  },
```

---

## Shared Patterns

### SSE Metadata Handling
**Source:** `web/src/app/repo/[id]/page.tsx`
**Apply to:** All streaming message updates
```typescript
// Pattern for updating specific metadata fields in the last message
setMessages((prev) => {
  const next = [...prev];
  const last = next[next.length - 1];
  if (last?.role === "assistant") {
    next[next.length - 1] = {
      ...last,
      ...newData, // fallback, model_used, cascaded
    };
  }
  return next;
});
```

### Pulse/Glow Animations
**Source:** `web/src/app/globals.css`
**Apply to:** Escalation indicator
```css
.animate-pulse-dot {
  animation: pulse-dot 2s infinite;
}

.animate-glow-pulse {
  animation: glow-pulse 3s ease-in-out infinite;
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| N/A | | | All files have suitable analogs in the codebase. |

## Metadata

**Analog search scope:** `api/`, `web/src/components/`, `web/src/app/`
**Files scanned:** ~15
**Pattern extraction date:** 2026-05-20
