# Phase 04: GCS & Pub/Sub Ingestion Triggers - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers event-driven code ingestion using Google Cloud Storage (GCS) for code snapshots and Cloud Pub/Sub for triggering Cloud Run Job ingestion flows.

In scope:
- Setup GCS bucket for code snapshots.
- Implement Pub/Sub triggered Cloud Run Job flow for code ingestion.

Out of scope for this phase:
- Direct chunking logic (completed in Phase 03).
- Vector indexing and search (Phase 05).
- Chat interface (Phase 06).

</domain>

<decisions>
## Implementation Decisions

### Cloud Storage
- **D-01:** Use a dedicated GCS bucket for code snapshots with versioning enabled.
- **D-02:** Bucket naming follows `{project_id}-code-snapshots` pattern.

### Event Triggers
- **D-03:** Use GCS `google.storage.object.finalize` event to trigger ingestion.
- **D-04:** Pub/Sub topic subscribes to GCS event notifications.
- **D-04a:** Use **push subscription** — Cloud Run receives messages sent by Pub/Sub (simpler for serverless).
- **D-05:** Cloud Run Job consumes Pub/Sub messages and invokes ingestion pipeline.

### Ingestion Flow
- **D-06:** Cloud Run Job triggers on Pub/Sub message receipt.
- **D-07:** Job pulls code content from GCS bucket.
- **D-08:** Job invokes existing chunking logic from Phase 03.
- **D-09:** Job persists chunks to database.
- **D-10:** File size limit: **50MB** max (ingest only files under this limit).

### Infrastructure
- **D-11:** Push subscription model — Pub/Sub sends messages directly to Cloud Run.
- **D-12:** Dead-letter queue for messages that fail all retries.
- **D-13:** Exponential backoff: 10s → 600s retry intervals.

### the agent's Discretion
- ~~Exact bucket location (regional vs multi-region)~~ — DECIDED: regional us-central1
- ~~Pub/Sub push vs pull subscription model~~ — DECIDED: push subscription
- ~~Cloud Run Job memory/CPU allocation~~ — 1 vCPU, 512MiB default
- ~~Retry policy and dead-letter queue configuration~~ — DECIDED: exponential backoff 10s-600s, DLQ enabled

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase and Product Requirements
- `.planning/ROADMAP.md` - Phase 04 goal and milestone sequencing.
- `.planning/PROJECT.md` - Product context and ingestion design intent.
- `.planning/REQUIREMENTS.md` - Functional requirements for event-driven ingestion.

### Prior Phase Contexts
- `.planning/phases/03-code-parsing-with-tree-sitter/03-CONTEXT.md` - Code parsing logic to invoke from ingestion job.

### Cloud Infrastructure
- `.planning/phases/02-data-foundation-secrets-management/02-CONTEXT.md` - GCP Secret Manager patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/ingest/chunker.py`: Phase 03 chunking logic that this phase will invoke.
- `api/db/session.py`: Shared async engine for chunk persistence.
- `api/core/config.py`: Settings pattern for bucket/topic configuration.

### Integration Points
- Cloud Run Job should import and invoke the chunker module from Phase 03.
- Chunker output should persist via the existing database session.
- Configuration should follow Phase 02's settings patterns using Secret Manager.

</code_context>

<specifics>
## Specific Ideas

- Event-driven ingestion should be fully automated (no manual triggers).
- Cloud Run Job should handle failures gracefully with retries.
- Ensure idempotency in case of redelivered messages.
- **File size limit: 50MB** per file (will be refined after testing).

</specifics>

<deferred>
## Deferred Ideas

- Direct chunking from file upload API (not triggered).
- Multi-language source support beyond Python/TypeScript.
- Vector embedding during ingestion (Phase 05).

</deferred>

---

*Phase: 04-gcs-pubsub-ingestion-triggers*
*Context gathered: 2026-04-24*