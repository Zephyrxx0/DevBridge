<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Database Schema
- Create a dedicated schema (`hindsight`) within the existing Supabase pgvector database for better isolation from DevBridge application tables.

#### Context Injection
- Consolidate to State: Use a Typed `AgentState` field for all Hindsight memory to keep it structured and precise, rather than appending as raw `SystemMessage`s to the thread history.

#### Retention Trigger
- Two-tiered retention: Call `retain()` to record experiences every user turn, but offload the heavier consolidation/reflection into world facts to the end of the session or idle periods via `APScheduler`.

### the agent's Discretion
None explicitly listed.

### Deferred Ideas (OUT OF SCOPE)
- Running Hindsight as a separate docker container (too much overhead for budget).
- Dual-model routing inside LangGraph intent router (replaced by Cascadeflow).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEM-01 | System invokes Hindsight recall() before execution and retain() post-execution for agent memory. | Use `hindsight_langgraph` package for `create_recall_node` and `create_retain_node`. Set `output_key="hindsight_memory"` to map correctly to `AgentState`. |
| MEM-02 | System points Hindsight embedded mode to existing Supabase pgvector instance for unified storage. | Use `hindsight-all-slim` pip package to avoid local ML bloat and configure `HINDSIGHT_API_DATABASE_SCHEMA=hindsight` environment variable. |
| MEM-03 | System offloads Hindsight reflect() operation to APScheduler to prevent UI blocking. | Create an APScheduler background job via `SchedulerManager.add_job()` that invokes `client.reflect()`. |
</phase_requirements>

# Phase 29: Memory Storage & Foundations - Research

**Researched:** 2026-05-19
**Domain:** Biomimetic Agent Memory & State Architecture
**Confidence:** HIGH

## Summary

This phase integrates Hindsight to provide persistent agent memory. The standard approach requires initializing an embedded Hindsight client (`HindsightEmbedded`) connected to the existing Supabase `pgvector` instance. To isolate Hindsight's automated fact tables, we will target a dedicated `hindsight` PostgreSQL schema.

For LangGraph integration, the `hindsight-langgraph` package provides native `create_recall_node` and `create_retain_node` functions. The recall node will be placed before the router, configured via `output_key` to inject memory directly into a new `hindsight_memory` field on `AgentState`, avoiding unstructured `SystemMessage` bloat. Retention will capture turn-by-turn facts synchronously, while deeper consolidation (the `reflect()` operation) is wrapped in a background job via the existing `SchedulerManager` to ensure zero blocking on HTTP requests.

**Primary recommendation:** Install `hindsight-all-slim` (avoids gigabytes of local ML dependencies like PyTorch while supporting embedded Postgres connections) and `hindsight-langgraph`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Memory Client | API / Backend | — | `HindsightEmbedded` runs in-process to orchestrate fact extraction via configured LLMs. |
| Knowledge Graph | Database / Storage | — | Persisted entirely in Supabase pgvector under the custom `hindsight` schema. |
| LangGraph Routing | API / Backend | — | `create_recall_node` and `create_retain_node` execute inline with agent turns. |
| Consolidation Jobs | API / Backend | Database | `APScheduler` (backed by Supabase) manages the asynchronous execution of `reflect()`. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hindsight-all-slim` | latest | Core memory management | Slim version relies on our external PostgreSQL and LLMs, avoiding local model downloads (MLX/PyTorch). |
| `hindsight-langgraph`| latest | LangGraph memory nodes | First-party integration for managing recall/retain nodes dynamically based on `RunnableConfig` bank IDs. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `APScheduler` | 3.10.4 | Background execution | Already installed. Used to schedule the heavy `client.reflect()` operation asynchronously. |

**Installation:**
```bash
pip install hindsight-all-slim hindsight-langgraph
```

## Architecture Patterns

### System Architecture Diagram
```text
User Request / Input
       │
       v
[Recall Node] (hindsight-langgraph) ──> Query Supabase (schema: hindsight)
       │
       v (Writes string to AgentState["hindsight_memory"])
[Router Node] (intent classifier)
       │
       v
[Fast / Big Worker Nodes] (LLM Inference)
       │
       v
[Retain Node] (hindsight-langgraph) ──> Extract immediate facts to Supabase
       │
       v (Trigger background job)
[SchedulerManager] ──> Exec `client.reflect()` async to consolidate world facts
```

### Pattern 1: Typed Memory State Injection
**What:** Writing memory context directly to a structured state field instead of appending messages.
**When to use:** In LangGraph, when you need strict prompt control and want to avoid memory context being misconstrued as conversation history.
**Example:**
```python
# Source: Hindsight official LangGraph docs
from typing import TypedDict, Optional, Annotated

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    hindsight_memory: Optional[str]  # new field
    next: str
    fallback: bool

# create_recall_node automatically writes to the specified output_key
recall_node = create_recall_node(
    client=client,
    bank_id_from_config="user_id",
    output_key="hindsight_memory"
)
```

### Anti-Patterns to Avoid
- **Blocking Reflection:** Calling `hindsight.reflect()` inside the graph execution thread. It performs heavy knowledge synthesis and will stall API responses.
- **Installing `hindsight-all`:** The full package installs PyTorch and local embedding models. Use `hindsight-all-slim` since we already use Vertex/Google and Supabase pgvector.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LangGraph Context Injection | Custom chunk retrieval code | `create_recall_node` | Natively resolves `bank_id` from runtime config and manages formatting. |
| Fact extraction / chunking | RAG-style manual chunking | `HindsightEmbedded` | Hindsight automatically extracts structured entities and relations to a knowledge graph, avoiding raw-text RAG limitations. |

## Common Pitfalls

### Pitfall 1: Schema Initialization Failure
**What goes wrong:** Hindsight fails to boot because it attempts to create tables in the `public` schema or the `hindsight` schema does not exist.
**Why it happens:** Hindsight requires PostgreSQL setup. If `HINDSIGHT_API_DATABASE_SCHEMA=hindsight` is passed, the schema must exist.
**How to avoid:** Ensure an initial database migration or application startup hook executes `CREATE SCHEMA IF NOT EXISTS hindsight;` before the Hindsight client initializes.

### Pitfall 2: Hardcoded Bank IDs
**What goes wrong:** All users share the same memory context.
**Why it happens:** Hardcoding `bank_id="user-123"` in the node factory.
**How to avoid:** Use `bank_id_from_config="user_id"` and ensure LangGraph calls pass `config={"configurable": {"user_id": ...}}`.

## Code Examples

### Recall and Retain Nodes in LangGraph
```python
# Source: https://github.com/vectorize-io/hindsight/blob/main/hindsight-docs/docs-integrations/langgraph.md
from hindsight_langgraph import create_recall_node, create_retain_node

recall = create_recall_node(
    client=client, 
    bank_id_from_config="user_id",
    output_key="hindsight_memory"
)

retain = create_retain_node(
    client=client, 
    bank_id_from_config="user_id",
    retain_ai=True
)

builder.add_node("recall", recall)
builder.add_node("retain", retain)

# execution ordering
builder.add_edge(START, "recall")
builder.add_edge("recall", "router")
# ... workers run ...
builder.add_edge("fast_worker", "retain")
builder.add_edge("big_worker", "retain")
builder.add_edge("retain", END)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw RAG chunks | Biomimetic Fact Extraction | Standard | Higher fidelity memories organized by semantic facts rather than verbatim embeddings. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `create_retain_node` execution time is acceptable for blocking graph execution. | Architecture Patterns | If `retain` is too slow, we may need to offload `retain` to APScheduler entirely as well, instead of just `reflect`. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL + pgvector | Hindsight Storage | ✓ | 15+ (Supabase) | — |
| APScheduler | Background Jobs | ✓ | 3.10.4 | — |
| hindsight-all-slim | Biomimetic Memory | ✗ | — | Install via pip |

**Missing dependencies with no fallback:**
- `hindsight-all-slim`
- `hindsight-langgraph`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 |
| Config file | `pytest.ini` |
| Quick run command | `pytest api/tests/test_phase29_memory.py -x` |
| Full suite command | `pytest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEM-01 | Recall/Retain execution | unit | `pytest api/tests/test_phase29_memory.py::test_memory_nodes -x` | ❌ Wave 0 |
| MEM-02 | Embedded client initializes with schema | integration | `pytest api/tests/test_phase29_memory.py::test_embedded_init -x` | ❌ Wave 0 |
| MEM-03 | Reflection offloaded to APScheduler | unit | `pytest api/tests/test_phase29_memory.py::test_reflect_job_scheduled -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest api/tests/test_phase29_memory.py -x`
- **Per wave merge:** `pytest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `api/tests/test_phase29_memory.py` — covers MEM-01, MEM-02, MEM-03

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `bank_id` mapping explicitly locked to authenticated user context |
| V5 Input Validation | yes | LLM schema enforcement |
| V6 Cryptography | no | — |

### Known Threat Patterns for hindsight

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant memory access | Information Disclosure | Strictly configure `bank_id_from_config="user_id"` and ensure the upstream LangGraph config population correctly validates the authenticated session. |

## Sources

### Primary (HIGH confidence)
- `/vectorize-io/hindsight` - Python library documentation, API boundaries
- `api/db/vector_store.py` - Existing Supabase configuration
- `api/core/scheduler.py` - Existing APScheduler configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified the correct slim package to avoid PyTorch dependencies.
- Architecture: HIGH - Verified exact LangGraph support methods for custom output keys.
- Pitfalls: HIGH - Documented schema requirements.

**Research date:** 2026-05-19
**Valid until:** 2026-06-19
