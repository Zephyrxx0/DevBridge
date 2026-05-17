# Phase 28: UI Overhaul: Landing Page, Chat Interface, and Global Polishing - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase revitalizes the application's frontend with a modern, cohesive design. It focuses on redesigning the landing page, overhauling the chat interface using Vercel AI Elements, and applying a consistent "Premium Polish" aesthetic globally.
</domain>

<decisions>
## Implementation Decisions

### Landing Page Aesthetic
- **D-01: Modern Premium Polish.** The landing page will feature dithered gradients, large typography, and sophisticated Framer Motion animations to create a high-end SaaS feel.

### Chat Interface Layout
- **D-02: Sidebar History + Center Chat.** Implement a collapsible sidebar for thread history on the left, with a focused chat stream in the center, following industry standards for AI tools.

### Vercel AI Elements Selection
- **D-03: Comprehensive AI Elements Integration.** Prioritize and integrate the following components from `elements.ai-sdk.dev`:
  - `Message` + `MessageResponse`: For rich message rendering.
  - `PromptInput`: For multi-line input.
  - `Attachments`: Use for adding text content to prompts instead of inline text.
  - `ToolCall` / `Progress`: For agent action feedback.
  - `Conversation`: Top-level state and scroll management.
  - `Chain of Thought`: To visualize reasoning steps.
  - `Inline Citation`: For referencing code and files during explanations.
  - `Artifact` & `JSX Preview`: For rich content and interactive previews.

### Global UI Polishing
- **D-04: Soft UI Transitions.** Use subtle fade-ins and slide-ups for all main layout shifts to maintain a professional and consistent feel.
- **D-05: System Sync Theme.** Default to following the user's system theme setting (dark/light mode sync).

### Claude's Discretion
- The specific implementation details of the collapsible sidebar.
- The exact choreography of the "Soft UI Transitions".
- Selection of additional shadcn/ui components needed to support the overhaul.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and Goals
- `.planning/ROADMAP.md` — Phase 28 definition.
- `.planning/REQUIREMENTS.md` — FR-07 (UI Overhaul).

### Component Libraries
- `https://elements.ai-sdk.dev/components` — Vercel AI Elements Documentation.
- `@.agents/skills/ai-elements/SKILL.md` — Local guidance for AI Elements integration.
- `https://ui.shadcn.com/` — shadcn/ui documentation for base components.

### Technical Context
- `web/src/app/page.tsx` — Current landing page to be redesigned.
- `web/src/app/repo/[id]/page.tsx` — Current chat/workspace to be overhauled.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shadcn/ui` components: Already integrated and used as the foundation.
- `framer-motion`: Used in existing components (e.g., dithering cards) and should be leveraged for the overhaul.

### Integration Points
- `web/src/app/layout.tsx`: Global theme and transition wrappers.
- `web/src/components/chat/`: Location for new AI Elements-based chat components.

</code_context>

<specifics>
## Specific Ideas

- "Modern Premium Polish" aesthetic with sophisticated gradients.
- "Sidebar History + Center Chat" layout for a focused conversation experience.
- Use `Attachments` for text-heavy context instead of expanding prompt strings.
- Reference code and files using `Inline Citation` when the agent explains logic.
</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.
</deferred>

---

*Phase: 28-ui-overhaul-landing-page-chat-interface-and-global-polishing*
*Context gathered: 2026-05-18*
