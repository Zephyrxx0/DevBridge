## Deferred Items

- 2026-04-27: `web/src/app/repo/[id]/page.tsx` TypeScript error blocks full `npm run build` verification during plan 15-01.
  - Error: `Type 'number' must have a '[Symbol.iterator]()' method` at `useState<Message["sources"]?.[0] | null>(null)`.
  - Scope: pre-existing, unrelated to files changed in 15-01 (`layout.tsx`, `globals.css`).
  - Action: deferred to later plan that edits repo workspace page.
