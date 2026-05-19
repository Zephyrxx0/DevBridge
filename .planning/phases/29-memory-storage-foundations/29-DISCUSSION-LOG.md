# Phase 29 Discussion Log

- **Date:** 2026-05-19
- **Phase:** 29 - Memory Storage & Foundations

## Area: Database Schema
- **Options presented:**
  - Shared public schema (Creates Hindsight tables in the default schema. Simpler setup.)
  - Dedicated hindsight schema (Creates a dedicated schema. Better isolation from DevBridge app tables.)
- **Selected:** Dedicated hindsight schema

## Area: Context Injection
- **Options presented:**
  - SystemMessage append (Append recalled memory as a SystemMessage to the thread history)
  - Typed AgentState field (Add an explicit memory field to AgentState for precise prompting)
  - Hybrid injection (Both depending on the context type (e.g., world facts in State, experiences in Messages))
  - Consolidate to State (Just use Typed AgentState field for all memory to keep it structured)
- **Selected:** Consolidate to State

## Area: Retention Trigger
- **Options presented:**
  - Every user turn (Call retain() after every turn to capture immediate micro-interactions)
  - End of session/idle (Call retain() only when a chat session completes or idles)
  - Two-tiered retention (Retain experiences every turn, but consolidate into world facts at the end of the session)
  - All every turn (Just do everything every turn, even if it's heavier)
- **Selected:** Two-tiered retention
