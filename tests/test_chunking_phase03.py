from __future__ import annotations

from dataclasses import dataclass

import pytest

from api.ingestion.discovery import discover_source_candidates
from api.ingestion.tree_sitter_chunker import chunk_source
from api.ingestion.types import make_chunk


@dataclass
class FakeNode:
    type: str
    start_point: tuple[int, int]
    end_point: tuple[int, int]
    start_byte: int
    end_byte: int
    children: list["FakeNode"]
    is_named: bool = True


def _line_start_offsets(source: str) -> list[int]:
    offsets = [0]
    total = 0
    for line in source.splitlines(True):
        total += len(line)
        offsets.append(total)
    return offsets


def _byte_range_for_lines(source: str, start_line: int, end_line: int) -> tuple[int, int]:
    offsets = _line_start_offsets(source)
    start_byte = offsets[start_line - 1]
    end_byte = offsets[end_line]
    return start_byte, end_byte


def _build_python_root(source: str) -> FakeNode:
    fn_start, fn_end = _byte_range_for_lines(source, 1, 3)
    class_start, class_end = _byte_range_for_lines(source, 5, 13)

    method_start, method_end = _byte_range_for_lines(source, 6, 7)
    big_start, big_end = _byte_range_for_lines(source, 8, 12)

    method_node = FakeNode(
        type="function_definition",
        start_point=(5, 0),
        end_point=(7, 0),
        start_byte=method_start,
        end_byte=method_end,
        children=[],
    )
    big_node = FakeNode(
        type="function_definition",
        start_point=(7, 0),
        end_point=(12, 0),
        start_byte=big_start,
        end_byte=big_end,
        children=[],
    )

    fn_node = FakeNode(
        type="function_definition",
        start_point=(0, 0),
        end_point=(3, 0),
        start_byte=fn_start,
        end_byte=fn_end,
        children=[],
    )
    class_node = FakeNode(
        type="class_definition",
        start_point=(4, 0),
        end_point=(13, 0),
        start_byte=class_start,
        end_byte=class_end,
        children=[method_node, big_node],
    )
    expr_start, expr_end = _byte_range_for_lines(source, 14, 14)
    expr_node = FakeNode(
        type="expression_statement",
        start_point=(13, 0),
        end_point=(14, 0),
        start_byte=expr_start,
        end_byte=expr_end,
        children=[],
    )

    root_start, root_end = _byte_range_for_lines(source, 1, 14)
    return FakeNode(
        type="module",
        start_point=(0, 0),
        end_point=(14, 0),
        start_byte=root_start,
        end_byte=root_end,
        children=[fn_node, class_node, expr_node],
    )


def _build_ts_root(source: str) -> FakeNode:
    fn_start, fn_end = _byte_range_for_lines(source, 1, 3)
    cls_start, cls_end = _byte_range_for_lines(source, 5, 9)
    fn_node = FakeNode(
        type="function_declaration",
        start_point=(0, 0),
        end_point=(3, 0),
        start_byte=fn_start,
        end_byte=fn_end,
        children=[],
    )
    cls_node = FakeNode(
        type="class_declaration",
        start_point=(4, 0),
        end_point=(9, 0),
        start_byte=cls_start,
        end_byte=cls_end,
        children=[],
    )
    root_start, root_end = _byte_range_for_lines(source, 1, 9)
    return FakeNode(
        type="program",
        start_point=(0, 0),
        end_point=(9, 0),
        start_byte=root_start,
        end_byte=root_end,
        children=[fn_node, cls_node],
    )


def test_chunk_schema_and_deterministic_id() -> None:
    chunk_a = make_chunk(
        repo="devbridge",
        file_path="api/sample.py",
        language="python",
        symbol_name="demo",
        symbol_kind="function",
        start_line=1,
        end_line=4,
        chunk_type="symbol",
        content="def demo():\n    return 1\n",
        symbol_path="demo:1-4",
    )

    chunk_b = make_chunk(
        repo="devbridge",
        file_path="api/sample.py",
        language="python",
        symbol_name="demo",
        symbol_kind="function",
        start_line=1,
        end_line=4,
        chunk_type="symbol",
        content="def demo():\n    return 1\n",
        symbol_path="demo:1-4",
    )

    assert chunk_a.chunk_id == chunk_b.chunk_id
    assert chunk_a.repo == "devbridge"
    assert chunk_a.file_path == "api/sample.py"
    assert chunk_a.language == "python"
    assert chunk_a.symbol_name == "demo"
    assert chunk_a.symbol_kind == "function"
    assert chunk_a.start_line == 1
    assert chunk_a.end_line == 4
    assert chunk_a.chunk_type == "symbol"
    assert chunk_a.content_hash


def test_file_discovery_scope_filters(tmp_path) -> None:
    (tmp_path / "api").mkdir(parents=True)
    (tmp_path / "web" / "src").mkdir(parents=True)
    (tmp_path / "web" / "tests").mkdir(parents=True)
    (tmp_path / "web" / "src" / ".next").mkdir(parents=True)
    (tmp_path / "node_modules").mkdir(parents=True)

    in_api = tmp_path / "api" / "main.py"
    in_ts = tmp_path / "web" / "src" / "app.ts"
    in_tsx = tmp_path / "web" / "src" / "view.tsx"
    out_test = tmp_path / "web" / "tests" / "foo.ts"
    out_node_modules = tmp_path / "node_modules" / "x.py"
    out_next = tmp_path / "web" / "src" / ".next" / "index.ts"

    for file_path in [in_api, in_ts, in_tsx, out_test, out_node_modules, out_next]:
        file_path.write_text("x", encoding="utf-8")

    discovered = discover_source_candidates(repo_root=str(tmp_path))

    assert "api/main.py" in discovered
    assert "web/src/app.ts" in discovered
    assert "web/src/view.tsx" in discovered
    assert "web/tests/foo.ts" not in discovered
    assert "node_modules/x.py" not in discovered
    assert "web/src/.next/index.ts" not in discovered


def test_semantic_chunking_python_and_tsx(monkeypatch) -> None:
    python_source = """def top_one():
    x = 1
    return x

class Feature:
    def small(self):
        return 1

    def big(self):
        a = 1
        b = 2
        c = 3
        return a + b + c

print('module run')
"""

    tsx_source = """function renderA() {
  return 1;
}

class Widget {
  run() {
    return 2;
  }
}
"""

    def fake_parse(language: str, source: str):
        if language == "python":
            return _build_python_root(source)
        if language == "typescript":
            return _build_ts_root(source)
        raise AssertionError("unexpected language")

    monkeypatch.setattr("api.ingestion.tree_sitter_chunker._parse_root", fake_parse)

    python_chunks = chunk_source(
        repo="devbridge",
        file_path="api/demo.py",
        source=python_source,
        max_symbol_lines=3,
    )
    tsx_chunks = chunk_source(
        repo="devbridge",
        file_path="web/src/demo.tsx",
        source=tsx_source,
    )

    assert any(chunk.symbol_kind == "function" for chunk in python_chunks)
    assert any(chunk.symbol_kind == "class" for chunk in python_chunks)
    assert any(chunk.chunk_type == "module" for chunk in python_chunks)
    assert any(chunk.chunk_type == "symbol-child" for chunk in python_chunks)

    assert any(chunk.symbol_kind == "function" for chunk in tsx_chunks)
    assert any(chunk.symbol_kind == "class" for chunk in tsx_chunks)


def test_hybrid_fallback_on_parse_failure(monkeypatch) -> None:
    monkeypatch.setattr(
        "api.ingestion.tree_sitter_chunker._parse_root",
        lambda _language, _source: (_ for _ in ()).throw(RuntimeError("parse failed: invalid syntax")),
    )

    chunks = chunk_source(
        repo="devbridge",
        file_path="api/broken.py",
        source="def broken(:\n    pass\n",
    )

    assert chunks
    assert all(chunk.parse_status == "error" for chunk in chunks)
    assert all(chunk.chunk_type == "fallback" for chunk in chunks)
    assert all(chunk.fallback_mode == "coarse-lines" for chunk in chunks)
    assert all(chunk.error_type == "RuntimeError" for chunk in chunks)
    assert all("parse failed" in (chunk.error_message or "") for chunk in chunks)
