from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path


@dataclass(frozen=True)
class CodeChunk:
    repo: str
    file_path: str
    language: str
    symbol_name: str
    symbol_kind: str
    start_line: int
    end_line: int
    chunk_type: str
    content_hash: str
    chunk_id: str
    parse_status: str = "ok"
    error_type: str | None = None
    error_message: str | None = None
    fallback_mode: str | None = None
    content: str = ""


@dataclass(frozen=True)
class EmbeddingJob:
    """Payload for an asynchronous embedding generation job."""
    chunk_id: str
    repo: str
    file_path: str
    content: str
    attempt: int = 1
    max_retries: int = 3
    idempotency_key: str | None = None

    def to_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "repo": self.repo,
            "file_path": self.file_path,
            "content": self.content,
            "attempt": self.attempt,
            "max_retries": self.max_retries,
            "idempotency_key": self.idempotency_key or self.chunk_id,
        }


def normalize_file_path(file_path: str) -> str:
    normalized = file_path.replace("\\", "/")
    if normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized.strip("/")


def file_path_from_repo(repo_root: str, file_path: str) -> str:
    rel = Path(file_path).resolve().relative_to(Path(repo_root).resolve())
    return normalize_file_path(str(rel))


def content_hash(content: str) -> str:
    return sha256(content.encode("utf-8")).hexdigest()


def build_chunk_id(
    file_path: str,
    symbol_path: str,
    start_line: int,
    end_line: int,
    content_hash_value: str,
) -> str:
    normalized_path = normalize_file_path(file_path)
    identity = f"{normalized_path}|{symbol_path}|{start_line}|{end_line}|{content_hash_value}"
    return sha256(identity.encode("utf-8")).hexdigest()


def make_chunk(
    *,
    repo: str,
    file_path: str,
    language: str,
    symbol_name: str,
    symbol_kind: str,
    start_line: int,
    end_line: int,
    chunk_type: str,
    content: str,
    symbol_path: str | None = None,
    parse_status: str = "ok",
    error_type: str | None = None,
    error_message: str | None = None,
    fallback_mode: str | None = None,
) -> CodeChunk:
    chash = content_hash(content)
    resolved_symbol_path = symbol_path or symbol_name
    cid = build_chunk_id(
        file_path=file_path,
        symbol_path=resolved_symbol_path,
        start_line=start_line,
        end_line=end_line,
        content_hash_value=chash,
    )

    return CodeChunk(
        repo=repo,
        file_path=normalize_file_path(file_path),
        language=language,
        symbol_name=symbol_name,
        symbol_kind=symbol_kind,
        start_line=start_line,
        end_line=end_line,
        chunk_type=chunk_type,
        content_hash=chash,
        chunk_id=cid,
        parse_status=parse_status,
        error_type=error_type,
        error_message=error_message,
        fallback_mode=fallback_mode,
        content=content,
    )
