# Stack Research: v1.1 Chat System Rebuild

**Project:** DevBridge AMD Edition  
**Researched:** 2026-05-29  
**Scope:** Only new/changed stack for chat rebuild, OpenUI exploration, GSAP motion, and servercn-informed patterns. Existing Cascadeflow/Hindsight stack not re-researched.

## Recommendation

Add **GSAP v3** as the only clear runtime dependency for v1.1. Use it to replace ad-hoc route/panel/message movement, with a small internal motion layer instead of scattering `gsap.to()` calls across chat components.

Treat **OpenUI** as an **exploration/scaffold source first**, not an immediate wholesale chat replacement. Use `npx @openuidev/cli@latest create` in a throwaway/sandbox directory to inspect generated Next.js App Router chat patterns, component-library prompt generation, renderer behavior, and API contracts. If integration survives spike, add only the specific packages needed (`@openuidev/react-ui`, `@openuidev/react-headless`, `@openuidev/react-lang`, `@openuidev/lang-core`) behind a narrow adapter. Do not replace the canonical DevBridge chat transport/session/prompt-context model with OpenUI state.

Treat **servercn** as a **pattern/reference generator**, not a stack migration. Current app uses FastAPI + Next.js route handlers, while servercn is primarily Node/Express registry code. Use docs/CLI `view` output to borrow concepts: env validation, typed response envelopes, request validation, health/liveness shape, route/component organization. Do not add Express, Drizzle, Prisma, Mongoose, Passport, or servercn-generated runtime files into this FastAPI app unless a later phase explicitly creates a separate Node service.

Primary v1.1 work should be **architecture extraction**, not dependency growth:

- `useChatStreamTransport` + SSE watchdog/abort/inactivity timeout.
- `buildPromptContext` pure module for mentions/snippets/file context.
- `AssistantMessageViewModel` to remove render-time protocol casts.
- Canonical `FileTreeView` + `useFileTree` to delete duplicate tree renderers.
- Split `HistorySidebar` into session panel and repo utilities panel.
- Decompose `prompt-input.tsx` and `file-upload.tsx` before adopting generated UI.

## Stack Additions

| Addition | Current verified version | Install? | Purpose | Why |
|----------|--------------------------|----------|---------|-----|
| `gsap` | npm `3.15.0`; GSAP docs show v3.15 | **Yes** | Core timeline/tween engine for chat/panel/route motion | Official docs recommend `npm install gsap`; timelines fit coordinated chat workspace transitions better than scattered CSS/React state animation. |
| `@gsap/react` | npm `2.1.2` | **Yes if using React hook wrapper** | React cleanup/context integration for client components | Use when animations live in React components; GSAP docs emphasize React `useGSAP()`, context/revert cleanup, and matchMedia. |
| `@openuidev/cli` | npm `0.0.7` | **No persistent install; use npx** | Scaffold OpenUI examples and generate OpenUI system prompts/component specs | User-specified command and docs confirm `npx @openuidev/cli@latest create --name ...` plus `generate`. Keep generated app outside production tree until evaluated. |
| `@openuidev/react-ui` | npm `0.11.8` | **Maybe after spike** | Built-in OpenUI chat layouts and GenUI component library | Docs install it for existing Next.js App Router apps. Current app already has bespoke chat shell; use only if it reduces local UI complexity. |
| `@openuidev/react-headless` | version not checked by npm in this pass | **Maybe after spike** | Headless message state, stream adapters, formats | Docs use it for `openAIMessageFormat`, `openAIReadableStreamAdapter`, and custom processing. Needed only if OpenUI owns client chat primitives. |
| `@openuidev/react-lang` | npm `0.2.6` | **Maybe after spike** | `<Renderer />` for OpenUI Lang inside assistant messages | Good fit for generative UI artifacts, not the base text chat path. Requires typed action/error handling boundary. |
| `@openuidev/lang-core` | version not checked by npm in this pass | **Maybe server-side only** | Programmatic prompt generation from component spec | Use if backend needs dynamic OpenUI prompts. Because backend is Python/FastAPI, prefer CLI-generated prompt/spec file first. |
| `servercn-cli` | npm `2.0.5`; docs config examples show schema version `1.1.11` | **No production install** | Inspect backend pattern registry | Docs state components are copied into codebase, not runtime dependency. Use `view`/docs for ideas; do not initialize in repo without a branch/spike. |

**Existing dependency to revisit:** `motion` (`^12.38.0`) is already installed. If GSAP becomes canonical for motion, do not run both as first-class animation systems long-term. Keep `motion` only where already deeply embedded or where removal would expand v1.1 scope; add a later cleanup phase to consolidate.

## Commands

### GSAP install

Run from `web/`:

```bash
npm install gsap @gsap/react
```

Use in client-only modules/components:

```ts
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
```

### OpenUI exploration scaffold

Run outside production source, preferably under an ignored spike directory or temp workspace:

```bash
npx @openuidev/cli@latest create --name openui-chat-spike
cd openui-chat-spike
npm run dev
```

Do **not** blindly copy generated `app/api/chat/route.ts` into DevBridge. Generated route assumes OpenAI-style server code and system prompt file flow; DevBridge streams through FastAPI `/chat/stream` and Gemini/Gemma route metadata.

### OpenUI prompt/spec generation for a controlled spike

If adding a local OpenUI component library file in the web app:

```bash
npx @openuidev/cli@latest generate ./src/openui/library.ts --out ./src/openui/generated/system-prompt.txt
npx @openuidev/cli@latest generate ./src/openui/library.ts --json-schema --out ./src/openui/generated/component-spec.json
```

If package install becomes necessary after spike, run from `web/`:

```bash
npm install @openuidev/react-ui @openuidev/react-headless @openuidev/react-lang @openuidev/lang-core
```

Docs also list `lucide-react`, but current app already has it installed (`^1.11.0`).

### servercn inspection only

From a scratch directory or read-only review step:

```bash
npx servercn-cli list
npx servercn-cli view cp env-config --json
npx servercn-cli view cp health-check --json
npx servercn-cli view cp response-formatter --json
npx servercn-cli view cp request-validator --json
```

Avoid this in repo root unless intentionally creating `servercn.config.json`:

```bash
npx servercn-cli init
```

## Integration Points

### Chat ownership rebuild

Likely files touched:

- `web/src/app/repo/[id]/page.tsx` — shrink to composition shell; remove transport/prompt/file-tree orchestration.
- `web/src/components/chat/ChatStream.tsx` — consume typed message view models; optionally render OpenUI artifacts only behind explicit message kind.
- `web/src/components/chat/ChatInput.tsx` — route explicit submit callbacks; stop synthetic form event dispatch.
- `web/src/components/chat/HistorySidebar.tsx` — split into `SessionListPanel` and `RepoUtilitiesPanel`.
- `web/src/components/chat/FileExplorer.tsx` — replace duplicate tree renderer with shared `FileTreeView`.
- `web/src/components/ai-elements/prompt-input.tsx` — split controller/attachments/view before adding OpenUI UI surfaces.
- `web/src/components/ui/file-upload.tsx` — split store/validators/view; avoid importing more upload abstractions.

Suggested new files:

- `web/src/features/chat/useChatSessionState.ts`
- `web/src/features/chat/useChatStreamTransport.ts`
- `web/src/features/chat/chatStreamProtocol.ts`
- `web/src/features/chat/buildPromptContext.ts`
- `web/src/features/chat/assistantMessageViewModel.ts`
- `web/src/features/files/FileTreeView.tsx`
- `web/src/features/files/useFileTree.ts`
- `web/src/features/motion/useGsapMotion.ts` or `web/src/lib/motion/gsap.ts`

### OpenUI integration shape

Use OpenUI in one of two narrow ways:

1. **Component exploration path:** scaffold app, inspect generated components/layout patterns, then manually port useful small UI ideas into existing components.
2. **Assistant artifact renderer:** add OpenUI Lang renderer only for assistant messages flagged as `kind: "openui"` or `artifact.type: "openui-lang"`.

Do **not** let OpenUI own DevBridge session state initially. Its documented default contract posts `{ threadId, messages }` and has thread API paths (`/api/threads/get`, `/create`, `/update/:id`, etc.). DevBridge already has chat persistence/session behavior and FastAPI stream metadata. Build an adapter only if needed:

- DevBridge message/session model -> OpenUI message format.
- FastAPI SSE events -> OpenUI-compatible stream text or renderer response string.
- OpenUI action events -> typed DevBridge commands, never direct arbitrary backend calls.

OpenUI Renderer docs support `onAction`, `onStateUpdate`, `toolProvider`, and `onError`; wire these through explicit allowlists. For `toolProvider`, do not expose broad repo/backend APIs directly.

### GSAP motion layer

Use GSAP for:

- Chat message entrance/replace transitions.
- Sidebar/panel open-close choreography.
- File tree/right panel transitions.
- Route-level layout transforms where existing `LayoutTransition` is insufficient.
- Reduced-motion aware timeline disabling via `gsap.matchMedia()` or project helper.

Pattern:

- Only run GSAP in client components.
- Use refs/scoped selectors, not global selectors.
- Use `useGSAP()`/context cleanup or `ctx.revert()` on unmount.
- Centralize durations/eases in `web/src/lib/motion/tokens.ts`.
- Respect `prefers-reduced-motion`; animation should collapse to opacity/instant state, not disappear content.

### servercn-informed backend/component patterns

Map patterns, not packages:

- `env-config` pattern -> current thermo recommendation: central `web/src/lib/env.ts` / backend already has `api/core/config.py`; remove fallback `dev-token-default` and fail fast.
- `health-check` pattern -> current liveness risk: add explicit chat stream watchdog states on frontend; backend health likely remains FastAPI-native.
- `response-formatter` / error-handler pattern -> typed route envelopes for Next route handlers like `web/src/app/api/highlight/route.ts` and safe structured errors from chat adapters.
- `request-validator` pattern -> validate OpenUI action/tool payloads and chat stream event payloads at boundary. Use existing TypeScript/Zod only if already or newly justified; do not add duplicate validation libraries if project has enough typed contracts.

## Risks

| Risk | Severity | Why | Mitigation |
|------|----------|-----|------------|
| OpenUI package/doc mismatch | Medium | Docs mention `@openuidev/react`; npm returned 404, while documented install now uses `@openuidev/react-ui` + `@openuidev/react-headless`. | Follow current installation docs, verify npm package before install, keep spike isolated. |
| Replacing chat with generated OpenUI app | High | Would worsen ownership sprawl and discard DevBridge-specific FastAPI stream/session/model metadata. | Use OpenUI as renderer/spike only; preserve extracted DevBridge transport/session/prompt boundaries. |
| GSAP scattered across components | High | Direct component-level timelines can become new spaghetti and leak on route transitions. | Add a small motion adapter/tokens layer; require cleanup/reduced-motion in every hook. |
| Dual animation systems (`motion` + GSAP) | Medium | Existing `motion` dep plus GSAP can create inconsistent semantics and bundle cost. | Define GSAP as new canonical motion for v1.1 chat surfaces; defer old `motion` cleanup to explicit consolidation. |
| servercn stack drift | High | servercn primarily targets Node/Express; DevBridge backend is FastAPI. | Use docs/CLI view as pattern research only; do not add Express/ORM/auth dependencies. |
| OpenUI generative UI safety | High | Renderer supports actions/tools; arbitrary tool exposure could mutate repo or user data. | Allowlist actions, validate payloads, keep destructive operations out of OpenUI toolProvider. |
| Prompt growth from OpenUI Lang | Medium | System prompt component specs compete with 48K context cap. | Generate minimal component library; use OpenUI only for compact artifact surfaces, not every answer. |
| SSE adapter mismatch | High | OpenUI stream protocols include OpenAI/raw/readable stream variants; DevBridge emits custom metadata/chunk/source/done events. | Keep `useChatStreamTransport` canonical; adapt only final content/artifact payload after protocol parsing. |

## What Not To Add

- Do **not** add Express, Drizzle, Prisma, Mongoose, Passport, or `servercn` foundations to the production app for v1.1.
- Do **not** initialize servercn in repo root unless a dedicated spike/branch intentionally wants `servercn.config.json`.
- Do **not** add another chat state manager before extracting current ownership boundaries.
- Do **not** replace FastAPI `/chat/stream` with a Next.js OpenAI route handler; existing AI orchestration, metadata, persistence, and auth live behind FastAPI.
- Do **not** expose OpenUI `toolProvider` as a generic backend proxy.
- Do **not** import OpenUI global styles into `app/layout.tsx` until visual regressions against current Tailwind/shadcn-like primitives are reviewed.
- Do **not** keep both duplicated file tree implementations after the chat rebuild; component exploration must reduce tree code, not add a third renderer.
- Do **not** add Cloudinary/ImageKit upload components from servercn; current problem is oversized local upload abstraction, not missing upload provider.
- Do **not** add Redis/RQ/new queue tech for chat liveness; thermo asks for watchdogs/budgets, not a transport rewrite.

## Sources

- Project context: `.planning/PROJECT.md`, `.planning/THERMO-NUCLEAR-REVIEW.md`, `.planning/THERMO-COVERAGE-MATRIX.md`, `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md`.
- GSAP official docs: `https://gsap.com/docs/v3/GSAP/` — v3.15 docs, `npm install gsap`, timelines/tweens/control methods.
- GSAP Context7: `/websites/gsap_v3` — install, React/useGSAP mention, context cleanup/matchMedia notes.
- OpenUI docs: `https://www.openui.com/docs/openui-lang`, `/quickstart`, `/renderer`, `/system-prompts`, `/docs/chat/installation`, `/docs/chat/api-contract`, `/docs/chat/nextjs`.
- servercn docs: `https://servercn.vercel.app/docs/`, `/docs/cli/commands`, `/docs/express/components/env-config`, `/docs/express/components/health-check`.
- npm verification on 2026-05-29: `gsap@3.15.0`, `@gsap/react@2.1.2`, `@openuidev/cli@0.0.7`, `@openuidev/react-ui@0.11.8`, `@openuidev/react-lang@0.2.6`, `servercn-cli@2.0.5`; `@openuidev/react` returned 404.
