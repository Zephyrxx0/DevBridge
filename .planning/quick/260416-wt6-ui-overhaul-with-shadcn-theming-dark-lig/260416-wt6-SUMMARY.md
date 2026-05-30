# Quick Win: UI Overhaul and Backend Lazy Init

## Overview
Successfully overhauled the frontend Chat UI with shadcn/ui components, integrated Next-Themes for dark/light mode toggling, and fixed the backend crash by implementing a mock LLM fallback when GCP credentials are not present.

## Completed Tasks
- **Task 1: UI Overhaul with shadcn theming and dark/light mode**
  - Integrated `button`, `card`, `input`, `textarea`, `avatar`, and `dropdown-menu` from shadcn/ui.
  - Implemented `theme.css` using CSS variables for robust dark/light mode theming based on `next-themes`.
  - Restructured `page.tsx` into a modern chat layout with user/bot avatars, smooth transitions, and distinct message bubbles.
  - Updated `layout.tsx` to mount the `ThemeProvider` to prevent flash of unstyled content.

- **Task 2: Backend GCP lazy init with mock fallback**
  - Refactored `api/agents/orchestrator.py` to prevent import-time exceptions due to missing GCP credentials.
  - Implemented a `get_llm()` lazy loader that falls back to a `MockLLM` instance when `GOOGLE_APPLICATION_CREDENTIALS` is unset and Application Default Credentials (ADC) are unavailable.
  - Verified mock fallback works seamlessly through the React agent graph.

## Verification
- Frontend builds cleanly (`npm run build --prefix web` succeeds).
- Backend imports successfully and runs without crash when initialized without GCP credentials.
