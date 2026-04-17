#!/bin/sh
# Install project-managed Git hooks from scripts/hooks into .git/hooks.

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/scripts/hooks"
HOOK_DST="$REPO_ROOT/.git/hooks"

mkdir -p "$HOOK_DST"

for hook in commit-msg prepare-commit-msg post-commit pre-push post-analysis; do
    if [ -f "$HOOK_SRC/$hook" ]; then
        cp "$HOOK_SRC/$hook" "$HOOK_DST/$hook"
        chmod +x "$HOOK_DST/$hook" || true
        echo "[hooks] Installed $hook"
    fi
done

echo "[hooks] Installation complete"
