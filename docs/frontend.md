# Frontend

## Runtime stack

- Next.js 16 app router.
- React 19.
- Tailwind 4 + component primitives.
- Supabase SSR helpers for auth/session routing.

## Primary routes

- `/` landing page.
- `/dashboard` dashboard view.
- `/repo/[id]` repository workspace.
- `/signin` auth route.
- `/pricing`, `/profile` product/account routes.

## Core UI modules

- Layout/navigation: `navbar.tsx`, `floating-header.tsx`, `footer.tsx`.
- Repository interactions: `RepoConfig.tsx`, `add-repo-modal.tsx`.
- Visualization: `codebase-graph.tsx`, `hero-dithering-card.tsx`, backgrounds.
- UI primitives: `web/src/components/ui/*`.

## Data integration

- API calls from frontend target backend (`NEXT_PUBLIC_API_URL`).
- Supabase client/server helpers:
  - `web/src/utils/supabase/client.ts`
  - `web/src/utils/supabase/server.ts`
  - `web/src/utils/supabase/proxy.ts`

## Testing

- Playwright e2e test target in `web/tests/ingestion_loop.spec.ts`.
- Run via `npm run test:e2e` in `web/`.
