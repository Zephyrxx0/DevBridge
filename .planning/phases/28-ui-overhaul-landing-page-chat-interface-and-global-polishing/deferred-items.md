## Deferred Items (Plan 28-07)

- `web/src/components/ai-elements/attachments.tsx`: pre-existing type error (`openDelay` prop typing) blocks full `npm run build`.
- Playwright webServer resolves from workspace root and fails module resolution for `tw-animate-css` at root-level node_modules lookup; static lint/build probes used for task validation instead.
