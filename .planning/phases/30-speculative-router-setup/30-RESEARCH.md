# Phase 30: Speculative Router Setup - Research

**Researched:** 2026-05-20
**Domain:** Speculative LLM Routing & Resource Optimization
**Confidence:** HIGH

## Summary

Phase 30 implements speculative routing using **Cascadeflow** to optimize response latency. The system leverages a "Fast" model (Gemma 4 via AI Studio) for initial drafts and heuristically/structurally validates outputs using Pydantic. If validation fails, the turn escalates to the "Big" model (Gemini 2.5 Flash).

Research confirms that Cascadeflow 1.1.0 supports Google Gemini via the `google-adk` or `openai` provider configurations (using `GOOGLE_API_KEY`). Integration involves replacing the current `intent_classifier` node in `api/agents/graph.py` with a Cascadeflow-managed execution loop that bubbles up escalation states via SSE.

**Primary recommendation:** Use `cascadeflow[langchain]` to wrap the dual-model logic into a single LangGraph node that performs draft-then-verify speculative execution.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Schema Validation:** Use Pydantic/JSON schema to detect malformed or incomplete outputs from the "Fast" model (Gemma 4) before deciding to escalate to "Big" (Gemini 2.5 Flash).
- **Remote Model (AI Studio):** Strict local concurrency limits (Semaphores/Redis) are not required as inference is offloaded to Google AI Studio. Standard rate-limit handling applies.
- **Per-Turn Escalation:** Only escalate the specific turn that failed validation. This minimizes compute usage while allowing subsequent turns to attempt speculative execution again.

### the agent's Discretion
- **Integration points:** `api/agents/graph.py` (where Cascadeflow speculative routing logic will be integrated).

### Deferred Ideas (OUT OF SCOPE)
- None referenced.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROUT-01 | User can experience dynamic model routing (Gemma to Gemini) via Cascadeflow speculative execution. | Cascadeflow `CascadeAgent` natively supports model cascading and speculative routing. |
| ROUT-02 | System automatically escalates entire conversation turns to the big model on validation failure. | `CustomValidator` interface in Cascadeflow allows Pydantic-based rejection and automatic escalation. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Speculative Routing | API / Backend | — | Routing logic must reside near the LLM client for lowest latency. |
| Model Validation | API / Backend | — | Pydantic schema validation is a backend responsibility. |
| Escalation UI | Browser / Client | Frontend Server | UI must reflect the "Deep" (escalated) state to the user via SSE. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cascadeflow[langchain] | 1.1.0 | Speculative routing engine | Purpose-built for cascading LLM workflows; supports LangChain. |
| google-genai | 1.73.0+ | Gemini API Client | Official Google SDK for Gemini 2.5 Flash. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| pydantic | 2.x | Schema Validation | Used for heuristic validation of "Fast" model drafts. |

**Installation:**
```bash
pip install "cascadeflow[langchain]"
```

## Architecture Patterns

### Recommended Project Structure
```
api/
├── agents/
│   ├── nodes/
│   │   ├── router.py        # REPLACED by Cascadeflow logic
│   │   └── cascade.py       # NEW: Cascadeflow-integrated node
│   └── utils/
│       └── validation.py    # NEW: Pydantic schemas for verification
```

### Pattern 1: Speculative Agent Execution (Cascadeflow)
**What:** Replacing the `intent_classifier` and `fast_worker` nodes with a single `cascade_node`.
**When to use:** For all agentic turns where a draft is possible.
**Example:**
```python
# Source: [VERIFIED: cascadeflow docs]
from cascadeflow import CascadeAgent, ModelConfig
from cascadeflow.quality import CustomValidator, CustomValidationResult

class SchemaValidator(CustomValidator):
    def validate(self, response: str, query: str = "") -> CustomValidationResult:
        # Pydantic check here
        if "ERROR" in response: # Placeholder heuristic
            return CustomValidationResult(passed=False, score=0.0, reason="Schema mismatch")
        return CustomValidationResult(passed=True, score=1.0)

agent = CascadeAgent(models=[
    ModelConfig(name="gemma-4-26b-a4b-it", provider="google", cost=0.0),
    ModelConfig(name="gemini-2.5-flash", provider="google", cost=0.0001)
], validators=[SchemaValidator()])
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Escalation Logic | Manual if/else model switches | Cascadeflow `CascadeAgent` | Handles cost tracking, retries, and multi-model fallbacks automatically. |
| SSE Metadata | Manual string prefixing | Structured SSE JSON | Standardizes how "model_used" is sent to frontend. |

## Common Pitfalls

### Pitfall 1: Schema Inconsistency
**What goes wrong:** Fast model outputs JSON that is "close" but fails Pydantic `strict=True`.
**How to avoid:** Use lenient Pydantic parsing or `model_validate_json(..., strict=False)` in the validator.

### Pitfall 2: Context Window Desync
**What goes wrong:** Escalating to a different model mid-stream resets state.
**How to avoid:** Always escalate the **entire turn** (re-run query with Big model) as per CONTEXT.md decisions.

## Code Examples

### Integrated LangGraph Node
```python
# api/agents/nodes/cascade.py
async def cascade_node(state: AgentState):
    agent = CascadeAgent(...)
    result = await agent.run(state["messages"])
    # Map back to state
    return {
        "messages": [AIMessage(content=result.content)],
        "metadata": {"model": result.model_used, "cascaded": result.cascaded}
    }
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Quick run command | `pytest tests/test_phase30_routing.py` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| ROUT-01 | Gemma used for simple query | Integration | `pytest tests/test_phase30_routing.py::test_gemma_path` |
| ROUT-02 | Gemini used on Pydantic failure | Integration | `pytest tests/test_phase30_routing.py::test_escalation_path` |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Pydantic / Cascadeflow Validators |

## Sources

### Primary (HIGH confidence)
- `/lemony-ai/cascadeflow` - Official Documentation (Context7)
- `github.com/lemony-ai/cascadeflow` - Provider guides for Google Gemini

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Cascadeflow 1.1.0 is stable and supports the required models.
- Architecture: HIGH - Integration into LangGraph as a single node is well-documented.
- Pitfalls: MEDIUM - Real-world Gemini behavior with Cascadeflow's "openai" provider shim needs live verification.

**Research date:** 2026-05-20
**Valid until:** 2026-06-20
