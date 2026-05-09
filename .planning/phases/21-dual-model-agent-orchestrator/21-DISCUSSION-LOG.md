# Phase 21: Dual-Model Agent Orchestrator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 21-dual-model-agent-orchestrator
**Areas discussed:** Intent Prompting Strategy, Orchestration Pattern, Fallback Feedback UX, Timeout Management

---

## Intent Prompting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Binary Toggle Text | Ask Gemma to output only 'FAST' or 'DEEP'. Lowest latency, minimal parsing. Best for simple routing. | ✓ |
| Structured JSON | Force JSON output like {"route": "DEEP", "reason": "..."}. Slower but provides an audit trail for why a route was chosen. | |

**User's choice:** Binary Toggle Text
**Notes:** User preferred minimal latency for the routing decision.

---

## Orchestration Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Router-First Switch | A lightweight 'Router' function runs first, then the selected model's chain is instantiated. Cleanest separation. | |
| Supervisor Node | The Fast Model acts as a LangGraph supervisor node that decides which worker (Big Model or itself) to invoke. More flexible for multi-turn. | ✓ |

**User's choice:** Supervisor Node
**Notes:** Chose a more flexible orchestration pattern that allows for future multi-turn agent expansion.

---

## Fallback Feedback UX

| Option | Description | Selected |
|--------|-------------|----------|
| Transparent Badge | Show a small 'Fast Mode' badge or toast when a fallback occurs. Transparent to the user. | ✓ |
| Silent Fallback | No UI indication. If Big Model fails, the response just comes from Fast Model. Simpler UI, but might confuse users if quality drops. | |

**User's choice:** Transparent Badge
**Notes:** transparency about response quality was prioritized.

---

## Timeout Management

| Option | Description | Selected |
|--------|-------------|----------|
| Static Limits (Fixed) | Strictly 30s/120s limits as defined in requirements. Predictable infrastructure load. | ✓ |
| Context-Weighted Timeouts | Start with fixed limits but allow scaling them by +50% if the prompt is near the 48K token cap. Reduces timeouts for heavy context. | |

**User's choice:** Static Limits (Fixed)
**Notes:** Requirements for 30s/120s were upheld for infrastructure predictability.

---

## Claude's Discretion

- Exact prompt wording for intent classification.
- Connection error handling beyond the required fallback.
- Internal state management within LangGraph nodes.

## Deferred Ideas

- Adaptive timeouts based on context length.
- Multi-label intent classification for specialized sub-agents.
