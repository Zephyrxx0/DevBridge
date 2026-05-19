# Phase 29: Memory Storage & Foundations - Pattern Map

**Mapped:** 2024-05-19
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/agents/graph.py` | controller | request-response | `api/agents/graph.py` | exact (mod) |
| `api/agents/state.py` | model | request-response | `api/agents/state.py` | exact (mod) |
| `api/db/hindsight.py` | service | CRUD | `api/db/vector_store.py` | role-match |
| `sql/migrations/0032_create_hindsight_schema.sql` | migration | CRUD | `sql/migrations/0016_add_cache_table.sql` | exact |
| `api/tests/test_phase29_memory.py` | test | request-response | `tests/test_jobs.py` | role-match |

## Pattern Assignments

### `api/agents/graph.py` (controller, request-response)

**Analog:** `api/agents/graph.py`

**Imports pattern** (lines 1-8):
```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from api.agents.nodes.big import big_worker_node
from api.agents.nodes.fast import fast_worker_node
from api.agents.nodes.router import intent_classifier
from api.agents.state import AgentState
```

**Graph Construction pattern** (lines 10-21):
```python
builder = StateGraph(AgentState)
builder.add_node("router", intent_classifier)
builder.add_node("fast_worker", fast_worker_node)
builder.add_node("big_worker", big_worker_node)

builder.add_edge(START, "router")
builder.add_conditional_edges("router", lambda x: x["next"])
builder.add_edge("fast_worker", END)
builder.add_edge("big_worker", END)

graph = builder.compile(checkpointer=MemorySaver())
```

---

### `api/agents/state.py` (model, request-response)

**Analog:** `api/agents/state.py`

**Core Pattern** (lines 1-11):
```python
import operator
from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    next: str
    fallback: bool
```

---

### `api/db/hindsight.py` (service, CRUD)

**Analog:** `api/db/vector_store.py`

**Imports and Singleton pattern** (lines 1-20, 240):
```python
import logging
import inspect
import asyncio
from typing import List, Optional, Dict, Any
from api.core.config import settings

logger = logging.getLogger(__name__)

class HindsightManager: # Derived from VectorStoreManager pattern
    def __init__(self):
        self._client: Optional[Any] = None

    def initialize(self) -> bool:
        # Client initialization logic with error handling
        try:
            # ... initialization logic ...
            logger.info("Hindsight client initialized successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Hindsight: {e}")
            return False

# Singleton
hindsight_db = HindsightManager()
```

---

### `sql/migrations/0032_create_hindsight_schema.sql` (migration, CRUD)

**Analog:** `sql/migrations/0016_add_cache_table.sql`

**SQL Pattern** (lines 1-8):
```sql
-- Comment describing the migration
CREATE TABLE IF NOT EXISTS table_name (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Index pattern
CREATE INDEX IF NOT EXISTS idx_name ON table_name (column);
```

---

### `api/tests/test_phase29_memory.py` (test, request-response)

**Analog:** `tests/test_jobs.py`

**Async Test and Mocking pattern** (lines 140-155):
```python
@pytest.mark.asyncio
async def test_job_scheduling(monkeypatch: pytest.MonkeyPatch) -> None:
    manager = SchedulerManager()
    called = {"added": False}

    def fake_add_job(*_args, **kwargs):
        called["added"] = True
        return SimpleNamespace(id="x")

    monkeypatch.setattr(manager.scheduler, "add_job", fake_add_job)
    # ... test execution ...
    assert called["added"] is True
```

## Shared Patterns

### Singleton Initialization
**Source:** `api/db/vector_store.py`
**Apply to:** `api/db/hindsight.py`
```python
# Create a manager class with an initialize() method and export a singleton instance.
class [Name]Manager:
    def __init__(self):
        self._client = None
    def initialize(self):
        ...
[name]_db = [Name]Manager()
```

### LangGraph Node Integration
**Source:** `api/agents/graph.py`
**Apply to:** `api/agents/graph.py`
```python
# Nodes are added to the builder and connected via edges/conditional_edges.
builder.add_node("node_name", node_func)
builder.add_edge(START, "first_node")
```

### Background Job Offloading
**Source:** `api/core/scheduler.py` & `api/main.py`
**Apply to:** `api/db/hindsight.py` or wherever `reflect()` is triggered.
```python
# Use SchedulerManager to add non-blocking background jobs.
scheduler_manager.add_job(
    func,
    trigger="date", # or other triggers
    run_date=datetime.now(),
    id="job_id"
)
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| N/A | | | All files have reasonable analogs in the codebase. |

## Metadata

**Analog search scope:** `api/agents/`, `api/db/`, `sql/migrations/`, `tests/`
**Files scanned:** 12
**Pattern extraction date:** 2024-05-19
