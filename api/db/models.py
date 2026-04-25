from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class CodeChunkHistoryLink:
    repo: str
    file_path: str
    chunk_id: str
    commit_sha: str | None
    pr_number: int | None


@dataclass
class PullRequestRecord:
    repo: str
    number: int
    title: str
    description: str
    summary: str
    author: str | None
    merged_at: datetime | None
