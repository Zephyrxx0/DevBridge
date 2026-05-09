# Phase 22: Knowledge Graph with Internal Resolution - Research

**Researched:** 2026-05-10
**Domain:** Knowledge Graph, Code Analysis, Tree-sitter, PostgreSQL JSONB
**Confidence:** HIGH

## Summary

This phase implements a persistent knowledge graph for user repositories, focusing on file-level relationships. The system will extract `IMPORTS` and `CALLS` edges between files using Tree-sitter queries. Internal symbols will be resolved to their source files, while unresolvable external calls will be dropped, except for "Shadow Nodes" representing high-frequency libraries (e.g., `react`, `fastapi`).

The graph is stored as a single JSONB adjacency list per repository in a new `repo_graph` table. This supports fast traversal for impact analysis and navigation context for agents. The graph is fully rebuilt during the repository ingestion pipeline to ensure integrity.

**Primary recommendation:** Implement a `GraphStoreManager` that hooks into the `_run_ingestion` background task to perform a full rebuild of the repository's file-level graph using optimized Tree-sitter queries for Python and TypeScript.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Graph Extraction | API / Backend | — | Tree-sitter parsing and relationship extraction happen on the server. |
| Symbol Resolution | API / Backend | — | Resolving imports to local files requires knowledge of the repository file tree. |
| Graph Storage | Database | — | Persistent storage in Supabase (PostgreSQL) using JSONB. |
| Graph Rebuild Trigger | API / Backend | — | Integrated into the ingestion pipeline (`api/routes/repo.py`). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tree-sitter-language-pack` | ^1.6.2 | Multi-language parsing | Pre-configured grammars for Python/TS; already in `requirements.txt`. |
| `SQLAlchemy` | ^2.0.0 | Database interaction | Project standard for Supabase/Postgres connectivity. |
| `psycopg` | ^3.3.3 | Database driver | High-performance asynchronous driver for PostgreSQL. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `pathlib` | (stdlib) | Path resolution | Resolving relative imports to absolute repository paths. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB in PG | Neo4j / AgensGraph | Dedicated graph DBs offer better query performance for deep traversals but add operational complexity. JSONB is sufficient for the coarse file-level graph and fits existing infra. |
| Hand-rolled regex | Tree-sitter | Regex is faster for simple imports but fails on aliased imports, multi-line statements, and complex call expressions. |

**Installation:**
```bash
# tree-sitter-language-pack is already in requirements.txt
pip install tree-sitter-language-pack
```

**Version verification:**
Verified `tree-sitter-language-pack` version 1.6.2 in `api/requirements.txt` [VERIFIED: codebase].

## Architecture Patterns

### System Architecture Diagram
1. **Ingestion Trigger**: `/repo/{id}/trigger-index` starts background task.
2. **Chunking**: `chunk_source` extracts symbols and content.
3. **Graph Building**:
   - `extract_metadata(file)`: Uses Tree-sitter queries to find imports and calls.
   - `resolve_symbols(repo)`: Maps imports/calls to target files or Shadow Nodes.
   - `aggregate_graph()`: Builds JSONB nodes and edges.
4. **Storage**: `repo_graph` table updated (Delete + Insert).
5. **Retrieval**: Agents query the graph via `GraphStoreManager` tools.

### Recommended Project Structure
```
api/
├── db/
│   ├── models.py       # Add RepoGraph dataclass
│   └── graph_store.py  # New: GraphStoreManager for CRUD + Traversal
├── ingestion/
│   ├── graph_builder.py # New: Extraction and resolution logic
│   └── pipeline.py     # Hook graph building into completion
sql/
└── migrations/
    └── 0027_add_repo_graph_table.sql # Migration for DR-01
```

### Pattern 1: Multi-Pass Resolution
**What:** Extraction and resolution are decoupled. 
- **Pass 1**: Scan all files to build a global map of `file -> exports`.
- **Pass 2**: Scan each file to find `imports` and `calls`, then resolve them against the map from Pass 1.
**When to use:** Required for resolving symbols that are defined in files processed later in the ingestion sequence.

### Anti-Patterns to Avoid
- **Greedy Resolution**: Don't try to resolve every single identifier. Only resolve those used in call expressions or import statements.
- **Incremental Diffing**: Avoid trying to update the graph incrementally in this phase. Full rebuild is safer and simpler for file-level granularity (D-03).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Code Parsing | Custom Regex | Tree-sitter | Handles comments, strings, and complex syntax nesting correctly. |
| Graph Traversal | Recursive SQL | Python Logic | For a small coarse graph, loading JSONB into memory and traversing with BFS/DFS in Python is faster to implement and debug than complex CTEs. |

## Common Pitfalls

### Pitfall 1: Relative Import Resolution
**What goes wrong:** `from ..utils import helper` fails if the current file's depth isn't correctly tracked.
**How to avoid:** Use `pathlib.Path` relative to the repository root. Map all internal paths to a standard format (e.g., `api/utils.py`).

### Pitfall 2: Shadow Node Explosion
**What goes wrong:** Creating a Shadow Node for every external library (e.g., `os`, `sys`, `json`) litters the graph.
**How to avoid:** Use a "Blessed List" of high-frequency libraries. Silently drop everything else as per `FR-02`.

### Pitfall 3: Re-index Race Condition
**What goes wrong:** Two indexing jobs for the same repo run concurrently, leading to graph corruption.
**How to avoid:** Use the existing `ingestion_jobs` status and ensure `D-03` (Delete then Re-insert) is wrapped in a transaction.

## Code Examples

### Tree-sitter Query: Python Imports
```python
# Source: [VERIFIED: tree-sitter-python docs]
import_query = """
(import_statement
  name: (dotted_name) @name)
(import_from_statement
  module_name: (dotted_name) @module
  name: (dotted_name) @name)
"""
```

### Tree-sitter Query: TypeScript Calls
```python
# Source: [VERIFIED: tree-sitter-typescript docs]
call_query = """
(call_expression
  function: [
    (identifier) @name
    (member_expression
      property: (property_identifier) @name)
  ])
"""
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-based extraction | AST-based (Tree-sitter) | Phase 03 | Much higher accuracy for cross-file navigation. |
| Relational Edge Tables | JSONB Adjacency | D-01/DR-01 | Simpler schema, faster whole-graph loads. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | File-level resolution is sufficient for initial agent reasoning. | Summary | Agents might need deeper function-to-function edges for complex refactors. |
| A2 | `tree-sitter-language-pack` includes robust TS/Python queries. | Standard Stack | May need to manually load separate grammar if pack is outdated. |
| A3 | High-frequency library list covers 90% of useful external context. | Pitfalls | Missing important boundaries for specific domains (e.g., PyTorch). |

## Open Questions

1. **How to handle `__init__.py` exports?**
   - Recommendation: If `api/db/__init__.py` imports `session`, then `import api.db` should be treated as potentially calling symbols in `api/db/session.py`. 
2. **Shadow Node List?**
   - Recommendation: Start with `react`, `fastapi`, `langchain`, `pydantic`, `sqlalchemy`, `pytest`, `next`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tree-sitter-language-pack | Extraction | ✓ | 1.6.2 | — |
| PostgreSQL | Storage | ✓ | 15+ | — |
| Python | Resolution | ✓ | 3.11+ | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Quick run command | `pytest tests/test_repo_graph.py` |
| Full suite command | `pytest tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-02 | File A -> IMPORTS -> File B | Integration | `pytest tests/test_repo_graph.py::test_imports_edge` | ❌ Wave 0 |
| FR-02 | File A -> CALLS -> File B | Integration | `pytest tests/test_repo_graph.py::test_calls_edge` | ❌ Wave 0 |
| D-02 | Create Shadow Node for 'react' | Integration | `pytest tests/test_repo_graph.py::test_shadow_node` | ❌ Wave 0 |
| D-03 | Delete old graph on re-index | Integration | `pytest tests/test_repo_graph.py::test_full_rebuild` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/test_repo_graph.py` — New test suite for graph logic.
- [ ] `tests/fixtures/mock_repo/` — Sample files with cross-imports.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Validate `repo_id` and file paths before processing. |

### Known Threat Patterns for Tree-sitter

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious Source (DoS) | Denial of Service | Cap file size for parsing; use timeouts for Tree-sitter queries. |

## Sources

### Primary (HIGH confidence)
- `tree-sitter` official docs - Query syntax.
- `api/requirements.txt` - Dependency versions.
- `api/routes/repo.py` - Ingestion trigger points.
- `AMD-AUDIT-SPEC.md` / `REQUIREMENTS.md` - Core requirements.

### Secondary (MEDIUM confidence)
- Context7 - Python/TS query patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in use.
- Architecture: HIGH - Clearly defined in `CONTEXT.md`.
- Pitfalls: MEDIUM - Import resolution always has edge cases.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10
