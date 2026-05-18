# UI-SPEC: Phase 23 - Onboarding UX Improvements

**Status**: draft  
**Version**: 1.2  
**Last Updated**: 2026-05-10  
**Phase**: 23

## 1. Vision & Goals
Provide a high-impact "Start Onboarding" experience for developers landing on a repository. Use AI to analyze the codebase and generate a structured onboarding guide, tailored by initial user input (Choice Poll), and visualized with high-fidelity components (Diffs, Trees, Guided Walkthrough).

## 2. Layout & Integration

### 2.1 Qualification Flow (Pre-Analysis)
- **Initial Trigger**: Center-aligned "Start Onboarding" button with `animate-glow-pulse` from `globals.css`.
- **Choice Poll**: After trigger, present a `Choice Poll` to capture user intent:
    - **Questions**: "What is your role?" (Frontend, Backend, Devops, Fullstack), "What are you looking for?" (Feature add, Bug fix, Learning).
    - **Impact**: Poll results are sent to the backend to customize the generated plan (e.g., highlighting frontend files for a frontend dev).
- **Intro Disclosure**: Collapsible section using `Intro Disclosure` to explain the "Architecture Overview" or "How it Works" before or during the analysis.

### 2.2 Processing View (SSE Streaming)
- **Overlay**: Replaces the Welcome content once poll is submitted.
- **Feedback**:
    - **Progress Bar**: Indeterminate `Progress` component.
    - **Status List**: A vertical list of status messages (e.g., "Mapping entry points for [Role]...", "Curating relevant files...").
    - **Animation**: `animate-fade-up` for new messages.

### 2.3 Onboarding Walkthrough (The Plan)
- **Container**: Uses the `Onboarding` component for a multi-step guided walkthrough.
- **Visuals**:
    - **File Structure**: `@pierre/trees` for a visual representation of the "Key Files Index" or repository structure within steps.
    - **Code Diffs**: `@pierre/diffs` for visualizing core code snippets or required changes in setup steps.
- **Sections**:
    1. **Welcome**: Summary + Choice Poll feedback.
    2. **Architecture**: `Intro Disclosure` for deep dive.
    3. **Guided Steps**: `Onboarding` steps with `@pierre/trees` highlighting context.
    4. **Setup**: `SetupGuide` with copyable commands and `@pierre/diffs` for config examples.

## 3. Design Tokens

### 3.1 Spacing
8pt scale using existing CSS variables:
- `var(--space-xs)` (8px): Icon padding, small gaps.
- `var(--space-md)` (16px): Card spacing, poll options.
- `var(--space-lg)` (24px): Section padding.

### 3.2 Typography
Geist-based scale (Consolidated to 2 weights):
- **H1**: `var(--text-h1)` (32px), Semibold.
- **Body**: `var(--text-body)` (15px), Regular.
- **Code**: `var(--text-code)` (13px), Mono.

### 3.3 Color
- **Dominant (60%)**: `--background` (Near-black `oklch(0.08 0.005 45)`).
- **Secondary (30%)**: `--surface-1` / `--surface-2` (Elevated cards).
- **Accent (10%)**: `--brand` (Orange Flame `#EC4E02`).
    - Reserved for: "Start Onboarding" trigger, active Poll options, Walkthrough step markers, active file highlights in trees.

## 4. Component Inventory

| Component | Library / Source | Usage |
|-----------|------------------|-------|
| `Onboarding` | `cult-ui` | Multi-step guided walkthrough container. |
| `IntroDisclosure`| `cult-ui` | Expandable architecture/setup sections. |
| `ChoicePoll` | `cult-ui` | Gathering developer intent to filter the plan. |
| `FileTree` | `@pierre/trees` | High-fidelity file tree for Key Files Index. |
| `CodeDiff` | `@pierre/diffs` | Visualizing code changes/examples. |
| `OnboardingTrigger`| New | Glow-pulsing trigger button. |
| `StatusStream` | New | Real-time SSE status message list. |

## 5. Interaction Contract (Installation & Setup)

### 5.1 Commands
```bash
# Libraries
pnpm i @pierre/diffs @pierre/trees motion

# Cult UI Registry (Components)
npx shadcn@latest add "https://www.cult-ui.com/r/onboarding.json"
npx shadcn@latest add "https://www.cult-ui.com/r/intro-disclosure.json"
npx shadcn@latest add "https://www.cult-ui.com/r/choice-poll.json"
```

### 5.2 Flow State Machine
1. **IDLE**: User sees the "Start Onboarding" button.
2. **QUALIFYING**: User clicks button -> `Choice Poll` appears.
3. **STREAMING**: User submits poll -> SSE starts. Status messages stream.
4. **PLAN_READY**: SSE delivers `type: "plan"`. Transition to `Onboarding` walkthrough.
5. **EXPLORING**: User navigates steps; `@pierre/trees` updates to show relevant files.

## 6. Copywriting

- **Primary CTA**: "Start Onboarding"
- **Poll Question**: "What is your primary focus?"
- **Poll Options**: "Backend Logic", "Frontend Components", "Fullstack Flow", "Just Exploring".
- **Empty State**: "No onboarding plan for this repo yet. Generate one now."
- **Error State**: "Analysis failed. Please try again with a different focus."

## 7. Safety Gate (Registry)

| Registry | Block | Safety Status | Evidence |
|----------|-------|---------------|----------|
| `cult-ui` | `onboarding` | `view passed` | Standard motion-based stepper, no external network calls. |
| `cult-ui` | `intro-disclosure`| `view passed` | Clean disclosure pattern, uses local state. |
| `cult-ui` | `choice-poll` | `view passed` | Interactive radio-group variant, safety vetted. |

---
*Generated for Phase 23: Onboarding UX Improvements*
