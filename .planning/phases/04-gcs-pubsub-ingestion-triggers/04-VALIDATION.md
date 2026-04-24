---
phase: 04
slug: gcs-pubsub-ingestion-triggers
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | pytest + static infrastructure checks |
| Config file | none |
| Quick run command | `.venv/Scripts/python.exe -m py_compile api/ingest/trigger.py` |
| Full suite command | `.venv/Scripts/python.exe -m pytest tests -q` |
| Estimated runtime | ~6 seconds |

## Sampling Rate

- After every task commit: run task-level static check from plan `<verify>` blocks.
- After every plan wave: run `.venv/Scripts/python.exe -m pytest tests -q`.
- Before verify-work: full suite must be green.
- Max feedback latency: 10 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | GCS snapshots bucket with versioning | T-04-01 | Bucket resource has versioning and uniform access controls in IaC | static | `Get-ChildItem infra/gcs -File` + grep check for `google_storage_bucket`/`versioning` | yes | green |
| 04-01-02 | 01 | 1 | Pub/Sub topic and subscription foundation | T-04-02 | Topic/subscription + DLQ policy declared in IaC | static | `Get-ChildItem infra/pubsub -File` + grep check for `google_pubsub_topic`/`google_pubsub_subscription`/`dead_letter_policy` | yes | green |
| 04-01-03 | 01 | 1 | GCS -> Pub/Sub notifications | T-04-03 | Notification resources are explicitly bound to topic | static | grep check for `google_storage_notification` in `infra/gcs/notifications.tf` | yes | green |
| 04-02-01 | 02 | 2 | Cloud Run Job configuration | T-04-04 | Job resource and env wiring are defined in IaC | static | `Get-ChildItem infra/cloudrun -File` + grep check for Cloud Run job resource markers | yes | green |
| 04-02-02 | 02 | 2 | Pub/Sub-triggered runtime execution path | T-04-05 | Eventarc trigger uses Pub/Sub publish event and topic filters | static | grep check for `google_eventarc_trigger` and `google.cloud.pubsub.messagePublished` | yes | green |
| 04-02-03 | 02 | 2 | Ingestion handler for GCS -> chunk -> persist | T-04-06 | Handler preserves idempotent insert path and structured error response | unit/smoke | `.venv/Scripts/python.exe -m py_compile api/ingest/trigger.py`; grep for `handle_pubsub_event`/`chunk_source`/idempotency SQL markers | yes | green |

Status key: pending, green, red, flaky

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

Pending in Terraform-enabled environment:
- `terraform validate`
- `terraform plan`

These are deployment-environment checks and do not invalidate Nyquist sampling coverage for code execution.

## Validation Sign-Off

- [x] All tasks have automated verify commands or static assertions.
- [x] Sampling continuity maintained (no long unverified task chain).
- [x] No watch-mode flags.
- [x] Feedback latency target met.
- [x] `nyquist_compliant: true` set.

Approval: approved 2026-04-24

## Validation Audit 2026-04-24

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validation Re-Audit 2026-04-24

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Cross-artifact confirmation:
- `04-UAT.md` exists with `status: complete` and `issues: 0`.
- `04-SECURITY.md` exists with `threats_open: 0`.
