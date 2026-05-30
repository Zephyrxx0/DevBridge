---
phase: 03
slug: code-parsing-with-tree-sitter
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-18
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Repo file system -> Ingestion discovery | Untrusted repository content is selected for parsing | Source code text, file paths |
| Parser runtime -> Chunk metadata | Parser output and parse errors are transformed into persisted chunk payloads | Symbol metadata, parse diagnostics |
| Ingestion pipeline -> Downstream indexing | Chunk outputs are handed to later phases for embedding/indexing | Chunk content and metadata |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Information Disclosure / Tampering | `api/ingestion/discovery.py` | mitigate | Restrict parse scope to `api/**/*.py` and `web/src/**/*.ts(x)` and exclude vendor/generated directories (`node_modules`, `.next`, `dist`, `build`, `.venv`, `venv`, `__pycache__`). Verified in discovery implementation and `test_file_discovery_scope_filters`. | closed |
| T-03-02 | Denial of Service | `api/ingestion/tree_sitter_chunker.py` | mitigate | Parsing failures are contained via `_fallback_chunks` so malformed input does not halt ingestion; chunks emitted with fallback mode and error metadata. Verified by `test_hybrid_fallback_on_parse_failure`. | closed |
| T-03-03 | Information Disclosure | `api/ingestion/tree_sitter_chunker.py` | mitigate | Error messages are normalized and truncated (`str(error).strip()[:240]`) before inclusion in chunk metadata to limit leakage of excessive runtime details. Verified by fallback tests and code inspection. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-18 | 3 | 3 | 0 | GitHub Copilot (gsd-secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-18
