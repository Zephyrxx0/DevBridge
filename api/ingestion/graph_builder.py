from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import text
from tree_sitter import QueryCursor
from tree_sitter_language_pack import get_parser


MAX_PARSE_BYTES = 2_000_000
SHADOW_BLESSED_LIBRARIES = {
    "react",
    "fastapi",
    "langchain",
    "pydantic",
    "sqlalchemy",
    "pytest",
    "next",
}
@dataclass(frozen=True)
class SourceFile:
    file_path: str
    content: str
    language: str


class GraphBuilder:
    def __init__(self, repo_id: str, engine: Any):
        self.repo_id = str(repo_id)
        self.engine = engine
        self.symbol_to_file: dict[str, str] = {}

    async def _resolve_repo_aliases(self) -> set[str]:
        aliases = {self.repo_id}
        async with self.engine.connect() as conn:
            row = (
                await conn.execute(
                    text(
                        """
                        SELECT id, name, github_url
                        FROM repositories
                        WHERE CAST(id AS text) = :rid
                        LIMIT 1
                        """
                    ),
                    {"rid": self.repo_id},
                )
            ).fetchone()

        if not row:
            return aliases

        mapping = row._mapping
        aliases.add(str(mapping.get("id") or self.repo_id))

        name = mapping.get("name")
        if isinstance(name, str) and name.strip():
            aliases.add(name.strip())

        github_url = mapping.get("github_url")
        if isinstance(github_url, str) and "github.com/" in github_url:
            cleaned = github_url.strip().rstrip("/")
            tail = cleaned.split("github.com/", 1)[1]
            parts = [p for p in tail.split("/") if p]
            if len(parts) >= 2:
                aliases.add(f"{parts[0]}/{parts[1]}")

        return aliases

    async def _load_source_files(self) -> list[SourceFile]:
        aliases = sorted(await self._resolve_repo_aliases())[:3]
        while len(aliases) < 3:
            aliases.append(self.repo_id)
        params = {"a": aliases[0], "b": aliases[1], "c": aliases[2]}

        query = text(
            """
            SELECT file_path, content, language
            FROM code_chunks
            WHERE (repo = :a OR repo = :b OR repo = :c)
              AND chunk_type = 'file'
            """
        )

        async with self.engine.connect() as conn:
            rows = (await conn.execute(query, params)).fetchall()

        files: dict[str, SourceFile] = {}
        for row in rows:
            m = row._mapping
            file_path = str(m.get("file_path") or "").strip().replace("\\", "/")
            if not file_path:
                continue
            content = m.get("content") or ""
            if not isinstance(content, str) or not content:
                continue
            if len(content.encode("utf-8", errors="ignore")) > MAX_PARSE_BYTES:
                continue
            language = str(m.get("language") or "").lower()
            files[file_path] = SourceFile(file_path=file_path, content=content, language=language)

        return list(files.values())

    def _ts_language(self, file_path: str) -> str | None:
        suffix = Path(file_path).suffix.lower()
        if suffix == ".py":
            return "python"
        if suffix in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
            return "typescript"
        return None

    def _query_capture_texts(self, language: str, source: str, query_text: str) -> list[str]:
        parser = get_parser(language)
        tree = parser.parse(source.encode("utf-8"))
        query = parser.language.query(query_text)
        captures_by_name = QueryCursor(query).captures(tree.root_node)
        source_bytes = source.encode("utf-8")
        values: list[str] = []
        for nodes in captures_by_name.values():
            for node in nodes:
                text_value = source_bytes[node.start_byte : node.end_byte].decode("utf-8").strip()
                if text_value:
                    values.append(text_value)
        return values

    def _python_discover_exports(self, source: str) -> set[str]:
        query = """
        (function_definition name: (identifier) @symbol)
        (class_definition name: (identifier) @symbol)
        """
        return set(self._query_capture_texts("python", source, query))

    def _typescript_discover_exports(self, source: str) -> set[str]:
        query = """
        (export_statement declaration: (function_declaration name: (identifier) @symbol))
        (export_statement declaration: (class_declaration name: (type_identifier) @symbol))
        (export_statement declaration: (lexical_declaration (variable_declarator name: (identifier) @symbol)))
        """
        return set(self._query_capture_texts("typescript", source, query))

    async def discover_symbols(self) -> dict[str, str]:
        files = await self._load_source_files()
        symbol_map: dict[str, str] = {}

        for file in files:
            ts_lang = self._ts_language(file.file_path)
            if ts_lang is None:
                continue
            try:
                symbols = self._python_discover_exports(file.content) if ts_lang == "python" else self._typescript_discover_exports(file.content)
            except Exception:
                symbols = set()
            for symbol in symbols:
                symbol_map.setdefault(symbol, file.file_path)

        self.symbol_to_file = symbol_map
        return symbol_map

    async def resolve_relationships(self) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
        if not self.symbol_to_file:
            await self.discover_symbols()

        files = await self._load_source_files()
        file_paths = {f.file_path for f in files}
        nodes: dict[str, dict[str, str]] = {}
        edges: set[tuple[str, str, str]] = set()

        for path in file_paths:
            nodes[path] = {"id": path, "type": "file", "name": Path(path).name, "file_path": path}

        for file in files:
            ts_lang = self._ts_language(file.file_path)
            if ts_lang is None:
                continue
            try:
                if ts_lang == "python":
                    modules, imported_symbols = self._python_import_candidates(file.content)
                    called_symbols = self._python_call_symbols(file.content)
                else:
                    modules, imported_symbols = self._typescript_import_candidates(file.content)
                    called_symbols = self._typescript_call_symbols(file.content)
            except Exception:
                continue

            for symbol in imported_symbols:
                target = self.symbol_to_file.get(symbol)
                if target and target != file.file_path:
                    edges.add((file.file_path, target, "IMPORTS"))

            for module in modules:
                module = module.strip("'\"")
                if module.startswith(".") or module.startswith("/"):
                    continue
                module_root = module.split("/")[0].split(".")[0]
                if module_root in SHADOW_BLESSED_LIBRARIES:
                    shadow_id = self._shadow_node_id(module_root)
                    nodes[shadow_id] = {
                        "id": shadow_id,
                        "type": "shadow",
                        "name": module_root,
                        "file_path": module_root,
                    }
                    edges.add((file.file_path, shadow_id, "IMPORTS"))
                    continue

                for module_path in self._module_to_paths(module):
                    if module_path in file_paths and module_path != file.file_path:
                        edges.add((file.file_path, module_path, "IMPORTS"))

            for symbol in called_symbols:
                target = self.symbol_to_file.get(symbol)
                if target and target != file.file_path:
                    edges.add((file.file_path, target, "CALLS"))

        edge_docs = [{"from": fr, "to": to, "type": typ} for fr, to, typ in sorted(edges)]
        node_docs = sorted(nodes.values(), key=lambda item: item["id"])
        return node_docs, edge_docs

    async def build_graph(self) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
        await self.discover_symbols()
        return await self.resolve_relationships()

    def _module_to_paths(self, module_name: str) -> set[str]:
        if not module_name:
            return set()
        normalized = module_name.replace(".", "/")
        return {f"{normalized}.py", f"{normalized}/__init__.py", f"{normalized}.ts", f"{normalized}.tsx", normalized}

    def _python_import_candidates(self, source: str) -> tuple[set[str], set[str]]:
        import_query = """
        (import_statement name: (dotted_name) @module)
        (import_from_statement module_name: (dotted_name) @module)
        (import_from_statement name: (dotted_name) @symbol)
        (import_from_statement name: (aliased_import name: (dotted_name) @symbol))
        """
        values = self._query_capture_texts("python", source, import_query)
        modules: set[str] = set()
        symbols: set[str] = set()
        for value in values:
            if "." in value and value[0].islower() and value.split(".")[-1][0].islower():
                modules.add(value)
            elif value and value[0].islower() and "/" not in value:
                modules.add(value)
            symbol = value.split(".")[-1]
            if symbol:
                symbols.add(symbol)
        return modules, symbols

    def _python_call_symbols(self, source: str) -> set[str]:
        call_query = """
        (call function: (identifier) @call)
        (call function: (attribute attribute: (identifier) @call))
        """
        return set(self._query_capture_texts("python", source, call_query))

    def _typescript_import_candidates(self, source: str) -> tuple[set[str], set[str]]:
        module_query = """
        (import_statement source: (string (string_fragment) @module))
        """
        symbol_query = """
        (import_specifier name: (identifier) @symbol)
        (import_specifier alias: (identifier) @symbol)
        (namespace_import (identifier) @symbol)
        """
        modules = set(self._query_capture_texts("typescript", source, module_query))
        symbols = set(self._query_capture_texts("typescript", source, symbol_query))
        return modules, symbols

    def _typescript_call_symbols(self, source: str) -> set[str]:
        call_query = """
        (call_expression function: (identifier) @call)
        (call_expression function: (member_expression property: (property_identifier) @call))
        """
        return set(self._query_capture_texts("typescript", source, call_query))

    def _shadow_node_id(self, library: str) -> str:
        return f"shadow:{library}"
