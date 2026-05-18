---
phase: 26
slug: admin-dashboard
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-16
updated: 2026-05-16
---

# Phase 26 - Security

Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Testing | Local test execution only | Test fixtures and local runtime state |
| Client -> API | Admin access control boundary | Auth context, repo identifiers |
| User -> UI | Content rendering boundary | Markdown report payloads |
| client -> admin API | Untrusted caller attempting privileged report access | HTTP headers and auth claims |
| app auth context -> DB role check | User identity must map to `users.is_admin` truth source | User id and role state |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-26-00-1 | Tampering | Tests | accept | Internal boundary accepted as non-production risk | closed |
| T-26-01-1 | Elevation of Privilege | Admin API | mitigate | `verify_admin` dependency enforced for admin endpoints in `api/routes/admin.py` | closed |
| T-26-01-2 | Information Disclosure | ReportsHub | mitigate | Path sanitization and filename guard in hub/route handling | closed |
| T-26-02-1 | Information Disclosure | Frontend | mitigate | Server-side auth enforcement on admin report endpoints | closed |
| T-26-03-01 | Elevation of Privilege | `api/routes/admin.py::verify_admin` | mitigate | Removed header-based bypass; DB `is_admin` required | closed |
| T-26-03-02 | Information Disclosure | `/admin/repo/{repo_id}/reports` | mitigate | Strict `verify_admin` dependency chain + regression bypass denial test | closed |

Status: open / closed
Disposition: mitigate / accept / transfer

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-26-01 | T-26-00-1 | Test scaffolding runs in local/internal boundary and does not expose production surfaces | phase-security-audit | 2026-05-16 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-16 | 6 | 6 | 0 | gsd-security-auditor + orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

Approval: verified 2026-05-16
