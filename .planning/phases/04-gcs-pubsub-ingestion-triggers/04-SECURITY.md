---
phase: 04
slug: gcs-pubsub-ingestion-triggers
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-24
---

# Phase 04 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| GCS event source -> Pub/Sub transport | Untrusted storage event payload enters messaging fabric | bucket/object identifiers, event metadata |
| Pub/Sub/Eventarc -> Cloud Run ingestion runtime | External event payload triggers ingestion code path | message body, attributes, retry metadata |
| Ingestion runtime -> Database persistence | Parsed source chunks are written to persistent store | source content, chunk metadata, error metadata |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Tampering / Replay | api/ingest/trigger.py | mitigate | Idempotency gate checks existing records (`repo`, `file_path`) before insert; duplicate delivery returns `skipped` instead of duplicate writes. | closed |
| T-04-02 | Denial of Service | infra/pubsub/topics.tf | mitigate | Subscription includes retry policy and dead-letter policy with bounded delivery attempts (`max_delivery_attempts = 5`) to prevent infinite poison-message loops. | closed |
| T-04-03 | Information Disclosure / Privilege Abuse | infra/gcs/bucket.tf, infra/cloudrun/trigger.tf | mitigate | Bucket uses uniform bucket-level access; Eventarc trigger uses explicit service account binding. Access path is constrained to IAM-controlled service identity. | closed |
| T-04-04 | Denial of Service | api/ingest/trigger.py | accept | 50MB file-size guard from phase context is not yet enforced in handler. Risk accepted temporarily until Phase 05 hardening introduces object-size precheck before download/chunking. | closed |

Status values: open, closed
Disposition values: mitigate, accept, transfer

## Accepted Risks Log

| Risk ID | Description | Why Accepted | Sunset Condition |
|---------|-------------|--------------|------------------|
| AR-04-01 | Missing explicit 50MB object-size gate before download/chunking | Current phase scope prioritized trigger wiring and idempotent persistence; no production rollout gate tied to this phase yet | Replace with enforced size precheck and integration test in next hardening phase |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-24 | 4 | 4 | 0 | GitHub Copilot (gsd-secure-phase) |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

Approval: verified 2026-04-24
