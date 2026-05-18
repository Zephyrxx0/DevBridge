# Phase 28: UI Overhaul: Landing Page, Chat Interface, and Global Polishing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 28-ui-overhaul-landing-page-chat-interface-and-global-polishing
**Areas discussed:** Landing Page Aesthetic, Chat Interface Layout, Vercel AI Elements Selection, Global UI Polishing

---

## Landing Page Aesthetic

| Option | Description | Selected |
|--------|-------------|----------|
| Hero-Centric Search | Large hero search bar, minimalist. | |
| Information Dashboard | Show recent repositories and metrics immediately. | |
| Modern Premium Polish | Dithered gradients, large typography, Framer Motion. | ✓ |

**User's choice:** Modern Premium Polish
**Notes:** User wants a high-end SaaS feel with sophisticated animations.

---

## Chat Interface Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar History + Center Chat | Collapsible history on left, chat in center. | ✓ |
| Immersive Full-Width | Full-screen immersive conversation. | |
| Split-Screen Context | Chat on one side, code browser on the other. | |

**User's choice:** Sidebar History + Center Chat

---

## Vercel AI Elements Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Message + MessageResponse | Rich message rendering. | ✓ |
| PromptInput | Multi-line input. | ✓ |
| ToolCall / Progress | Visual feedback for tool usage. | ✓ |
| Conversation Container | State and scroll management. | ✓ |

**User's choice:** Message + MessageResponse, PromptInput, ToolCall / Progress, Conversation Container, and more.
**Notes:** User specified a wide range of components from elements.ai-sdk.dev including Attachments, Chain-of-thought, Inline-citation, Artifact, and JSX-preview. Explicitly requested using attachments for text content in prompts.

---

## Global UI Polishing

| Option | Description | Selected |
|--------|-------------|----------|
| Soft UI Transitions | Subtle fade-ins and slide-ups. | ✓ |
| Springy & Interactive | High-energy spring-based animations. | |
| Instant & Fast | Zero animation for speed. | |

**User's choice:** Soft UI Transitions

---

## Theme Default

| Option | Description | Selected |
|--------|-------------|----------|
| System Sync (Default) | Follow system setting automatically. | ✓ |
| Force Dark Mode | Default to dark mode. | |
| Force Light Mode | Default to light mode. | |

**User's choice:** System Sync (Default)

---

## Claude's Discretion

- Implementation of the collapsible sidebar.
- Choreography of soft transitions.
- Selection of supporting shadcn/ui blocks.

## Deferred Ideas

- None.
