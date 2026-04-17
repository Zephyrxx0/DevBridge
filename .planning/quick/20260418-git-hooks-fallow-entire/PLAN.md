---
quick_id: 20260418
slug: git-hooks-fallow-entire
status: complete
created_at: 2026-04-18
---

Fix Git hook reliability for commit/push workflows.

Scope:
- Fix post-analysis hook so fallow uses the current CLI command surface.
- Make hook binaries resolve from repo-local .venv on Windows/Git Bash.
- Ensure entire hooks are wired for commit and push in versioned hook templates.
- Add a repeatable installer to sync scripts/hooks into .git/hooks.

Execution notes:
- Updated scripts/hooks/post-analysis.
- Added scripts/hooks/{post-commit,pre-push,prepare-commit-msg,commit-msg,install.sh}.
- Installed hooks into .git/hooks via scripts/hooks/install.sh.
- Validated hook scripts are executable and present.
