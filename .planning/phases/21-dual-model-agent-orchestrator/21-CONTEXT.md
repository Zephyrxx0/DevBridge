# Phase 21: Dual-Model Agent Orchestrator - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the multi-agent routing logic that switches between the Fast Model (Gemma-4) for intent classification and the Big Model (Qwen2.5-72B) for deep reasoning. It delivers the LangGraph orchestration layer, intent classification prompting, and robust fallback mechanisms on the AMD MI300X infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Intent Classification
- **D-01: Binary Toggle Text.** The Gemma-4 intent classifier will be prompted to output a single word ('FAST' or 'DEEP') rather than structured JSON. This minimizes parsing latency and ensures the fastest routing decision.

### Orchestration Pattern
- **D-02: Supervisor Node.** Implement the LangGraph orchestration using a Supervisor pattern. The Fast Model acts as the initial supervisor node that evaluates the query and delegates execution to either the Big Model worker node or handles the response itself for fast queries. This provides a flexible foundation for multi-turn interactions.

### Fallback UX
- **D-03: Transparent Badge.** When the system falls back from the Big Model to the Fast Model (due to timeout or failure), the UI must display a small "Fast Mode" badge or toast notification to inform the user that the response quality may be lower.

### Timeout Management
- **D-04: Static Limits (Fixed).** Enforce strict execution timeouts of 30s for the Fast Model and 120s for the Big Model, as defined in requirements. These limits ensure predictable load on the single-GPU inference pool.

### Claude's Discretion
- The exact prompt wording for the intent classifier (within the 'FAST/DEEP' constraint).
- Error handling logic for vLLM connection failures beyond the required fallback.
- Internal state management within the LangGraph Supervisor node.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Infrastructure and Models
- `.planning/ROADMAP.md` — Phase 21 goal and success criteria.
- `.planning/REQUIREMENTS.md` — FR-01 (Dual-Model Orchestrator), MR-01/MR-02 (Model specs), IR-01 (VRAM partitions).
- `.planning/phases/20-amd-gpu-infrastructure-setup/20-CONTEXT.md` — Port assignments (8000/8001) and separate container architecture.

### Existing Architecture
- `.planning/codebase/ARCHITECTURE.md` — LangGraph/LangChain integration patterns in the Agent Layer.
- `api/agents/orchestrator.py` — Current orchestrator implementation to be refactored.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/agents/orchestrator.py`: Current ReAct agent logic can be reused within the Big Model worker node.
- `api/core/config.py`: Port settings (`BIG_MODEL_PORT`, `FAST_MODEL_PORT`) and token limits.

### Established Patterns
- LangGraph state machines: The project uses LangGraph for agent coordination.
- Async tool calls: Pattern for wrapping tools in `asyncio.wait_for` exists.

### Integration Points
- `POST /chat/stream`: The main entry point in `api/routes/chats.py` will now trigger the Supervisor-based LangGraph.
- SSE response payload: Needs to support a `fallback: true` or similar flag to trigger the UI badge.

</code_context>

<specifics>
## Specific Ideas

- The intent classifier should be highly biased towards `DEEP` if there is any ambiguity, as the MI300X is designed to handle the 72B model.
- Use the 30s/120s timeouts as hard caps in `asyncio.wait_for`.

</specifics>

<deferred>
## Deferred Ideas

- Adaptive timeouts based on context length (discussed but rejected for now).
- Multi-label intent classification for routing to specialized sub-agents.

</deferred>

---

*Phase: 21-dual-model-agent-orchestrator*
*Context gathered: 2026-05-10*
