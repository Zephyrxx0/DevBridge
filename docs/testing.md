# Testing

## Backend tests

Run full suite:

```powershell
python -m pytest tests -q
```

Targeted examples:

```powershell
python -m pytest tests/test_startup_import.py -q
python -m pytest tests/test_secrets.py tests/test_vector_db.py -q
python -m pytest tests/test_phase07_e2e_history.py -q
```

## Frontend tests

```powershell
cd web
npm run test:e2e
```

## Expected smoke checks

- `GET http://localhost:8000/` returns `status: online`.
- chat endpoint works with mock mode when no API key.
- streaming endpoint emits valid SSE chunk events.

## Quality tool

`fallow` checks dead code, complexity, duplication:

```powershell
npx --yes fallow --production
```
