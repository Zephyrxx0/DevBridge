from __future__ import annotations

from pathlib import Path

from api.ingestion.discovery import discover_source_candidates
from api.ingestion.tree_sitter_chunker import chunk_source
from api.ingestion.types import CodeChunk


def chunk_repository_files(
    *,
    repo: str,
    repo_root: str,
    candidate_paths: list[str] | None = None,
    max_symbol_lines: int = 120,
) -> list[CodeChunk]:
    root = Path(repo_root).resolve()
    discovered = discover_source_candidates(repo_root=str(root), candidate_paths=candidate_paths)

    all_chunks: list[CodeChunk] = []
    for relative_path in discovered:
        absolute_path = root / relative_path
        source = absolute_path.read_text(encoding="utf-8", errors="replace")
        file_chunks = chunk_source(
            repo=repo,
            file_path=relative_path,
            source=source,
            max_symbol_lines=max_symbol_lines,
        )
        all_chunks.extend(file_chunks)

    return all_chunks


def chunk_from_source_map(
    *,
    repo: str,
    source_map: dict[str, str],
    max_symbol_lines: int = 120,
) -> list[CodeChunk]:
    chunks: list[CodeChunk] = []
    for file_path, source in source_map.items():
        chunks.extend(
            chunk_source(
                repo=repo,
                file_path=file_path,
                source=source,
                max_symbol_lines=max_symbol_lines,
            )
        )
    return chunks
