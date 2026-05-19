# Technology Stack

**Project:** DevBridge AMD Edition (Cascadeflow & Hindsight)
**Researched:** 2026-05-20

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cascadeflow | Latest | LLM Routing & Escalation | Replaces static router; dynamically falls back to 72B model based on quality scores. Optimizes single GPU usage. |
| Hindsight | Latest | Agent Persistent Memory | Upgrades LangGraph's naive `MemorySaver` to a structured (Facts/Experiences) graph. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LangGraph | Existing | Orchestration | Wrapping Hindsight and Cascadeflow into the existing multi-agent DAG. |
| vLLM / Ollama | Existing | Inference backend | Cascadeflow integrates seamlessly with OpenAI-compatible endpoints served by vLLM. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Model Routing | Cascadeflow | LangChain `RunnableBranch` | Too static. Cascadeflow evaluates the actual output quality dynamically before escalating. |
| Memory | Hindsight | Mem0 / Zep | Hindsight is specifically optimized for coding agents and separates World Facts from episodic Experiences cleanly. |

## Installation

```bash
# Core
pip install cascadeflow hindsight-client
```

## Sources

- Cascadeflow Documentation / Lemony.ai
- Hindsight API Documentation / Vectorize.io