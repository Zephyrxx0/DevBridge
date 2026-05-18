# Phase 28: UI Overhaul: Landing Page, Chat Interface, and Global Polishing - Research

**Researched:** 2026-05-18
**Domain:** UI/UX, AI Interface, Frontend Polish
**Confidence:** HIGH

## Summary

This research focuses on the technical requirements for overhauling the DevBridge UI, specifically the landing page and the chat interface. The phase leverages **Vercel AI Elements** (a shadcn-style component library for AI interfaces) and **Framer Motion** for sophisticated animations. The aesthetic is defined as "Modern Premium Polish," characterized by dithered gradients (using `@paper-design/shaders-react`), large typography (Geist Sans), and soft transitions.

**Primary recommendation:** Integrate `ai-elements` via its CLI, adopt the "Sidebar History + Center Chat" layout using the `Conversation` primitive, and migrate the landing page to a series of high-impact Framer Motion sections using existing dithering components.

<user_constraints>
## User Constraints (from 28-CONTEXT.md)

### Locked Decisions
- **D-01: Modern Premium Polish.** The landing page will feature dithered gradients, large typography, and sophisticated Framer Motion animations.
- **D-02: Sidebar History + Center Chat.** Collapsible sidebar for thread history on the left, focused chat stream in the center.
- **D-03: Comprehensive AI Elements Integration.** Use components from `elements.ai-sdk.dev`: `Message`, `PromptInput`, `Attachments`, `ToolCall`/`Progress`, `Conversation`, `Chain of Thought`, `Inline Citation`, `Artifact`, and `JSX Preview`.
- **D-04: Soft UI Transitions.** Subtle fade-ins and slide-ups for layout shifts.
- **D-05: System Sync Theme.** Default to following the user's system theme (dark/light mode sync).

### the agent's Discretion
- Implementation details of the collapsible sidebar.
- Exact choreography of "Soft UI Transitions".
- Selection of additional shadcn/ui components.

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Redesign Landing Page | Leverages `@paper-design/shaders-react` and `motion` for the requested "Premium Polish" [VERIFIED: web/src/app/page.tsx]. |
| UI-02 | AI Elements Chat Interface | Identified `ai-elements` 1.9.0 as the standard for Vercel AI SDK integration [VERIFIED: npm registry]. |
| UI-03 | Sidebar History Layout | Standard layout pattern for AI tools; compatible with shadcn `Sidebar` component [CITED: 28-UI-SPEC.md]. |
| UI-04 | Soft UI Transitions | Choreography via Framer Motion's `AnimatePresence` and CSS keyframes in `globals.css` [VERIFIED: web/src/app/globals.css]. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Landing Page | Browser / Client | — | Purely visual/interactive presentation using Framer Motion. |
| Chat History Sidebar | Browser / Client | API / Backend | Local state management with backend persistence for threads. |
| Chat Threading (SSE) | API / Backend | Browser / Client | Streaming logic on server, reactive rendering via `useChat`. |
| AI Message Rendering | Browser / Client | — | Handled by `ai-elements` (Message, Artifacts, JSXPreview). |
| Global Theme Sync | Browser / Client | — | `next-themes` management of system preference. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 6.0.184 | Vercel AI SDK | industry-standard for streaming and tool calls [VERIFIED: npm]. |
| `ai-elements` | 1.9.0 | AI UI Components | Vercel's "blessed" AI UI components for React [VERIFIED: npm]. |
| `motion` | 12.38.0 | Animations | Standard for high-end React animations (formerly Framer Motion) [VERIFIED: web/package.json]. |
| `@paper-design/shaders-react` | 0.0.76 | Dithering Shaders | Used for the "Premium Polish" dithered gradients [VERIFIED: web/package.json]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `next-themes` | 0.4.6 | Theme Management | Syncing system light/dark mode preference. |
| `lucide-react` | 1.11.0 | Icon Library | UI iconography for sidebar and actions. |
| `shiki` | 1.15.3 | Code Highlighting | Syntax highlighting in `Artifact` components. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ai-elements` | Hand-rolled CSS | Higher development cost, missing edge cases (auto-scroll, streaming parser). |
| `motion` | CSS Keyframes | Harder to choreograph complex state-based transitions. |

**Installation:**
```bash
npm install ai @ai-sdk/react
npx ai-elements@latest add message prompt-input attachments tool-call progress conversation reasoning inline-citation artifact jsx-preview
```

## Architecture Patterns

### System Architecture Diagram
(Conceptual Data Flow)
User Input -> [PromptInput] -> [useChat Hook] -> [API Stream] -> [AI SDK] -> [Agent Response] -> [Message Stream] -> [Conversation/Message Components] -> [Artifacts/JSXPreview]

### Recommended Project Structure
```
web/src/
├── app/
│   ├── page.tsx               # Redesigned Landing Page
│   └── repo/[id]/
│       ├── page.tsx           # Overhauled Chat Workspace
│       └── layout.tsx         # Sidebar + Chat Container Layout
├── components/
│   ├── ai-elements/           # Injected AI Elements code
│   ├── chat/                  # Domain-specific chat components (History, Artifacts)
│   ├── ui/                    # Base shadcn components
│   └── landing/               # Landing page sections
```

### Pattern 1: Sidebar History + Center Chat
**What:** Use the shadcn/ui `Sidebar` component to host `ChatHistory` (thread list) and `ThreadSettings`.
**When to use:** Default layout for AI-focused applications to minimize distraction while maintaining context.

### Pattern 2: Artifact & JSX Streaming
**What:** Use `Artifact` for large code snippets and `JSXPreview` for live-rendering React code.
**When to use:** When the agent generates code or UI that needs isolated or interactive visualization.
**Example:**
```typescript
// Source: https://elements.ai-sdk.dev/docs/components/jsx-preview
<JSXPreview 
  code={streamingCode} 
  components={{ Button, Card }} 
/>
```

### Anti-Patterns to Avoid
- **Hand-rolling auto-scroll:** Use `Conversation` component's built-in scroll management.
- **Blocking the UI during stream:** Ensure all transitions are non-blocking and use `framer-motion` for fluid feedback.
- **Ignoring system theme:** Ensure `ThemeProvider` has `enableSystem={true}`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat Scrolling | Custom scroll hooks | `Conversation` | Handles bottom-locking, user interruption, and resize logic. |
| Streaming MD | `react-markdown` | `MessageResponse` | Specifically optimized for unclosed tags during streaming. |
| Tool Displays | Custom widget wrappers | `ToolCall` | Consistent state-handling for pending/success/error. |
| Reasoning Visibility | Collapsible details | `Reasoning` | Standardized "Thinking" UI for models like o1/DeepSeek. |

## Common Pitfalls

### Pitfall 1: State Desync with AI Elements
**What goes wrong:** Local message state gets out of sync with the `useChat` hook when attempting to manually append messages.
**Why it happens:** AI Elements components are designed to react directly to AI SDK state.
**How to avoid:** Pipe `useChat` directly into components; use `onFinish` or `onResponse` callbacks for side effects.

### Pitfall 2: Transition Jitter
**What goes wrong:** "Soft UI Transitions" causing layout shifts or "flickering" when switching threads.
**Why it happens:** Framer Motion animating height without `AnimatePresence` or `layoutId`.
**How to avoid:** Wrap thread transitions in `AnimatePresence` with `mode="wait"`.

## Code Examples

### AI Elements Usage
```tsx
// Source: SKILL.md
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Conversation } from "@/components/ai-elements/conversation";

export function ChatStream({ messages }) {
  return (
    <Conversation>
      {messages.map(m => (
        <Message key={m.id} from={m.role}>
          <MessageContent>
            <MessageResponse>{m.content}</MessageResponse>
          </MessageContent>
        </Message>
      ))}
    </Conversation>
  );
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ai-elements` 1.9.0 is compatible with Tailwind 4 | Standard Stack | Compilation errors (unlikely as it's shadcn-style). |
| A2 | `JSX Preview` can securely render shadcn components | Pattern 2 | Security risk if not properly sandboxed or sanitized. |
| A3 | `Chain of Thought` component is named `Reasoning` | Phase Requirements | CLI command naming might differ slightly. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `npx` | Component Installation | ✓ | — | — |
| `Node.js` | Compilation | ✓ | 18+ | — |
| `Tailwind 4` | Styling | ✓ | 4.x | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright + Jest |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Landing page has dithered bg | smoke | `npx playwright test web/tests/landing.spec.ts` | ❌ Wave 0 |
| UI-02 | Chat interface streams msg | e2e | `npx playwright test web/tests/chat.spec.ts` | ❌ Wave 0 |
| UI-05 | Theme follows system | smoke | `npx playwright test web/tests/theme.spec.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `web/tests/landing.spec.ts` — Landing page visual smoke tests.
- [ ] `web/tests/chat.spec.ts` — E2E for new AI Elements flow.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Ensure chat pages are protected by Supabase Auth [VERIFIED: web/src/app/layout.tsx]. |
| V5 Input Validation | yes | `PromptInput` uses internal length limits; backend sanitizes markdown [ASSUMED]. |
| V3 Session Management | yes | Chat thread visibility restricted to owner [VERIFIED: api/routes/chats.py]. |

### Known Threat Patterns for AI UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via JSX Preview | Tampering | Sandbox JSX rendering or sanitize components passed to preview. |
| Prompt Injection | Spoofing | Clear distinction between system/user/assistant roles in UI. |

## Sources

### Primary (HIGH confidence)
- `ai-elements` - Official npm package and registry [npm view].
- `elements.ai-sdk.dev/components` - Component list and behavior.
- `web/src/app/globals.css` - Existing Tailwind 4 and animation tokens.

### Secondary (MEDIUM confidence)
- `ai-sdk agents` docs - Reasoning and Tool rendering patterns.

### Tertiary (LOW confidence)
- Search results for "base-nova" preset (assumed project-internal).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Registry verified.
- Architecture: HIGH - Context and Spec provided clear direction.
- Pitfalls: MEDIUM - Based on common AI SDK integration issues.

**Research date:** 2026-05-18
**Valid until:** 2026-06-18
