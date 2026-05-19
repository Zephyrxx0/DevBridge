# Feature Landscape

**Domain:** DevBridge AMD Edition (Cascadeflow & Hindsight)
**Researched:** 2026-05-20

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Speculative Execution** | Core Cascadeflow value. Start fast, escalate if needed. | Medium | Requires tuning the validation prompt/threshold. |
| **Long-term Memory** | Core Hindsight value. Agent remembers past PR reviews and user preferences. | Low | Wrapping chat loop with `retain()` and `recall()`. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Streaming Escalation UX** | UI shows when the agent switches from Fast (Draft) to Big (Deep) mode. | High | Needs custom SSE events bubbling up from Cascadeflow. |
| **Memory Curation Dashboard** | Admin panel to view/edit what the agent "believes" (Mental Models). | Medium | Adds CRUD over Hindsight's knowledge graph. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Code AST in Memory** | Storing code syntax in Hindsight bloats its graph and slows down reasoning. | Keep raw code in pgvector; only store "Agent decided X because of Y" in Hindsight. |
| **Multi-GPU Parallel Execution** | Racing the Fast and Big models simultaneously wastes MI300X VRAM. | Run sequentially (Cascadeflow default) to respect strict VRAM partitions. |

## Feature Dependencies

```text
Hindsight Memory Storage → Hindsight Prompt Injection
Hindsight Prompt Injection → Cascadeflow Agent Loop
Cascadeflow Agent Loop → Streaming Escalation UX
```

## MVP Recommendation

Prioritize:
1. Basic Hindsight `recall()` in the system prompt.
2. Replace static router with Cascadeflow using Gemma-4-9B -> Qwen2.5-72B.
3. Call `retain()` asynchronously after each turn.

Defer: Memory Curation Dashboard (build API first, UI later).

## Sources

- Cascadeflow / Hindsight capabilities