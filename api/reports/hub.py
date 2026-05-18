from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ReportsHub:
    def __init__(self, reports_dir: str = "/app/reports") -> None:
        self.base_dir = Path(reports_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, filename: str) -> Path:
        candidate = Path(filename)
        if candidate.name != filename:
            raise ValueError("Invalid report filename")
        target = (self.base_dir / filename).resolve()
        if self.base_dir.resolve() not in target.parents and target != self.base_dir.resolve():
            raise ValueError("Invalid report filename")
        return target

    def save(self, filename: str, payload: str | dict[str, Any] | list[Any]) -> Path:
        target = self._safe_path(filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(payload, (dict, list)):
            target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        else:
            target.write_text(payload, encoding="utf-8")
        return target

    def list_reports(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for path in sorted(self.base_dir.glob("*")):
            if not path.is_file():
                continue
            stat = path.stat()
            out.append(
                {
                    "filename": path.name,
                    "size": stat.st_size,
                    "modified_at": stat.st_mtime,
                }
            )
        return out

    def get_report(self, filename: str) -> str:
        target = self._safe_path(filename)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError(filename)
        return target.read_text(encoding="utf-8")
