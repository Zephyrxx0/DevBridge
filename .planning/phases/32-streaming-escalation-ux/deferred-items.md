# Deferred Items

## 2026-05-19 — Plan 32-01

- `web/src/components/ai-elements/inline-citation.tsx:53`
  - Existing unrelated Next.js type error blocks `npm run build --prefix web`:
    `Property 'closeDelay' does not exist on type 'IntrinsicAttributes & Props<unknown>'`.
  - Out-of-scope for Plan 32-01 files. Deferred to follow-up fix.

## 2026-05-20 — Plan 32-02

- `web/src/components/ai-elements/inline-citation.tsx:53`
  - Same pre-existing unrelated type error still blocks `npm run build --prefix web` during Task 1 verification.
  - Plan 32-02 task files verified via targeted Jest; global build issue remains deferred.
