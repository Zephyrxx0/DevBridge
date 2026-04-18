# Phase 03: Code Parsing with Tree-sitter - Research

**Researched:** 2026-04-18
**Domain:** Semantic code chunking for Python and TypeScript-family files
**Confidence:** HIGH

## Summary

Phase 03 should add an ingestion-side parser/chunker module in the backend that reads source files, builds Tree-sitter ASTs, and emits deterministic semantic chunks plus fallback chunks when parsing fails. The recommended parser package is `tree-sitter-language-pack` because it provides maintained precompiled language bindings and supports Python + TypeScript/TSX without local grammar compilation.

This phase should stay strictly focused on chunk production and metadata correctness. It should not wire vector indexing or search execution yet (already deferred to Phase 05).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File discovery (`api/**/*.py`, `web/src/**/*.ts(x)`) | API / Backend | — | Parsing scope is a backend ingestion concern. |
| AST parse + semantic extraction | API / Backend | Tree-sitter runtime | Requires local syntax tree traversal and symbol-aware chunking. |
| Deterministic chunk IDs + metadata schema | API / Backend | — | IDs and schema must be stable for future annotation/history joins. |
| Parse-failure continuation | API / Backend | — | Ingestion must continue with coarse fallback chunks instead of hard fail. |

## Standard Stack

### Core
| Library | Purpose | Why |
|---------|---------|-----|
| `tree-sitter-language-pack` | Language and parser loading | Maintained package with precompiled parser support across many languages, including Python and TypeScript-family grammars. |
| `tree-sitter` (transitive) | AST primitives (`Parser`, `Node`, `Tree`) | Underlying parser/runtime used by language pack. |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `hashlib` (stdlib) | Deterministic chunk ID/hash generation | For stable IDs and content hashing. |
| `pathlib` (stdlib) | Cross-platform path handling | For normalized repo-relative chunk metadata. |
| `pytest` | Unit tests for parser/chunker behavior | Validate schema, scope filtering, and fallback behavior. |

## Architecture Patterns

### Pattern 1: Interface-first chunk contracts
Define chunk metadata/dataclass contracts before parser logic so downstream phases can depend on stable structure.

### Pattern 2: Semantic-first extraction with controlled split
Extract top-level classes/functions as primary chunks. If a symbol is oversized, split by direct AST child nodes while preserving parent symbol identity.

### Pattern 3: Hybrid fallback on parser failure
When parse fails or language loader is unavailable, emit coarse line-range chunks with `parse_status=error` and failure metadata (`error_type`, `error_message`, `fallback_mode`) to preserve ingestion continuity.

## Don't Hand-roll

| Problem | Avoid | Use Instead | Why |
|---------|-------|-------------|-----|
| Building language grammars in-repo | Compiling grammar repos manually in CI/dev | Precompiled parsers from `tree-sitter-language-pack` | Reduces setup friction and platform-specific build issues. |
| Opaque random chunk IDs | UUID-only IDs without source derivation | Deterministic hash from file path + symbol path + range + content hash | Needed for stable cross-phase references. |
| Whole-file-only fallback | Dropping file or emitting one huge blob always | Coarse range fallback chunks with parse diagnostics | Keeps ingestion useful and debuggable under failures. |

## Common Pitfalls

### Pitfall 1: ABI mismatch between parser runtime and grammar bundles
If parser/runtime versions drift, parse may fail at runtime.
- Mitigation: pin `tree-sitter-language-pack` in `api/requirements.txt` and rely on its tested bundle.

### Pitfall 2: Path normalization instability
Using absolute paths in chunk IDs causes non-determinism across environments.
- Mitigation: normalize to repo-relative POSIX-like path before hashing.

### Pitfall 3: TSX omission
Treating `.tsx` as unsupported blocks frontend indexing.
- Mitigation: include `.tsx` in discovery and map both `.ts` and `.tsx` to TypeScript-family parser logic.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Quick run command | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py -q` |
| Full suite command | `.venv/Scripts/python.exe -m pytest tests -q` |

### Phase Requirement Coverage
| Requirement | Behavior | Automated Command |
|-------------|----------|------------------|
| Implement chunking logic for `.ts` and `.py` using Tree-sitter | Semantic chunks generated for Python/TSX fixtures with stable metadata | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_semantic_chunking_python_and_tsx -q` |
| Define metadata schema for code chunks | Required schema fields + deterministic chunk ID present | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_chunk_schema_and_deterministic_id -q` |
| Parse-failure fallback continuity | Failed parse produces coarse fallback chunk + structured failure metadata | `.venv/Scripts/python.exe -m pytest tests/test_chunking_phase03.py::test_hybrid_fallback_on_parse_failure -q` |

## Sources

### Primary
- py-tree-sitter docs: https://tree-sitter.github.io/py-tree-sitter/
- tree-sitter-language-pack package docs: https://pypi.org/project/tree-sitter-language-pack/

### Secondary
- py-tree-sitter-languages README (status note indicates unmaintained and points to tree-sitter-language-pack): https://github.com/grantjenks/py-tree-sitter-languages

## Metadata

**Confidence breakdown:**
- Package selection: HIGH
- Chunking strategy fit to Phase 03 decisions: HIGH
- Fallback behavior and schema design: HIGH

**Research date:** 2026-04-18
**Valid until:** 2026-05-18
