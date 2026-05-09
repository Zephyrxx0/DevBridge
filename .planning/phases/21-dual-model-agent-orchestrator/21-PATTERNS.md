# Phase 21: Dual-Model Agent Orchestrator - Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 11
**Analogs found:** 9 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `api/agents/state.py` | model | request-response | N/A | new pattern |
| `api/agents/graph.py` | controller | request-response | `api/agents/orchestrator.py` | partial |
| `api/agents/nodes/router.py` | service | request-response | `api/agents/orchestrator.py` | partial |
| `api/agents/nodes/fast.py` | service | request-response | `api/agents/orchestrator.py` | partial |
| `api/agents/nodes/big.py` | service | request-response | `api/agents/orchestrator.py` | partial |
| `api/agents/utils/llm.py` | provider | request-response | `api/agents/orchestrator.py` | exact (get_llm) |
| `api/agents/utils/fallback.py` | utility | request-response | N/A | new pattern |
| `api/routes/chats.py` | route | request-response | `api/routes/chats.py` | exact |
| `api/main.py` | route | streaming | `api/main.py` | exact |
| `api/core/config.py` | config | N/A | `api/core/config.py` | exact |
| `tests/test_phase21_routing.py` | test | N/A | `tests/test_webhooks.py` | role-match |

## Pattern Assignments

### `api/agents/utils/llm.py` (provider, request-response)

**Analog:** `api/agents/orchestrator.py`

**Imports pattern** (lines 1-15):
```python
import os
import logging
from langchain_openai import ChatOpenAI
from api.core.config import settings
```

**LLM Factory pattern** (Refactoring `get_llm` from `orchestrator.py` lines 270-305):
```python
def get_model(is_fast: bool = True):
    port = settings.fast_model_port if is_fast else settings.big_model_port
    return ChatOpenAI(
        base_url=f"http://localhost:{port}/v1",
        api_key="local-dev", # vLLM doesn't require real key
        model="fast-model" if is_fast else "big-model",
        temperature=0.0 if is_fast else 0.7,
        max_tokens=256 if is_fast else 4096
    )
```

---

### `api/agents/nodes/big.py` (service, request-response)

**Analog:** `api/agents/orchestrator.py`

**Async Tool Call pattern** (lines 40-70):
```python
@tool
async def code_search(query: str):
    # ... logic from orchestrator.py ...
    try:
        results = await asyncio.wait_for(vector_db.hybrid_search(query, k=5), timeout=10.0)
        # ...
    except Exception as e:
        logger.error(f"Error in code_search: {e}")
```

**Node implementation pattern** (New for LangGraph, adapted from AI-SPEC):
```python
async def big_worker_node(state: AgentState):
    try:
        # Enforce static limit (D-04)
        result = await asyncio.wait_for(big_llm.ainvoke(state["messages"]), timeout=120)
        return {"messages": [result]}
    except (asyncio.TimeoutError, Exception) as e:
        # Signal UI for badge (D-03)
        return Command(
            update={
                "messages": [AIMessage(content="[SYSTEM: FALLBACK] Switching to Fast Model...")],
                "fallback": True 
            },
            goto="fast_worker"
        )
```

---

### `api/main.py` (route, streaming)

**Analog:** `api/main.py`

**SSE Streaming pattern** (lines 280-330):
```python
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def event_generator():
        try:
            # Yield metadata with fallback flag support (D-03)
            yield f"data: {json.dumps({'type': 'metadata', 'fallback': False})}\n\n"
            
            async for event in orchestrator.graph.astream(input_data, stream_mode="messages"):
                # Handle fallback signal from node state
                if hasattr(event, "fallback") and event.fallback:
                     yield f"data: {json.dumps({'type': 'metadata', 'fallback': True})}\n\n"
                
                # ... yield chunks ...
        except Exception:
            yield f"data: {json.dumps({'type': 'error'})}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## Shared Patterns

### LangGraph State Management
**Source:** `AI-SPEC.md`
**Apply to:** `api/agents/state.py`, `api/agents/graph.py`
```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    fallback: bool
    next: str
```

### Timeout Handling
**Source:** `api/agents/orchestrator.py` / `RESEARCH.md`
**Apply to:** All model invocation nodes
```python
try:
    response = await asyncio.wait_for(model.ainvoke(prompt), timeout=30)
except asyncio.TimeoutError:
    # Handle timeout
```

### Binary Intent Classification (D-01)
**Source:** `CONTEXT.md` / `RESEARCH.md`
**Apply to:** `api/agents/nodes/router.py`
```python
# Force single word output to minimize latency
prompt = "Classify: 'FAST' (greetings) or 'DEEP' (code). Query: " + message
response = await fast_llm.ainvoke(prompt)
decision = "DEEP" if "DEEP" in response.content.upper() else "FAST"
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `api/agents/state.py` | model | request-response | First implementation of stateful LangGraph in this project |
| `api/agents/utils/fallback.py` | utility | request-response | New centralized fallback logic |

## Metadata

**Analog search scope:** `api/agents/`, `api/routes/`, `api/core/`
**Files scanned:** 12
**Pattern extraction date:** 2026-05-10
