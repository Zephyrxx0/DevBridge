# Phase 22: Knowledge Graph with Internal Resolution - Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 7
**Analogs found:** 6 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `sql/migrations/0027_add_repo_graph_table.sql` | migration | batch | `sql/migrations/0025_bootstrap_code_intel_tables.sql` | exact |
| `api/db/graph_store.py` | service | CRUD | `api/db/vector_store.py` | role-match |
| `api/ingestion/graph_builder.py` | service | transform | `api/ingestion/tree_sitter_chunker.py` | role-match |
| `tests/test_repo_graph.py` | test | request-response | `tests/test_vector_db.py` | role-match |
| `api/db/models.py` | model | CRUD | `api/db/models.py` | exact |
| `api/ingestion/pipeline.py` | service | batch | `api/ingestion/pipeline.py` | exact |
| `api/ingestion/tree_sitter_chunker.py` | utility | transform | `api/ingestion/tree_sitter_chunker.py` | exact |

## Pattern Assignments

### `api/db/graph_store.py` (service, CRUD)

**Analog:** `api/db/vector_store.py`

**Imports and Connection Pattern** (lines 1-15, 20-35):
```python
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import text
from api.db.session import get_engine

logger = logging.getLogger(__name__)

class GraphStoreManager:
    """
    Manages persistent symbol knowledge graph storage in PostgreSQL using JSONB.
    """
    def __init__(self):
        self.table_name = "repo_graph"

    def initialize(self) -> bool:
        engine = get_engine()
        if engine is None:
            logger.warning("Database engine is not initialized. Graph store is disabled.")
            return False
        return True
```

**Upsert Pattern (Delete + Insert)** (lines 80-100):
```python
    async def save_graph(self, repo: str, graph_data: Dict[str, Any]):
        engine = get_engine()
        async with engine.connect() as conn:
            # D-03: Full Rebuild (Delete then Re-insert)
            await conn.execute(text("DELETE FROM repo_graph WHERE repo = :repo"), {"repo": repo})
            await conn.execute(text("""
                INSERT INTO repo_graph (repo, graph, updated_at)
                VALUES (:repo, :graph, NOW())
            """), {"repo": repo, "graph": json.dumps(graph_data)})
            await conn.commit()
```

---

### `api/ingestion/graph_builder.py` (service, transform)

**Analog:** `api/ingestion/tree_sitter_chunker.py`

**Tree-sitter Query Pattern** (lines 40-55):
```python
def _parse_root(language: str, source: str):
    from tree_sitter_language_pack import get_parser
    parser = get_parser(language)
    return parser.parse(source.encode("utf-8")).root_node

def _iter_named_children(node: object):
    return [child for child in getattr(node, "children", []) if getattr(child, "is_named", False)]
```

**Multi-Pass resolution logic (Pass 1: Extraction)**:
```python
def extract_metadata(language: str, root: object, source_lines: list[str]) -> Dict[str, Any]:
    # Use Tree-sitter queries to find imports, exports, and calls
    metadata = {"imports": [], "exports": [], "calls": []}
    # ... logic similar to _top_level_symbols in chunker ...
    return metadata
```

---

### `sql/migrations/0027_add_repo_graph_table.sql` (migration, batch)

**Analog:** `sql/migrations/0025_bootstrap_code_intel_tables.sql`

**Table Creation Pattern** (lines 3-25):
```sql
CREATE TABLE IF NOT EXISTS repo_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT UNIQUE NOT NULL,
  graph JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS repo_graph_repo_idx ON repo_graph (repo);
```

---

### `api/db/models.py` (model, CRUD)

**Analog:** `api/db/models.py` (Existing dataclasses)

**Dataclass Pattern**:
```python
@dataclass
class RepoGraph:
    repo: str
    graph: Dict[str, Any]
    updated_at: datetime
```

---

## Shared Patterns

### Database Interaction
**Source:** `api/db/session.py`, `api/db/vector_store.py`
**Apply to:** `graph_store.py`, `models.py`
```python
from api.db.session import get_engine
from sqlalchemy import text

# Always use async with engine.connect() as conn:
# Always await conn.execute(text("..."), params)
```

### Tree-sitter Usage
**Source:** `api/ingestion/tree_sitter_chunker.py`
**Apply to:** `graph_builder.py`, `tree_sitter_chunker.py` (extension)
```python
from tree_sitter_language_pack import get_parser
# Multi-language support via LANGUAGE_BY_SUFFIX and TOP_LEVEL_SYMBOL_TYPES
```

### Ingestion Hook
**Source:** `api/routes/repo.py` (Line 735)
**Apply to:** `pipeline.py`, `repo.py`
```python
# Trigger after chunking/embedding success
try:
    await build_and_save_graph(repo_slug)
except Exception as graph_err:
    logger.error(f"Graph build failed (non-fatal): {graph_err}")
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| N/A | | | All files have reasonable analogs in the codebase. |

## Metadata

**Analog search scope:** `api/db/`, `api/ingestion/`, `sql/migrations/`, `tests/`
**Files scanned:** 15
**Pattern extraction date:** 2026-05-10
