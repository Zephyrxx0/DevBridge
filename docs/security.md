# Security

## Current controls

- GitHub webhook HMAC verification (`x-hub-signature-256`).
- Internal forwarded identity protection:
  - shared internal token check.
  - trusted proxy IP gate.
- Annotation edit/delete ownership enforcement.
- Secret source fallback strategy (Secret Manager -> env).

## Sensitive configuration

Never commit:

- `.env`
- service account JSON keys
- DB credentials
- webhook secrets

## Hardening recommendations

- Rotate webhook and internal auth secrets regularly.
- Keep CORS allowlist strict; no wildcard origins in prod.
- Restrict `TRUSTED_PROXY_IPS` to real ingress addresses.
- Add request rate limiting for public endpoints.
- Add authN/authZ layer for chat and PR endpoints in prod.

## Security test entry

- `api/tests/security/test_vulnerabilities.py`
- `scripts/security_scan.sh`
