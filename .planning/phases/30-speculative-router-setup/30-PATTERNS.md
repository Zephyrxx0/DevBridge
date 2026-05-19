# Phase 30: Speculative Router Setup - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5
**Analogs found:** 4 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/agents/nodes/cascade.py` | controller | request-response | `api/agents/nodes/fast.py` | exact (node) |
| `api/agents/utils/validation.py` | utility | transform | `api/db/onboarding_models.py` | role-match |
| `tests/test_phase30_routing.py` | test | batch | `tests/test_phase21_routing.py` | exact |
| `api/agents/graph.py` | controller | event-driven | `api/agents/graph.py` | self (modify) |
| `api/agents/nodes/router.py` | controller | request-response | `api/agents/nodes/router.py` | self (modify/deprecate) |

## Pattern Assignments

### `api/agents/nodes/cascade.py` (controller, request-response)

**Analog:** `api/agents/nodes/fast.py`

**Imports and Node pattern** (lines 1-10):
```python
import asyncio
from api.agents.state import AgentState
from api.agents.utils.llm import get_model
from api.core.config import settings

async def cascade_node(state: AgentState) -> dict:
    # Cascadeflow logic replaces the direct ainvoke
    # result = await cascade_agent.run(state["messages"])
    # return {"messages": [result]}
```

---

### `api/agents/utils/validation.py` (utility, transform)

**Analog:** `api/db/onboarding_models.py`

**Pydantic Schema pattern** (lines 17-30):
```python
from pydantic import BaseModel, Field

class ValidationSchema(BaseModel):
    """Schema for validating Fast model output."""
    content: str = Field(description="The primary response content")
    is_complete: bool = Field(default=True, description="Whether the response is complete")
```

---

### `tests/test_phase30_routing.py` (test, batch)

**Analog:** `tests/test_phase21_routing.py`

**Mocking and Async Test pattern** (lines 11-25):
```python
@pytest.mark.asyncio
async def test_escalation_path(monkeypatch):
    class FakeResponse:
        content = "MALFORMED"

    class FakeModel:
        async def ainvoke(self, _prompt):
            return FakeResponse()

    monkeypatch.setattr("api.agents.nodes.cascade.get_model", lambda is_fast: FakeModel())

    state = {"messages": [type("Msg", (), {"content": "complex query"})()]}
    # Test execution here
```

---

### `api/agents/graph.py` (controller, event-driven)

**Pattern: LangGraph Node Registration** (lines 68-75):
```python
builder = StateGraph(AgentState)
# ...
builder.add_node("cascade", cascade_node)
builder.add_node("big_worker", big_worker_node)
builder.add_node("retain", retain)

builder.add_edge(START, "recall")
builder.add_edge("recall", "cascade")
# Conditional edges removed if cascade handles its own escalation
# or keep big_worker for manual fallback
```

## Shared Patterns

### LangGraph Async Nodes
**Source:** `api/agents/nodes/fast.py`
**Apply to:** All new nodes in `api/agents/nodes/`
```python
async def node_name(state: AgentState) -> dict:
    # Logic
    return {"key": "value"}
```

### Pydantic Validation
**Source:** `api/db/onboarding_models.py`
**Apply to:** `api/agents/utils/validation.py`
```python
class MyModel(BaseModel):
    field: str = Field(...)
```

### LLM Monkeypatching
**Source:** `tests/test_phase21_routing.py`
**Apply to:** `tests/test_phase30_routing.py`
```python
monkeypatch.setattr("path.to.get_model", lambda is_fast: FakeModel())
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `cascadeflow` usage | engine | speculative-execution | Cascadeflow is a new library being introduced in this phase. |

## Metadata

**Analog search scope:** `api/agents/`, `api/db/`, `tests/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-20
