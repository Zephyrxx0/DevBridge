# Coding Conventions

**Analysis Date:** 2026-05-20

## Naming Patterns

**Files:**
- React component files use PascalCase for feature components: `web/src/components/chat/ChatStream.tsx`, `web/src/components/onboarding/OnboardingGuide.tsx`.
- UI primitive files use kebab-case: `web/src/components/ui/button.tsx`, `web/src/components/ui/context-menu.tsx`.
- Next.js route files follow App Router conventions: `web/src/app/page.tsx`, `web/src/app/repo/[id]/page.tsx`, `web/src/app/auth/callback/route.ts`.
- Python backend files use snake_case: `api/routes/chats.py`, `api/core/config.py`, `api/utils/tokenizer.py`.

**Functions:**
- TypeScript/React functions use camelCase: `countTreeFiles`, `detectLanguage`, `createSession` in `web/src/app/repo/[id]/page.tsx`.
- React components use PascalCase function names and default export for page components: `RootLayout` in `web/src/app/layout.tsx`, `RepoWorkspacePage` in `web/src/app/repo/[id]/page.tsx`.
- Python functions use snake_case: `stream_graph_events`, `_resolve_repo_uuid` in `api/routes/chats.py`; `_extract_metadata` in `api/main.py`.

**Variables:**
- Local variables are camelCase in frontend (`apiUrl`, `activeSessionId`, `selectedBranch` in `web/src/app/repo/[id]/page.tsx`).
- Module constants are UPPER_SNAKE_CASE in Python (`BIG_MODEL`, `FAST_MODEL` in `api/utils/tokenizer.py`).

**Types:**
- Frontend alias/type objects use PascalCase (`Message`, `SourceReference`, `SnippetChip` in `web/src/components/chat/types.ts`, imported in `web/src/app/repo/[id]/page.tsx`).
- Python request bodies are `BaseModel` classes with PascalCase (`ChatSessionCreate`, `InferenceContextRequest` in `api/routes/chats.py`).

## Code Style

**Formatting:**
- Frontend formatting style is Prettier-like (double quotes, semicolons, trailing commas in multiline objects), enforced implicitly by repository style examples in `web/src/app/layout.tsx` and `web/src/app/repo/[id]/page.tsx`.
- UI primitive subtree has files without semicolons in some modules (`web/src/components/ui/button.tsx`, `web/src/lib/utils.ts`), indicating mixed formatting source style.
- No dedicated Prettier config detected in repo root or `web/` (`.prettierrc*` / `prettier.config.*` not detected).

**Linting:**
- Use ESLint flat config in `web/eslint.config.mjs`.
- Baseline rules come from Next presets: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` in `web/eslint.config.mjs`.
- Keep ignores aligned with config (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`).

## Import Organization

**Order:**
1. External packages first (`next/*`, `react`, vendor libs) in `web/src/app/layout.tsx`, `web/src/app/repo/[id]/page.tsx`.
2. Internal aliases via `@/` next (`@/components/*`, `@/lib/utils`, `@/contexts/*`).
3. Type imports are grouped with normal imports, with `import type` used selectively (`web/src/app/layout.tsx`, `web/src/app/repo/[id]/page.tsx`).

**Path Aliases:**
- Use `@/*` alias mapped to `./src/*` in `web/tsconfig.json`.
- Prefer `@/` imports in frontend modules and tests (`web/src/components/chat/__tests__/ChatStream.test.tsx`).

## Error Handling

**Patterns:**
- Frontend async flows use `try/finally` for loading flags and `try/catch` where user-facing continuation needed (`loadSessions`, `loadMessages`, `renameChat`, `deleteChat` in `web/src/app/repo/[id]/page.tsx`).
- Backend API routes raise `HTTPException` with explicit status codes and service-unavailable wrappers (`api/routes/chats.py`).
- Lower-level backend utilities log and degrade gracefully for non-critical failures (`_dispatch_reflection_task` and `_embed_issue` in `api/main.py`; exception fallback in `api/utils/tokenizer.py`).

## Logging

**Framework:** logging + console

**Patterns:**
- Backend uses module logger (`logger = logging.getLogger(__name__)`) and structured exception logging (`api/main.py`, `api/utils/tokenizer.py`).
- Frontend uses `console.error` for UI-side action failures (`renameChat`, `deleteChat` in `web/src/app/repo/[id]/page.tsx`).

## Comments

**When to Comment:**
- Use short operational comments for constraints/integration points (Windows event loop compatibility in `api/main.py:45-47`; branch-loading non-critical note in `web/src/app/repo/[id]/page.tsx:256-257`).

**JSDoc/TSDoc:**
- Minimal in frontend runtime files.
- Python docstrings appear for key utility behavior (`_extract_metadata` in `api/main.py`, `enforce_cap` in `api/utils/tokenizer.py`).

## Function Design

**Size:**
- Keep UI logic in hooks/helpers when possible; large route page file exists (`web/src/app/repo/[id]/page.tsx`) and should be extended via extracted functions/components, not by adding more inline logic.

**Parameters:**
- Use typed object payloads for API boundaries (`ChatSessionCreate`, `ChatMessageCreate`, `InferenceContextRequest` in `api/routes/chats.py`).
- Use explicit primitive parameters for helper utilities (`stream_graph_events(message, thread_id, user_id)` in `api/routes/chats.py`).

**Return Values:**
- Frontend helper functions return concrete primitives (`countTreeFiles` returns `number` in `web/src/app/repo/[id]/page.tsx`).
- Backend helpers return typed tuple/object forms (`enforce_cap(...) -> tuple[list, bool]` in `api/utils/tokenizer.py`).

## Module Design

**Exports:**
- Frontend UI modules commonly use named exports (`Button`, `buttonVariants` in `web/src/components/ui/button.tsx`).
- App route modules use default export page component (`web/src/app/page.tsx`, `web/src/app/repo/[id]/page.tsx`).
- Backend modules expose route-level `router` and helper functions (`api/routes/chats.py`).

**Barrel Files:**
- Not detected as dominant pattern in inspected frontend/backend paths.

## Model Naming Convention Drift (Quality Risk)

- Model labels now standardized on AI Studio names in tests and runtime:
  - Fast: `gemma-4-26b-a4b-it`
  - Big: `gemini-2.5-flash`
- Runtime defaults updated to `model_type="gemini"` in `api/routes/chats.py` + `api/utils/tokenizer.py`.

---

*Convention analysis: 2026-05-20*
