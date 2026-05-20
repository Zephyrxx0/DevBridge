# Architecture Patterns

**Domain:** DevBridge AMD Edition (Cascadeflow & Hindsight Integration)
**Researched:** 2026-05-20

## Recommended Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                Agent Orchestration (LangGraph)              │
│                     `api/agents/graph.py`                   │
├─────────────────────────────────────────────────────────────┤
│                    Hindsight Memory Node                    │
│   (Injects World Facts & Experiences into prompt context)   │
├─────────────────────────────────────────────────────────────┤
│                  Cascadeflow Agent Worker                   │
│   (Drafts with Fast Model -> Escalates to Big Model)        │
└────────┬───────────────────────────────────────┬────────────┘
         │                                       │
         ▼                                       ▼
┌───────────────────────┐            ┌────────────────────────┐
│  Vector Store / Code  │            │     Hindsight Store    │
│  (pgvector: Code)     │            │ (Facts & Experiences)  │
└───────────────────────┘            └────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Cascadeflow Router** | Replaces static routing. Uses Gemma 4 (Fast, AI Studio) for drafts, evaluates quality, and escalates to Gemini 2.5 Flash (Big, AI Studio) if needed. | LangGraph nodes, Gemini API. |
| **Hindsight System** | Biomimetic persistent memory. Manages "World Facts" and "Experiences". | LangGraph state, Vector Store, LLM nodes. |
| **Memory Injector (Hindsight)** | Calls `hindsight.recall()` before agent execution to ground prompts with past insights. | Cascadeflow worker, DB. |
| **Experience Recorder (Hindsight)**| Calls `hindsight.retain()` post-turn to consolidate interactions into memory. | LangGraph edge/end node. |

### Data Flow

1. **Pre-processing (Memory Injection):** When a user queries, the LangGraph flow triggers a `recall()` to Hindsight, injecting relevant "World Facts" and past "Experiences" into the `AgentState`.
2. **Execution (Speculative Routing):** The query (enriched with Hindsight context) is passed to `Cascadeflow`. 
   - **Draft Phase:** Gemma 4 generates a fast response via AI Studio.
   - **Validation Phase:** Cascadeflow evaluates completeness and correctness.
   - **Escalation Phase:** If validation fails, Gemini 2.5 Flash processes the query.
3. **Tool Invocations:** If the model requires codebase context, it triggers existing `hybrid_search` pgvector tools.
4. **Post-processing (Memory Consolidation):** The final answer and tool calls are fed to `hindsight.retain()` to build new observations and mental models.

## Patterns to Follow

### Pattern 1: Speculative Agent Execution (Cascadeflow)
**What:** Instead of statically deciding "Fast vs Deep" upfront (Intent Routing), let the Fast model draft the answer. 
**When:** For every chat query to minimize 72B model inference time.
**Example:**
```python
from cascadeflow import CascadeAgent, ModelConfig

agent = CascadeAgent(
    models=[
        ModelConfig(name="gemma-4-26b-a4b-it", provider="google"),
        ModelConfig(name="gemini-2.5-flash", provider="google"),
    ],
    quality_threshold=0.8
)
```

### Pattern 2: Contextual Priming (Hindsight)
**What:** Separate raw code retrieval from agent memory. Use Hindsight for "what we know about the user/repo" and pgvector for "where is this code".
**When:** In the pre-execution phase of LangGraph.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Retaining Raw Code Chunks in Hindsight
**What:** Storing codebase chunks as Hindsight "Experiences".
**Why bad:** Duplicates pgvector index and pollutes the agent's mental models with low-level syntax.
**Instead:** Keep code in pgvector. Use Hindsight ONLY for user preferences, architectural decisions, and interaction summaries.

### Anti-Pattern 2: Wrapping Cascadeflow around Tool Execution
**What:** Escalating *during* intermediate tool reasoning loops.
**Why bad:** Creates inconsistent tool schemas and context limits between the 9B and 72B models.
**Instead:** Escalate the *entire conversational turn* if the draft answer fails quality checks, rather than switching models mid-tool-call.

## Scalability Considerations

| Concern | Limitation | Mitigation |
|---------|------------|------------|
| **Runtime Budgeting** | AI Studio (remote) manages inference; local VRAM constraints removed. | Cascadeflow runs sequentially; ensure max context and rate limits are respected. |
| **Latency Spikes** | Escalation means user waits for both Fast and Big model generation. | Stream the Fast model output immediately. If escalation happens, notify UI via SSE (`{"type": "status", "message": "Thinking deeper..."}`). |
| **Memory Growth** | Hindsight "Experiences" grow infinitely. | Rely on Hindsight's auto-consolidation (`reflect()`) to compress Experiences into "Mental Models" periodically. |

## Sources

- [Cascadeflow (Lemony.ai) GitHub / Docs] (HIGH confidence)
- [Hindsight (Vectorize.io) GitHub / Docs] (HIGH confidence)
