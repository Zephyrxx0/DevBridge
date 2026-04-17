# Phase 02: Data Foundation & Secret Management - Context

**Gathered:** 2026-04-17
**Status:** Decisions Locked
**Source:** ROADMAP.md + User Discussion (2026-04-17)

<domain>
## Phase Boundary

This phase establishes the bedrock for data persistence and security. It will set up mechanisms to:
1. Store vector representations of code robustly so the Orchestrator can perform semantic search.
2. Securely store and retrieve API keys, moving away from local `.env` files where possible to ensure cloud safety.

Deliverables:
- Supabase Integration: Configuration and setup of `pgvector`.
- GCP Secret Manager Integration: Securely access `SUPABASE_CONNECTION_STRING` and other sensitive parameters at runtime.
- SQL Scripts: Provide manual setup for database extensions and tables.
</domain>

<decisions>
## Implementation Decisions

### Vector Database
- [Locked] Supabase with `pgvector` enabled.
- [Decision] Manual SQL Setup: Provide `sql/setup_vector_store.sql` for the user to run manually in Supabase.
- [Decision] Integration Timing: Deferred wiring of the `code_search` tool in the orchestrator to Phase 5. Phase 2 will focus on connection logic and TODO markers.

### API Keys / Secrets
- [Locked] Google Cloud Secret Manager.
- [Decision] Identifier: Use `SUPABASE_CONNECTION_STRING` as the secret ID in GCP.
- [Decision] Environment Logic: Prioritize GCP Secret Manager via the `google-cloud-secret-manager` client, but maintain a robust local `.env` fallback as secrets are not yet fully configured in the cloud.

### Tooling & Dependencies
- [Decision] Update `requirements.txt` to include `google-cloud-secret-manager`, `langchain-postgres`, and `psycopg[binary]`.

</decisions>

<canonical_refs>
## Canonical References

### Planning
- [ROADMAP.md](file:///d:/Codes/Personal/DevBridge/.planning/ROADMAP.md) — Current state of Phase 2 progress.

</canonical_refs>

---
*Phase: 02-data-foundation-secrets-management*
*Context updated: 2026-04-17*
