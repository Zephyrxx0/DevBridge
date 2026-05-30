# Phase 22: Knowledge Graph with Internal Resolution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 22-knowledge-graph-with-internal-resolution
**Areas discussed:** Graph Granularity, External Symbol Handling, Update Strategy, Node Data Storage

---

## Graph Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Symbol Level (Fine) | Functional level (functions/classes). Better for 'Who calls this function?' queries. higher storage overhead. | |
| File Level (Coarse) | File level (imports/exports). Simpler graph, but less useful for deep reasoning. | ✓ |

**User's choice:** File Level (Coarse)
**Notes:** Decided to start with a coarse-grained graph to manage complexity and foundational stability.

---

## External Symbol Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Silent Drop (Clean) | Silently drop as per base requirements. Cleanest graph. | |
| Shadow Nodes (Contextual) | Drop from graph, but keep a 'MISSING' node for common external libraries (e.g. 'react', 'fastapi'). Helps identify system boundaries. | ✓ |

**User's choice:** Shadow Nodes (Contextual)
**Notes:** Added "Shadow Nodes" to provide context about major external dependencies without bloating the graph with every unresolvable call.

---

## Update Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Full Rebuild (Stable) | Delete and recreate the repo's graph on every full re-index. Reliable and easy to implement. | ✓ |
| Incremental (Performance) | Only update nodes/edges for changed files. Faster for large repos, but complex to handle deleted symbols. | |

**User's choice:** Full Rebuild (Stable)
**Notes:** Priority is reliability and ease of implementation for the initial graph rollout.

---

## Node Data Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Reference Only (Slim) | Store chunk IDs only. Minimizes storage, but requires a join to the chunks table for reasoning. | |
| Metadata Cache (Fast) | Denormalize and store small metadata snippets (names, types) for faster graph traversals without joins. | ✓ |

**User's choice:** Metadata Cache (Fast)
**Notes:** Chose a metadata cache approach to enable fast traversals, which is critical for future agentic reasoning over the graph.

---

## Claude's Discretion

- Exact list of libraries for "Shadow Nodes".
- Internal JSONB adjacency structure.
- File-level "CALLS" detection logic.

## Deferred Ideas

- Functional-level (symbol) graph granularity.
- Incremental updates/diffing.
- Cross-repo graph resolution.
