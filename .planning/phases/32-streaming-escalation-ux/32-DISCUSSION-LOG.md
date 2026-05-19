# Phase 32 Discussion Log

- **Date:** 2026-05-20
- **Phase:** 32 - Streaming Escalation UX

## Area: SSE Format
- **Options presented:**
  - Per-Token Metadata (Include 'model_used' and 'cascaded' in every token event. Highest observability but more overhead.)
  - Dedicated Status Event (Send a dedicated 'metadata' or 'status' event once the model is determined. Cleaner and more efficient.)
- **Selected:** Dedicated Status Event

## Area: UI Indicator
- **Options presented:**
  - Contextual Label (A small label near the typing indicator or message header.)
  - Visual Animation (A progress bar or pulse effect that changes color/style when escalation occurs.)
- **Selected:** Visual Animation

## Area: Persistence
- **Options presented:**
  - Permanent History Badge (Save the metadata in the chat history database and show it on previous messages.)
  - Session-only Display (Only show the escalation state for the current active turn. Simpler implementation.)
- **Selected:** Session-only Display
