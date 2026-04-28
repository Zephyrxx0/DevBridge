# Operations

## Observability and checks

- Health endpoint: `GET /`.
- Worker/ingestion logs from runtime.
- Manual graph refresh after code changes:

```powershell
graphify update .
```

## Developer tools in repo

- `fallow`: code health.
- `graphify`: codebase graph + relationship queries.
- `entire`: session/checkpoint integrations on hooks.

## Common runbook items

- Chat failure: inspect backend logs and model credentials.
- Stream failure: verify SSE path and proxy buffering headers.
- Missing annotations: verify DB pool initialization and auth context header flow.
- Webhook ignored: verify event type/action and signature configuration.

## Docs maintenance

Update this site when changing:

- route contracts (`api/routes/*`)
- data schema (`sql/migrations/*`)
- orchestrator/retrieval strategy (`api/agents/*`, `api/ingestion/*`)
- frontend route map (`web/src/app/*`)
