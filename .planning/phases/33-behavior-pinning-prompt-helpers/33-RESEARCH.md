# Phase 33: Behavior Pinning & Prompt Helpers - Research

**Researched:** 2026-05-29
**Domain:** Next.js/React chat prompt-context extraction, typed submit callbacks, onboarding regression pins
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Prompt Contract
- **D-01:** The pure prompt builder must return a three-part result: `displayMessage`, `backendPrompt`, and `artifacts`.
- **D-02:** `displayMessage` preserves the visible user text and artifacts shown in chat; `backendPrompt` contains the expanded sent context.
- **D-03:** File and folder content load failures must remain explicit in `backendPrompt` as failure notes, preserving current behavior instead of blocking send or omitting references.
- **D-04:** `@path` mentions remain lightweight labels only. The helper rewrites/list-references them like today; it must not fetch file contents for mentions in this phase.
- **D-05:** Prompt builder tests must assert exact key section strings/order for `Referenced snippets` and `Referenced files`, plus display artifacts.

#### Chip Scope Display
- **D-06:** Chips must show type plus scope before send: snippet path/line range, file path, or folder path with cap text.
- **D-07:** Folder chips must communicate the fixed cap text `up to 8 files, 8k chars each` before send. Do not add dynamic count work unless planner finds it trivial and behavior-neutral.
- **D-08:** Replace optional `kind` with a discriminated union for the existing chip concept so file, folder, and snippet metadata are typed.
- **D-09:** Chip removal remains immediate with no confirmation or undo.

#### Submit Behavior
- **D-10:** Replacing synthetic DOM submit must preserve keyboard semantics exactly: Enter sends only when non-empty and not loading; Shift+Enter inserts newline; mention-menu keyboard behavior remains unchanged.
- **D-11:** `ChatInput` should expose an explicit typed value callback such as `onSubmit({ text })` or `onSubmit(text)`. `FormEvent` should not leave `ChatInput`.
- **D-12:** Phase 33 must stay with existing snippet/file/folder chips. Do not adopt `PromptInput` attachment files as a new runtime capability.
- **D-13:** Stop generation behavior is preserve-only in this phase. Abort/liveness UX changes belong to Phase 35.

#### Onboarding Guardrail
- **D-14:** Onboarding behavior pins include the full current flow states: `IDLE -> QUALIFYING -> STREAMING -> PLAN_READY -> DONE`, including cancel and try-again behavior.
- **D-15:** Cached onboarding plan reuse is mandatory: `useOnboarding` must keep checking `/api/backend/repo/{repoId}/onboarding-plan` before opening EventSource generation.
- **D-16:** Phase 33 should add behavior pins/tests around onboarding only. Do not extract or move onboarding ownership in this phase.
- **D-17:** Required onboarding regression evidence: keep/extend `useOnboarding` hook tests and add/extend `ChatStream` render tests for first-run/reopen/completion behavior.

### the agent's Discretion
No user-delegated gray areas remain. Planner may choose exact file/module names and helper signatures within the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- Fetching file contents for `@path` mentions is deferred; mentions remain lightweight labels in Phase 33.
- Transport abort/liveness state improvements are deferred to Phase 35.
- Onboarding ownership extraction is deferred to later shell/ownership phases if still needed.
- `Investigate GitHub SameSite cookie warnings` remains outside Phase 33 prompt helper/onboarding behavior pinning.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-03 | User keeps existing onboarding entry and completion behavior after the chat refactor. [VERIFIED: `.planning/REQUIREMENTS.md`] | Pin `useOnboarding`, `OnboardingGuide`, and `ChatStream` first-run/reopen/completion behavior. [VERIFIED: codebase read] |
| PRMP-01 | Prompt context builder is pure and tested, returning display artifacts plus backend prompt payload for text, mentions, snippets, files, and folders. [VERIFIED: `.planning/REQUIREMENTS.md`] | Extract pure helper returning `{ displayMessage, backendPrompt, artifacts }` after async file/folder loading. [VERIFIED: `33-CONTEXT.md`] |
| PRMP-02 | Chat input submits through an explicit typed callback, not synthetic DOM submit events or broad ref casts. [VERIFIED: `.planning/REQUIREMENTS.md`] | Replace app-facing `onSubmit(FormEvent)` with typed payload and remove `form.dispatchEvent(...)` + `ref as any`. [VERIFIED: codebase grep] |
| PRMP-03 | File, folder, and snippet chips show scope, caps, and removable sent context clearly before send. [VERIFIED: `.planning/REQUIREMENTS.md`] | Use discriminated chip variants and render type/scope/cap labels in `ChatInput`. [VERIFIED: `33-CONTEXT.md`] |
</phase_requirements>

## Summary

Phase 33 is frontend behavior-preservation refactor, not feature expansion. [VERIFIED: `33-CONTEXT.md`] Current prompt assembly lives in `web/src/app/repo/[id]/page.tsx` lines 384-520 and mixes DOM submit handling, async file/folder loading, mention rewriting, display artifacts, backend prompt assembly, stream dispatch, and chip clearing. [VERIFIED: codebase read]

Onboarding must be pinned, not moved. [VERIFIED: `33-CONTEXT.md`] Current first-run onboarding is rendered by `ChatStream` when `messages.length === 0 && !isLoading`; reopen uses `__DEVBRIDGE_ONBOARDING_READY__` plus `devbridge:open-onboarding`; cached plan reuse happens in `useOnboarding.startGeneration()` before EventSource creation. [VERIFIED: codebase read]

**Primary recommendation:** Extract `buildPromptContext()` as pure TypeScript helper fed by preloaded chip payloads; keep route fetch/stream ownership unchanged; make `ChatInput` emit `onSubmit({ text })`; add focused Jest tests before refactor. [VERIFIED: codebase read]

## Project Constraints (from AGENTS.md)

- Verify phase branch before implementation because project uses phase branches. [VERIFIED: `AGENTS.md`; VERIFIED: `.planning/config.json`]
- Run `npx --yes fallow --production` before commit to catch dead code, complexity, duplication. [VERIFIED: `AGENTS.md`]
- `entire` and `graphify` run via hooks; expect post-commit analysis/checkpoint behavior. [VERIFIED: `AGENTS.md`]
- Read `graphify-out/GRAPH_REPORT.md` before architecture/codebase answers; report shows onboarding-related communities and prompt-input attachment community. [VERIFIED: `AGENTS.md`; VERIFIED: `graphify-out/GRAPH_REPORT.md`]
- After code changes, run `graphify update .`. [VERIFIED: `AGENTS.md`]
- In `web/`, read relevant `node_modules/next/dist/docs/` before writing Next.js code. [VERIFIED: `web/AGENTS.md`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Prompt text entry and mention keyboard handling | Browser / Client | — | `ChatInput` owns textarea state, keydown handling, mention query, and mention suggestion UI. [VERIFIED: `ChatInput.tsx`] |
| File/folder/snippet chip display/removal | Browser / Client | — | Repo page owns `snippetChips`; `ChatInput` renders and removes them before send. [VERIFIED: `page.tsx`; VERIFIED: `ChatInput.tsx`] |
| File/folder content loading | Browser / Client | API / Backend | Current route fetches `/api/backend/repo/{repoId}/files/{path}` for chip payloads; backend serves content. [VERIFIED: `page.tsx`] |
| Pure prompt context assembly | Browser / Client | — | Requirement demands pure tested builder returning display artifacts and backend prompt. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| Chat stream request dispatch | Browser / Client | API / Backend | Current route posts `message`, `repo_id`, `thread_id` to `/api/backend/chat/stream`; Phase 33 preserves transport. [VERIFIED: `page.tsx`; VERIFIED: `33-CONTEXT.md`] |
| Onboarding cached plan + SSE | Browser / Client | API / Backend | `useOnboarding` checks cached plan endpoint, then opens EventSource to `/start-here`. [VERIFIED: `useOnboarding.ts`] |
| Onboarding entry/reopen/completion UI | Browser / Client | — | `ChatStream` and `OnboardingGuide` render first-run, reopen overlay, navigation, and completion sentinel. [VERIFIED: codebase read] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | installed `19.2.4`; npm latest `19.2.6` modified 2026-05-28 | Controlled textarea state and component callbacks | Project runtime uses React; official docs show controlled textarea and form submit state patterns. [VERIFIED: `web/package.json`; VERIFIED: npm registry; CITED: https://github.com/reactjs/react.dev/blob/main/src/content/reference/react-dom/components/textarea.md] |
| Next.js | installed range `^16.2.3`; resolved/latest `16.2.6` modified 2026-05-28 | App Router client page and route hooks | Repo page is a Client Component; official docs require `'use client'` for state/event handlers and `next/navigation` hooks in client components. [VERIFIED: `web/package.json`; VERIFIED: npm registry; CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/01-directives/use-client.mdx] |
| TypeScript | installed `5.9.3`; npm latest `6.0.3` modified 2026-04-16 | Discriminated chip unions and pure helper contracts | `web/tsconfig.json` has `strict: true`; discriminated unions fit D-08. [VERIFIED: `web/tsconfig.json`; VERIFIED: npm registry] |
| Jest + ts-jest | Jest `30.4.2`; ts-jest installed `29.4.9`, latest `29.4.11` modified 2026-05-21 | Unit tests for helpers/hooks/components | Existing frontend test runner is Jest with ts-jest transform. [VERIFIED: `web/package.json`; VERIFIED: `web/jest.config.js`; VERIFIED: npm registry] |
| React Testing Library + jest-dom | RTL `16.3.2`; jest-dom `6.9.1` | Render tests and DOM assertions | Existing tests use `render`, `screen`, and jest-dom. [VERIFIED: `ChatStream.test.tsx`; VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/user-event` | not installed; latest `14.6.1` modified 2025-12-13 | Realistic keyboard/click tests | Add only if planner wants user-level Enter/Shift+Enter tests; docs recommend `userEvent.setup()` and `user.keyboard()`. [VERIFIED: `npm ls`; VERIFIED: npm registry; CITED: https://github.com/testing-library/testing-library-docs] |
| ai-elements `PromptInput` local component | local source | Textarea shell and submit button | Keep for UI shell, but hide `(message, event)` from app-level `ChatInput` API. [VERIFIED: `prompt-input.tsx`; VERIFIED: `33-CONTEXT.md`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure helper + existing fetch boundary | Server-side prompt builder | Violates current client-owned file/folder fetch and increases transport churn. [VERIFIED: `page.tsx`; VERIFIED: `33-CONTEXT.md`] |
| Explicit `onSubmit({ text })` | Keep `FormEvent` passthrough | Violates PRMP-02 and D-11. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `33-CONTEXT.md`] |
| Existing snippet/file/folder chips | `PromptInput` runtime attachments | Explicitly out of scope for Phase 33. [VERIFIED: `33-CONTEXT.md`] |

**Installation:**
```bash
# No runtime package required for core extraction.
# Optional for keyboard tests:
npm install --save-dev @testing-library/user-event --prefix web
```

**Version verification:** `npm view` confirmed package current versions on 2026-05-29. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User input/chips
  -> ChatInput typed submit { text }
  -> RepoWorkspacePage async boundary
       -> preload file chips via /api/backend/repo/{repoId}/files/{path}
       -> expand folder chips: first 8 files, each content slice(0, 8000)
       -> preserve load failures as payload content notes
  -> buildPromptContext(input)
       -> displayMessage = trimmed visible text
       -> artifacts = cloned typed chips
       -> backendPrompt = mention-stripped text + Referenced snippets + Referenced files
  -> append visible user message
  -> POST /api/backend/chat/stream with backendPrompt
```

### Recommended Project Structure

```text
web/src/components/chat/
├── ChatInput.tsx                  # typed value submit + chip display/removal
├── types.ts                       # discriminated chat artifact/chip types
└── __tests__/ChatStream.test.tsx  # onboarding first-run/reopen/completion pins
web/src/lib/chat/
├── prompt-context.ts              # pure builder + section constants
└── prompt-context.test.ts         # exact backend/display/artifact tests
web/src/hooks/
└── useOnboarding.test.ts          # cached/SSE/cancel/error pins
```

### Pattern 1: Pure Builder With Preloaded Inputs

**What:** Function accepts text, typed chips, and already-loaded payloads; returns serializable result. [VERIFIED: `33-CONTEXT.md`]

**When to use:** Use after async file/folder loading has completed in route/helper boundary. [VERIFIED: `page.tsx`]

**Example:**
```ts
// Source: codebase current behavior in web/src/app/repo/[id]/page.tsx
export type PromptBuildResult = {
  displayMessage: string;
  backendPrompt: string;
  artifacts: ChatArtifact[];
};

export function buildPromptContext(input: PromptBuildInput): PromptBuildResult {
  const displayMessage = input.text.trim();
  const { mentionResolvedMessage, mentionPaths } = collectMentionLabels(displayMessage);
  return {
    displayMessage,
    backendPrompt: joinSections(mentionResolvedMessage, input.loadedReferences, mentionPaths),
    artifacts: input.chips.map((chip) => ({ ...chip })),
  };
}
```

### Pattern 2: Typed ChatInput Callback Boundary

**What:** `ChatInput` keeps form/event details internal and emits `onSubmit({ text })`. [VERIFIED: `33-CONTEXT.md`]

**When to use:** Replace `onSubmit={(msg, e) => onSubmit(e)}` and synthetic form dispatch in `ChatInput`. [VERIFIED: `ChatInput.tsx`]

**Example:**
```tsx
// Source: React controlled textarea docs + local PromptInput API
type ChatInputSubmit = { text: string };

<PromptInput onSubmit={({ text }) => onSubmit({ text: text.trim() })}>
  <PromptInputTextarea value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} />
</PromptInput>
```

### Anti-Patterns to Avoid

- **DOM event tunneling:** `FormEvent` leaving `ChatInput` or manual `form.dispatchEvent(new Event("submit"))` violates PRMP-02. [VERIFIED: `.planning/REQUIREMENTS.md`; VERIFIED: `ChatInput.tsx`]
- **Broad ref casts:** `ref={inputRef as any}` is current debt; remove via typed forward ref path or callback ref compatible with `PromptInputTextarea`. [VERIFIED: codebase grep]
- **Fetching mention contents:** `@path` mentions remain labels only in Phase 33. [VERIFIED: `33-CONTEXT.md`]
- **Moving onboarding ownership:** Phase 33 adds behavior pins only. [VERIFIED: `33-CONTEXT.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form keyboard submit mechanics | Custom synthetic DOM submit event | Native `requestSubmit()` inside local `PromptInputTextarea` or direct typed callback from `PromptInput.onSubmit` | Local ai-elements already uses `form?.requestSubmit()` for Enter. [VERIFIED: `prompt-input.tsx`] |
| Test rendering/query helpers | Custom DOM harness | Jest + React Testing Library | Existing tests use these patterns. [VERIFIED: `ChatStream.test.tsx`] |
| Chip variant typing | Optional `kind` plus fallback branches | TypeScript discriminated union | D-08 requires discriminated union. [VERIFIED: `33-CONTEXT.md`] |
| New attachment runtime | `PromptInput` file attachment capability | Existing snippet/file/folder chips | D-12 forbids adopting runtime attachment files in Phase 33. [VERIFIED: `33-CONTEXT.md`] |

**Key insight:** Custom submit/context logic is already too entangled in the route; this phase should reduce surface area, not add generic abstractions. [VERIFIED: codebase read]

## Common Pitfalls

### Pitfall 1: Accidentally Changing Backend Prompt Format
**What goes wrong:** Tests pass broadly but exact `Referenced snippets` / `Referenced files` order or strings drift. [VERIFIED: `33-CONTEXT.md`]
**Why it happens:** Current formatting is inline string building in the route. [VERIFIED: `page.tsx`]
**How to avoid:** Add exact-string tests before extraction. [VERIFIED: `33-CONTEXT.md`]
**Warning signs:** Snapshot or contains-only assertions instead of full `backendPrompt` equality. [ASSUMED]

### Pitfall 2: Mention Menu Enter Behavior Regresses
**What goes wrong:** Enter sends message while mention menu is open instead of inserting selected mention. [VERIFIED: `ChatInput.tsx`]
**Why it happens:** Submit logic and mention keyboard logic share Enter key handling. [VERIFIED: `ChatInput.tsx`]
**How to avoid:** Keep mention-menu block first; only submit on Enter after menu handling returns. [VERIFIED: `ChatInput.tsx`]
**Warning signs:** New handler checks `e.key === "Enter"` before `mentionQuery !== null`. [ASSUMED]

### Pitfall 3: PromptInput Attachments Sneak In
**What goes wrong:** Local `PromptInput` emits `{ text, files }`, and files start flowing into app prompt runtime. [VERIFIED: `prompt-input.tsx`]
**Why it happens:** `PromptInput` supports local attachments, but Phase 33 forbids adopting them. [VERIFIED: `33-CONTEXT.md`]
**How to avoid:** Destructure/use only `message.text` in `ChatInput`; do not pass file attachment actions. [VERIFIED: `prompt-input.tsx`]
**Warning signs:** New code references `message.files` in app-level submit path. [ASSUMED]

### Pitfall 4: Onboarding Reopen Loses Cached Plan
**What goes wrong:** Reopen shows empty first-run flow instead of plan summary/steps. [VERIFIED: `ChatStream.tsx`]
**Why it happens:** `latestOnboardingPlan` and sentinel card behavior are local to `ChatStream`. [VERIFIED: `ChatStream.tsx`]
**How to avoid:** Extend render tests around sentinel card, reopen event, `resumePlan`, and `resumeAtPlan`. [VERIFIED: `33-CONTEXT.md`]
**Warning signs:** Tests mock `OnboardingGuide` too shallowly to observe props or completion callbacks. [VERIFIED: current `ChatStream.test.tsx` mocks]

## Code Examples

### Exact Existing Prompt Sections To Preserve
```ts
// Source: web/src/app/repo/[id]/page.tsx lines 489-497
const snippetContext = snippetPayloads.length
  ? `\n\nReferenced snippets:\n${snippetPayloads
      .map((payload) => `- ${payload.label}\n\`\`\`\n${payload.content}\n\`\`\``)
      .join("\n")}`
  : "";
const mentionContext = mentionContextParts.length
  ? `\n\nReferenced files:\n${mentionContextParts.join("\n")}`
  : "";
```

### Current Folder Cap To Preserve
```ts
// Source: web/src/app/repo/[id]/page.tsx lines 442-454
const selectedFiles = filesUnderFolder.slice(0, 8);
const trimmed = data.content?.slice(0, 8000) || "";
```

### Onboarding Cached Plan Contract
```ts
// Source: web/src/hooks/useOnboarding.ts lines 83-91
const existing = await fetch(`/api/backend/repo/${repoId}/onboarding-plan`);
if (existing.ok) {
  const cachedPlan = (await existing.json()) as OnboardingPlan;
  setPlan(cachedPlan);
  setLoading(false);
  return;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Uncontrolled/raw textarea handling | Controlled textarea with `value` + `onChange` | React docs current as fetched 2026-05-29 | Matches existing `ChatInput` state pattern. [CITED: react.dev textarea docs; VERIFIED: `ChatInput.tsx`] |
| Manual DOM submit dispatch | Form `requestSubmit()` or direct typed callback boundary | Local ai-elements already uses `requestSubmit()` | Remove app-specific synthetic dispatch. [VERIFIED: `prompt-input.tsx`] |
| Event-heavy app submit contract | Component-local event, app-level typed payload | Phase 33 decision | Cleaner tests and PRMP-02 compliance. [VERIFIED: `33-CONTEXT.md`] |

**Deprecated/outdated:**
- `form.dispatchEvent(new Event("submit"))` in `ChatInput` is target debt for this phase. [VERIFIED: `ChatInput.tsx`; VERIFIED: `.planning/REQUIREMENTS.md`]
- `SnippetChip.kind?` optional variant is target debt for this phase. [VERIFIED: `types.ts`; VERIFIED: `33-CONTEXT.md`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Snapshot/contains-only prompt tests are weaker than exact-string equality for this phase. | Common Pitfalls | Low; D-05 already mandates exact key section strings/order. |
| A2 | New Enter handler ordering should keep mention-menu handling before submit handling. | Common Pitfalls | Medium; breaking ordering changes visible keyboard behavior. |
| A3 | New app-level submit code should not read `message.files`. | Common Pitfalls | Medium; accidental attachment adoption violates D-12. |

## Open Questions

1. **Should planner add `@testing-library/user-event`?**
   - What we know: It is not installed; docs support realistic keyboard tests. [VERIFIED: `npm ls`; CITED: Testing Library docs]
   - What's unclear: Whether dependency churn is acceptable for Phase 33.
   - Recommendation: Use existing Testing Library first; add `user-event` only if Enter/Shift+Enter tests are awkward or brittle. [VERIFIED: current test stack]

2. **Where exactly should prompt helper live?**
   - What we know: Codebase conventions allow frontend helpers in `web/src/lib/`, `web/src/hooks/`, or chat-local helper; route should not grow. [VERIFIED: `.planning/codebase/CONVENTIONS.md`; VERIFIED: `33-CONTEXT.md`]
   - What's unclear: Team preference between `web/src/lib/chat/prompt-context.ts` and `web/src/components/chat/prompt-context.ts`.
   - Recommendation: Use `web/src/lib/chat/prompt-context.ts` because helper is pure and non-UI. [VERIFIED: `.planning/codebase/STRUCTURE.md`]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | web tests/build | ✓ | `v24.13.0` | — [VERIFIED: local command] |
| npm/npx | package scripts, optional install | ✓ | `11.1.0` | — [VERIFIED: local command] |
| Git | branch/status/diff | ✓ | `2.47.0.windows.2` | — [VERIFIED: local command] |
| Jest | unit tests | ✓ | `30.4.2` | — [VERIFIED: `npm ls`] |
| React Testing Library | render tests | ✓ | `16.3.2` | — [VERIFIED: `npm ls`] |
| @testing-library/user-event | optional keyboard tests | ✗ | — | Use `fireEvent` / existing RTL, or install dev dependency. [VERIFIED: `npm ls`] |
| graphify | project graph refresh/query | ✓ | command returned query results | `graphify-out/GRAPH_REPORT.md` if CLI unavailable. [VERIFIED: local command] |

**Missing dependencies with no fallback:** None. [VERIFIED: environment audit]

**Missing dependencies with fallback:** `@testing-library/user-event` optional. [VERIFIED: environment audit]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest `30.4.2` + ts-jest `29.4.9` + React Testing Library `16.3.2` + jest-dom `6.9.1` [VERIFIED: `web/package.json`; VERIFIED: `npm ls`] |
| Config file | `web/jest.config.js` [VERIFIED: codebase read] |
| Quick run command | `npm run test --prefix web -- prompt-context ChatInput ChatStream useOnboarding` [VERIFIED: npm scripts] |
| Full suite command | `npm run test --prefix web` [VERIFIED: `web/package.json`] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHELL-03 | first-run onboarding appears, cached plan reused, cancel/try-again/completion preserved | unit/render | `npm run test --prefix web -- useOnboarding ChatStream` | ✅ extend existing [VERIFIED: codebase read] |
| PRMP-01 | pure prompt builder returns exact display/backend/artifacts for text, mentions, snippets, files, folders, failures | unit | `npm run test --prefix web -- prompt-context` | ❌ Wave 0 [VERIFIED: glob] |
| PRMP-02 | `ChatInput` emits typed text callback; Enter/Shift+Enter/menu semantics preserved | component unit | `npm run test --prefix web -- ChatInput` | ❌ Wave 0 [VERIFIED: glob] |
| PRMP-03 | chips show type/scope/cap and remove immediately | component unit | `npm run test --prefix web -- ChatInput` | ❌ Wave 0 [VERIFIED: glob] |

### Sampling Rate
- **Per task commit:** `npm run test --prefix web -- prompt-context ChatInput ChatStream useOnboarding` [VERIFIED: npm scripts]
- **Per wave merge:** `npm run test --prefix web` [VERIFIED: npm scripts]
- **Phase gate:** `npm run test --prefix web && npx --yes fallow --production` [VERIFIED: `AGENTS.md`; VERIFIED: `web/package.json`]

### Wave 0 Gaps
- [ ] `web/src/lib/chat/prompt-context.test.ts` — covers PRMP-01. [VERIFIED: glob]
- [ ] `web/src/components/chat/__tests__/ChatInput.test.tsx` — covers PRMP-02 and PRMP-03. [VERIFIED: glob]
- [ ] Extend `web/src/components/chat/__tests__/ChatStream.test.tsx` — covers SHELL-03 first-run/reopen/completion. [VERIFIED: current file]
- [ ] Extend `web/src/hooks/useOnboarding.test.ts` — covers cached plan, cancel, try-again/error, EventSource close. [VERIFIED: current file]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no direct auth change | Preserve existing `/api/backend` route behavior; no auth code in Phase 33. [VERIFIED: `33-CONTEXT.md`] |
| V3 Session Management | no direct session change | Preserve `activeSessionId` and chat stream thread behavior. [VERIFIED: `page.tsx`; VERIFIED: `33-CONTEXT.md`] |
| V4 Access Control | indirect | Do not add new file-fetch endpoints or attachment capabilities; use existing repo file endpoint only. [VERIFIED: `page.tsx`; VERIFIED: `33-CONTEXT.md`] |
| V5 Input Validation | yes | Treat user text/chip metadata as strings; preserve escaping of mention regex before replacement. [VERIFIED: `page.tsx`] |
| V6 Cryptography | no | No crypto touched. [VERIFIED: phase scope] |

### Known Threat Patterns for Next.js/React prompt assembly

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt-context spoofing via malformed chip type | Tampering | Discriminated union plus exhaustive switch; reject malformed drop payloads. [VERIFIED: `types.ts`; VERIFIED: `page.tsx`] |
| Regex injection via `@path` replacement | Tampering | Keep `path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` escaping when constructing replacement regex. [VERIFIED: `page.tsx`] |
| Accidental data expansion via mentions | Information Disclosure | Do not fetch mention contents; mentions remain labels. [VERIFIED: `33-CONTEXT.md`] |
| New browser file attachments sent unintentionally | Information Disclosure | Do not consume `PromptInput` `files` payload in app-level submit. [VERIFIED: `prompt-input.tsx`; VERIFIED: `33-CONTEXT.md`] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/33-behavior-pinning-prompt-helpers/33-CONTEXT.md` — locked decisions and scope. [VERIFIED]
- `.planning/REQUIREMENTS.md` — SHELL-03, PRMP-01, PRMP-02, PRMP-03. [VERIFIED]
- `.planning/STATE.md` — v1.1 context and Phase 33 boundaries. [VERIFIED]
- `AGENTS.md`, `web/AGENTS.md` — project constraints. [VERIFIED]
- Code reads: `page.tsx`, `ChatInput.tsx`, `types.ts`, `ChatStream.tsx`, `useOnboarding.ts`, `OnboardingGuide.tsx`, `prompt-input.tsx`, tests/config files. [VERIFIED]
- Context7 React docs — controlled textarea and form submit patterns. [CITED: https://github.com/reactjs/react.dev/blob/main/src/content/reference/react-dom/components/textarea.md]
- Context7 Next.js v16.2.2 docs — `'use client'` and client navigation hooks. [CITED: https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/01-directives/use-client.mdx]

### Secondary (MEDIUM confidence)
- Testing Library docs via Context7 — `userEvent.setup()` and `user.keyboard()` examples. [CITED: https://github.com/testing-library/testing-library-docs]
- `graphify query "Phase 33 prompt context ChatInput onboarding useOnboarding"` — confirmed onboarding/test graph relationships. [VERIFIED: graphify CLI]

### Tertiary (LOW confidence)
- None used as authoritative source. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified via `web/package.json`, `npm ls`, and `npm view`. [VERIFIED]
- Architecture: HIGH — based on direct source reads and phase decisions. [VERIFIED]
- Pitfalls: MEDIUM — main risks verified from source; some warning signs are implementation heuristics marked assumed. [VERIFIED; ASSUMED]

**Research date:** 2026-05-29
**Valid until:** 2026-06-05 for npm/version data; 2026-06-28 for codebase-local architecture if Phase 33 starts promptly.
