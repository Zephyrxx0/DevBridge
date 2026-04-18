from __future__ import annotations

from pathlib import Path

EXCLUDED_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
}


def _segments(path: str) -> list[str]:
    return [segment for segment in path.replace("\\", "/").split("/") if segment]


def _has_excluded_dir(path: str) -> bool:
    for segment in _segments(path):
        if segment in EXCLUDED_DIRS:
            return True
    return False


def is_in_scope_source(path: str) -> bool:
    normalized = path.replace("\\", "/").lstrip("./")
    if _has_excluded_dir(normalized):
        return False

    if normalized.startswith("api/") and normalized.endswith(".py"):
        return True

    if normalized.startswith("web/src/") and (
        normalized.endswith(".ts") or normalized.endswith(".tsx")
    ):
        return True

    return False


def discover_source_candidates(
    repo_root: str,
    candidate_paths: list[str] | None = None,
) -> list[str]:
    root = Path(repo_root).resolve()

    resolved_candidates: list[str]
    if candidate_paths is None:
        resolved_candidates = []
        api_root = root / "api"
        web_root = root / "web" / "src"

        if api_root.exists():
            for file_path in api_root.rglob("*.py"):
                resolved_candidates.append(str(file_path))

        if web_root.exists():
            for pattern in ("*.ts", "*.tsx"):
                for file_path in web_root.rglob(pattern):
                    resolved_candidates.append(str(file_path))
    else:
        resolved_candidates = candidate_paths

    discovered: set[str] = set()
    for raw_path in resolved_candidates:
        path_obj = Path(raw_path)
        absolute = path_obj if path_obj.is_absolute() else (root / path_obj)

        if not absolute.exists() or not absolute.is_file():
            continue

        relative = absolute.resolve().relative_to(root).as_posix()
        if is_in_scope_source(relative):
            discovered.add(relative)

    return sorted(discovered)
