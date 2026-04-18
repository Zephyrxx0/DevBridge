from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from api.ingestion.types import CodeChunk, make_chunk, normalize_file_path

LANGUAGE_BY_SUFFIX = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
}

TOP_LEVEL_SYMBOL_TYPES = {
    "python": {
        "function_definition": "function",
        "class_definition": "class",
    },
    "typescript": {
        "function_declaration": "function",
        "class_declaration": "class",
    },
}

MODULE_STATEMENT_TYPES = {
    "python": {"expression_statement"},
    "typescript": {"expression_statement"},
}


@dataclass(frozen=True)
class SymbolRange:
    node: object
    symbol_name: str
    symbol_kind: str


def detect_language(file_path: str) -> str:
    suffix = Path(file_path).suffix.lower()
    if suffix not in LANGUAGE_BY_SUFFIX:
        raise ValueError(f"Unsupported file extension: {suffix}")
    return LANGUAGE_BY_SUFFIX[suffix]


def _line_slice(source_lines: list[str], start_line: int, end_line: int) -> str:
    return "\n".join(source_lines[start_line - 1 : end_line])


def _parse_root(language: str, source: str):
    from tree_sitter_language_pack import get_parser  # Imported lazily.

    parser = get_parser(language)
    tree = parser.parse(source.encode("utf-8"))
    return tree.root_node


def _extract_node_text(source_bytes: bytes, node: object) -> str:
    return source_bytes[node.start_byte : node.end_byte].decode("utf-8")


def _node_lines(node: object) -> tuple[int, int]:
    start_line = int(node.start_point[0]) + 1
    end_line = int(node.end_point[0]) + 1
    return start_line, end_line


def _iter_named_children(node: object) -> list[object]:
    return [child for child in getattr(node, "children", []) if getattr(child, "is_named", False)]


def _extract_symbol_name(node: object, source_lines: list[str], fallback: str) -> str:
    # Best-effort name extraction from the source line when tree-sitter field helpers are unavailable.
    start_line, _ = _node_lines(node)
    line = source_lines[start_line - 1] if start_line - 1 < len(source_lines) else ""
    stripped = line.strip()
    if stripped:
        return stripped.split("(")[0].split("{")[0].strip()
    return fallback


def _top_level_symbols(language: str, root: object, source_lines: list[str]) -> list[SymbolRange]:
    type_map = TOP_LEVEL_SYMBOL_TYPES.get(language, {})
    symbols: list[SymbolRange] = []

    for child in _iter_named_children(root):
        symbol_kind = type_map.get(getattr(child, "type", ""))
        if not symbol_kind:
            continue
        symbol_name = _extract_symbol_name(child, source_lines, fallback=getattr(child, "type", "symbol"))
        symbols.append(SymbolRange(node=child, symbol_name=symbol_name, symbol_kind=symbol_kind))

    return symbols


def _has_meaningful_module_code(language: str, root: object) -> bool:
    statement_types = MODULE_STATEMENT_TYPES.get(language, set())
    for child in _iter_named_children(root):
        if getattr(child, "type", "") in statement_types:
            return True
    return False


def _split_symbol_chunks(
    *,
    repo: str,
    file_path: str,
    language: str,
    source_lines: list[str],
    source_bytes: bytes,
    symbol: SymbolRange,
    max_symbol_lines: int,
) -> list[CodeChunk]:
    node = symbol.node
    start_line, end_line = _node_lines(node)
    line_count = end_line - start_line + 1

    if line_count <= max_symbol_lines:
        text = _extract_node_text(source_bytes, node)
        return [
            make_chunk(
                repo=repo,
                file_path=file_path,
                language=language,
                symbol_name=symbol.symbol_name,
                symbol_kind=symbol.symbol_kind,
                start_line=start_line,
                end_line=end_line,
                chunk_type="symbol",
                content=text,
                symbol_path=f"{symbol.symbol_name}:{start_line}-{end_line}",
            )
        ]

    split_chunks: list[CodeChunk] = []
    child_index = 0
    for child in _iter_named_children(node):
        c_start, c_end = _node_lines(child)
        if c_end < c_start:
            continue
        child_text = _extract_node_text(source_bytes, child)
        child_index += 1
        split_chunks.append(
            make_chunk(
                repo=repo,
                file_path=file_path,
                language=language,
                symbol_name=symbol.symbol_name,
                symbol_kind=symbol.symbol_kind,
                start_line=c_start,
                end_line=c_end,
                chunk_type="symbol-child",
                content=child_text,
                symbol_path=f"{symbol.symbol_name}:{start_line}-{end_line}#child-{child_index}",
            )
        )

    if split_chunks:
        return split_chunks

    # If child splitting is not possible, fall back to one symbol chunk.
    return [
        make_chunk(
            repo=repo,
            file_path=file_path,
            language=language,
            symbol_name=symbol.symbol_name,
            symbol_kind=symbol.symbol_kind,
            start_line=start_line,
            end_line=end_line,
            chunk_type="symbol",
            content=_line_slice(source_lines, start_line, end_line),
            symbol_path=f"{symbol.symbol_name}:{start_line}-{end_line}",
        )
    ]


def _fallback_chunks(
    *,
    repo: str,
    file_path: str,
    language: str,
    source_lines: list[str],
    error: Exception,
    chunk_line_size: int = 200,
) -> list[CodeChunk]:
    chunks: list[CodeChunk] = []
    total_lines = len(source_lines)
    if total_lines == 0:
        total_lines = 1
        source_lines = [""]

    index = 0
    for start in range(1, total_lines + 1, chunk_line_size):
        index += 1
        end = min(start + chunk_line_size - 1, total_lines)
        content = _line_slice(source_lines, start, end)
        chunks.append(
            make_chunk(
                repo=repo,
                file_path=file_path,
                language=language,
                symbol_name=f"fallback-{index}",
                symbol_kind="fallback",
                start_line=start,
                end_line=end,
                chunk_type="fallback",
                content=content,
                symbol_path=f"fallback:{start}-{end}",
                parse_status="error",
                error_type=type(error).__name__,
                error_message=str(error).strip()[:240],
                fallback_mode="coarse-lines",
            )
        )

    return chunks


def chunk_source(
    *,
    repo: str,
    file_path: str,
    source: str,
    max_symbol_lines: int = 120,
) -> list[CodeChunk]:
    normalized_path = normalize_file_path(file_path)
    language = detect_language(normalized_path)
    source_lines = source.splitlines()
    source_bytes = source.encode("utf-8")

    try:
        root = _parse_root(language, source)
        symbols = _top_level_symbols(language, root, source_lines)

        chunks: list[CodeChunk] = []
        for symbol in symbols:
            chunks.extend(
                _split_symbol_chunks(
                    repo=repo,
                    file_path=normalized_path,
                    language=language,
                    source_lines=source_lines,
                    source_bytes=source_bytes,
                    symbol=symbol,
                    max_symbol_lines=max_symbol_lines,
                )
            )

        if _has_meaningful_module_code(language, root):
            module_content = source
            chunks.append(
                make_chunk(
                    repo=repo,
                    file_path=normalized_path,
                    language=language,
                    symbol_name="module",
                    symbol_kind="module",
                    start_line=1,
                    end_line=max(1, len(source_lines)),
                    chunk_type="module",
                    content=module_content,
                    symbol_path="module:1-end",
                )
            )

        if chunks:
            return chunks

        # If parsing succeeds but no symbol-level chunks are found, emit a module chunk.
        return [
            make_chunk(
                repo=repo,
                file_path=normalized_path,
                language=language,
                symbol_name="module",
                symbol_kind="module",
                start_line=1,
                end_line=max(1, len(source_lines)),
                chunk_type="module",
                content=source,
                symbol_path="module:1-end",
            )
        ]
    except Exception as exc:
        return _fallback_chunks(
            repo=repo,
            file_path=normalized_path,
            language=language,
            source_lines=source_lines,
            error=exc,
        )
