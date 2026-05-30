# Phase 31 Context: Memory Curation Dashboard

**Domain:** Users can view and manage the agent's long-term memory via a dashboard.

## Decisions

### Navigation
- **Dashboard Sub-page:** The Memory Curation Dashboard will live at `/dashboard/memory`, integrated within the existing management/administrative structure.

### Presentation
- **Visual Cards:** Memories (Experiences and World Facts) will be presented as an expandable card grid. Each card will show semantic tags (e.g., "type: experience") and "Reflect" indicators where applicable.

### Edit Path
- **Direct Text Edit:** User edits will trigger a direct database update of the memory text. This provides the simplest and fastest propagation for small corrections.

## Codebase Context
- **Reusable assets:** 
    - `web/src/components/ui/card.tsx` (Shadcn UI components)
    - `web/src/lib/api-client.ts` (for REST calls to backend)
    - `api/db/hindsight.py` (Manager for Hindsight logic)
- **Established patterns:** 
    - Dashboard layouts in `web/src/app/dashboard/`
    - Modal or Sheet based editing (see `web/src/components/add-repo-modal.tsx`)
- **Integration points:** 
    - `api/routes/admin.py` or a new `api/routes/memory.py` for curation endpoints.
    - `web/src/app/dashboard/layout.tsx` for sidebar navigation links.

## Canonical Refs
- None referenced.
