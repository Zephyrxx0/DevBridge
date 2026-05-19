# Phase 32 Context: Streaming Escalation UX

**Domain:** Users are visually informed of model routing and escalation in real-time.

## Decisions

### SSE Format
- **Dedicated Status Event:** The backend will emit a dedicated `metadata` event via SSE containing `model_used` and `cascaded` fields as soon as the model choice is finalized. This avoids bloating every token event.

### UI Indicator
- **Visual Animation:** Escalation will be signaled by a visual change in the message bubble or typing indicator (e.g., a pulse effect or color shift) rather than just a static text label.

### Persistence
- **Session-only Display:** Escalation indicators will be displayed for the active turn only. Historical messages in the sidebar will not show specific model badges for simplicity.

## Codebase Context
- **Reusable assets:** 
    - `web/src/components/chat/ChatStream.tsx` (SSE event handling)
    - `api/routes/chats.py` (SSE event yielding)
- **Established patterns:** 
    - SSE event types (`token`, `error`) in `ChatStream.tsx`.
    - Framer Motion for animations (implied by `motion` import in conventions).
- **Integration points:** 
    - `api/main.py` or `api/routes/chats.py` `stream_graph_events` generator.
    - `ChatStream.tsx` to handle the new `metadata` event type.

## Canonical Refs
- None referenced.
