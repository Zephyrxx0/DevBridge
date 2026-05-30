# Phase 31: Memory Curation Dashboard - Research

**Researched:** 2026-05-20
**Domain:** Memory Management & Curation
**Confidence:** HIGH

## Summary

Phase 31 implements a Memory Curation Dashboard at `/dashboard/memory`. This interface allows users to view, edit, and delete the agent's long-term memories stored via the Hindsight system. Memories are categorized into "Experiences" (agent history) and "World Facts" (objective knowledge). 

**Primary recommendation:** Use Hindsight's `embedded.memories.list` and `embedded.banks` namespaces for retrieval, and implement a new `api/routes/memory.py` to expose these operations to the frontend.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dashboard Sub-page:** The Memory Curation Dashboard will live at `/dashboard/memory`, integrated within the existing management/administrative structure.
- **Visual Cards:** Memories (Experiences and World Facts) will be presented as an expandable card grid. Each card will show semantic tags (e.g., "type: experience") and "Reflect" indicators where applicable.
- **Direct Text Edit:** User edits will trigger a direct database update of the memory text. This provides the simplest and fastest propagation for small corrections.

### the agent's Discretion
- Implementation of the backend endpoints (new `api/routes/memory.py` or existing `admin.py`).
- Exact UI layout and interaction patterns (Modal vs Sheet).

### Deferred Ideas (OUT OF SCOPE)
- None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEM-04 | User can curate and edit agent memory via a Memory Dashboard UI. | Verified Hindsight API support for listing and deleting memories/documents. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Memory Retrieval | API / Backend | Database | Hindsight client manages fetching from Supabase. |
| Memory Management | API / Backend | — | New endpoints for update/delete operations. |
| Dashboard UI | Browser / Client | — | Next.js page for viewing/editing memory cards. |
| Authentication | API / Backend | — | Reuse `verify_admin` or user-isolation patterns. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hindsight-all-slim | verified | Agent memory | Project's chosen biomimetic memory engine. |
| Shadcn UI | current | UI components | Existing design system in the project. |
| FastAPI | current | Backend API | Project's standard backend framework. |
| Next.js | 15.x | Frontend | Project's standard frontend framework. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| Lucide React | current | Icons | Icons for cards (Reflect, Experience, Fact). |
| api-client.ts | local | API communication | Existing client for REST calls. |

**Installation:**
```bash
# No new packages required; hindsight already in api/requirements.txt
```

## Architecture Patterns

### Recommended Project Structure
```
api/
├── routes/
│   └── memory.py       # New: Memory curation endpoints
web/src/app/dashboard/
└── memory/
    └── page.tsx        # New: Memory Dashboard UI
```

### Pattern 1: Bank-per-User Isolation
**What:** Each user has their own Hindsight `bank_id` (likely the `user_id`).
**When to use:** All memory operations must specify the `bank_id` to prevent cross-user leakage.
**Example:**
```python
# Backend check
memories = hindsight_db._client.memories.list(bank_id=user_id, type="world")
```

### Anti-Patterns to Avoid
- **Bulk Loading:** Avoid fetching all memories at once; use Hindsight's `limit` and `offset` for pagination.
- **Manual DB Edits:** Do not use direct SQL for memory edits; use Hindsight's API to ensure embeddings and entities remain synchronized if supported (otherwise, follow User Decision for Direct Text Edit with caution).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memory Retrieval | Custom SQL queries | `hindsight.memories.list` | Hindsight manages complex retrieval logic (networks). |
| Text Search | Custom search logic | `hindsight.recall` or `q` param | Hindsight supports semantic/keyword search. |

## Common Pitfalls

### Pitfall 1: Processing Latency
**What goes wrong:** Edits or deletions might not show up immediately if there is a processing queue.
**Why it happens:** Hindsight operations can be asynchronous.
**How to avoid:** Use optimistic UI updates or provide clear "Update in progress" indicators.

## Code Examples

### Listing Memories (Backend)
```python
# Using HindsightEmbedded (api/db/hindsight.py)
memories = hindsight_db._client.memories.list(bank_id=user_id, type="world", limit=50)
```

### Deleting Memory (Backend)
```python
# Deleting a document (source of memories)
await hindsight_db._client.delete_document(bank_id=user_id, document_id=doc_id)
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `hindsight_db._client.memories.update` exists for direct text edit. | Summary | If not, must use `retain` to overwrite or direct SQL. |
| A2 | `bank_id` corresponds directly to `user_id`. | Patterns | Metadata mismatch if another mapping is used. |

## Open Questions (RESOLVED)

1. **Direct Edit Support (RESOLVED):** Does Hindsight support updating raw text via API without re-ingesting? 
   - Implementation: Since the user decided on **Direct Text Edit**, the system will perform a direct SQL/Supabase update on the `text` field within the `hindsight` schema. This avoids the overhead of re-ingestion while meeting the "simplest propagation" requirement.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Hindsight | Memory Ops | ✓ | slim | — |
| Supabase (pgvector) | Storage | ✓ | — | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Quick run command | `pytest api/tests/test_phase31_memory.py` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEM-04 | User can delete memory | Integration | `pytest ...::test_memory_deletion` | ❌ Wave 0 |

## Sources

### Primary (HIGH confidence)
- `api/db/hindsight.py` - Codebase inspection
- Context7 `/vectorize-io/hindsight` - API documentation
- `31-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- Google Search - Hindsight logical schema details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in use.
- Architecture: HIGH - Follows existing dashboard patterns.
- Pitfalls: MEDIUM - Based on Hindsight's async nature.

**Research date:** 2026-05-20
**Valid until:** 2026-06-20
