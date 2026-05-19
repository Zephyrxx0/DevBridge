# Phase 31: Memory Curation Dashboard - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 6
**Analogs found:** 5 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/routes/memory.py` | route | request-response | `api/routes/admin.py` | exact |
| `web/src/app/dashboard/memory/page.tsx` | page | request-response | `web/src/app/repo/[id]/admin/page.tsx` | exact |
| `web/src/app/dashboard/layout.tsx` | layout | static | `web/src/app/dashboard/layout.tsx` | modification |
| `api/main.py` | config | app-startup | `api/main.py` | modification |
| `web/src/lib/api-client.ts` | utility | request-response | N/A (Direct fetch) | no-analog |
| `api/tests/test_phase31_memory.py` | test | batch | `tests/test_admin_auth.py` | role-match |

## Pattern Assignments

### `api/routes/memory.py` (route, request-response)

**Analog:** `api/routes/admin.py`

**Imports and Auth pattern** (lines 1-35):
```python
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from api.routes.admin import verify_admin
from api.db.hindsight import hindsight_db

router = APIRouter()

# Use verify_admin dependency for all curation routes
@router.get("/list")
async def list_memories(user_id: str = Depends(verify_admin)):
    client = hindsight_db._client
    if not client:
        raise HTTPException(status_code=503, detail="Memory service unavailable")
    # ...
```

**CRUD pattern** (Logic derived from RESEARCH.md and Hindsight API):
```python
@router.delete("/{memory_id}")
async def delete_memory(memory_id: str, user_id: str = Depends(verify_admin)):
    client = hindsight_db._client
    # bank_id is mapped to user_id
    await client.delete_document(bank_id=user_id, document_id=memory_id)
    return {"status": "deleted"}
```

---

### `web/src/app/dashboard/memory/page.tsx` (page, request-response)

**Analog:** `web/src/app/repo/[id]/admin/page.tsx`

**State and Fetching pattern** (lines 62-100):
```typescript
const [state, setState] = useState<AccessState>("loading");
const [memories, setMemories] = useState<Memory[]>([]);
const apiBase = "/api/backend";

useEffect(() => {
  async function loadMemories() {
    const response = await fetch(`${apiBase}/memory/list`);
    if (response.status === 401 || response.status === 403) {
      setState("denied");
      return;
    }
    // ... handling
  }
  loadMemories();
}, []);
```

**Skeleton Loading pattern** (lines 145-160):
```typescript
{state === "loading" && (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    ))}
  </div>
)}
```

---

### `api/tests/test_phase31_memory.py` (test, batch)

**Analog:** `tests/test_admin_auth.py`

**App Mocking pattern** (lines 45-55):
```python
def _build_memory_app(monkeypatch: pytest.MonkeyPatch, row: dict[str, object] | None) -> TestClient:
    app = FastAPI()
    app.include_router(memory_router, prefix="/memory")
    monkeypatch.setattr("api.routes.admin.get_engine", lambda: _FakeEngine(row))
    return TestClient(app)
```

**Auth Test pattern** (lines 58-65):
```python
def test_list_memories_unauthorized(monkeypatch: pytest.MonkeyPatch):
    client = _build_memory_app(monkeypatch, row={"is_admin": False})
    response = client.get("/memory/list", headers={"X-User-Id": "some-uid"})
    assert response.status_code == 403
```

## Shared Patterns

### Admin Authentication
**Source:** `api/routes/admin.py`
**Apply to:** All endpoints in `api/routes/memory.py`
```python
async def verify_admin(request: Request, x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    # ... checks users table for is_admin flag ...
```

### Dashboard UI Cards
**Source:** `web/src/app/dashboard/page.tsx`
**Apply to:** Memory grid layout
```typescript
<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {memories.map((memory) => (
    <Card key={memory.id} className="...">
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>
      <CardFooter>...</CardFooter>
    </Card>
  ))}
</div>
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `web/src/lib/api-client.ts` | utility | request-response | Codebase prefers direct `fetch` with `/api/backend` prefix in components or proxying. |

## Metadata

**Analog search scope:** `api/routes/`, `web/src/app/dashboard/`, `web/src/app/repo/[id]/admin/`, `tests/`
**Files scanned:** 15
**Pattern extraction date:** 2026-05-20
