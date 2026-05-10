from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import text
from tree_sitter import QueryCursor
from tree_sitter_language_pack import get_parser


MAX_PARSE_BYTES = 2_000_000
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
        return [], []

    async def build_graph(self) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
        await self.discover_symbols()
        return [], []
