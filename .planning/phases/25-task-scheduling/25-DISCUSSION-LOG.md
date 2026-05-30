# Phase 25: Task Scheduling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 25-Task-Scheduling
**Areas discussed:** Scheduling Strategy, Cloud Run Execution, Failure Handling, Concurrency Control, Job Inventory

---

## Scheduling Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| In-Memory (Code-defined) | Easier to implement, runs on startup, resets on restart. | |
| Persistent (DB-backed) | Allows dynamic job management, survives restarts, needs DB table. | ✓ |

**User's choice:** Persistent (DB-backed)
**Notes:** User wants job definitions to survive restarts and support dynamic management.

---

## Cloud Run Execution

| Option | Description | Selected |
|--------|-------------|----------|
| Internal APScheduler | Simpler, but requires 'always-on' CPU and might double-run on scale. | ✓ |
| Cloud Scheduler + Webhook | Reliable for serverless, but adds external infrastructure dependency. | |

**User's choice:** Internal APScheduler
**Notes:** User asked about dependencies for Cloud Scheduler but ultimately decided to stick with the internal APScheduler as defined in FR-05.

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Log and Continue | Simple logs, fix issues manually when they arise. | |
| Audit Table + Retry Logic | Track job history in a DB table for visibility and retries. | ✓ |

**User's choice:** Audit Table + Retry Logic
**Notes:** User wants a history of job executions and retry capabilities, which will be useful for a future admin dashboard.

---

## Concurrency Control

| Option | Description | Selected |
|--------|-------------|----------|
| No Locking (Single Instance Only) | Simplest, but jobs will run on every instance. | |
| Distributed Locking (DB-based) | Use a lock (e.g. in Postgres) to ensure only one instance runs a job. | ✓ |

**User's choice:** Distributed Locking (DB-based)
**Notes:** Decided to use Postgres-based locking to handle multi-instance Cloud Run scaling.

---

## Job Inventory

**User's selection:** Report generation (daily, weekly), reports hub.
**Notes:** Added report generation and a hub for accessing those reports to the core list of jobs.

---

## Claude's Discretion

- Specific schema for the `job_history` and `repo_reports` tables.
- Selection of libraries for distributed locking (e.g. `python-redis-lock` if we had redis, but here we will likely use a custom Postgres-based implementation).

---

## Deferred Ideas

- Webhook-driven real-time sync (Phase 24 deferred this as well).
- Advanced UI for real-time job monitoring (basic hub implementation for now).
