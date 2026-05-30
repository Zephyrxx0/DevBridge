---
status: complete
completed_at: 2026-04-18
---

Completed quick task: git-hooks-fallow-entire

Results:
- Fixed false "fallow not installed" behavior by replacing deprecated `fallow analyze` usage with `fallow --production --summary` and command resolution fallback.
- Wired Entire commit/push hooks as versioned scripts under scripts/hooks.
- Added scripts/hooks/install.sh to install project-managed hooks into .git/hooks.
- Reinstalled local hooks from versioned sources.

Last action: ready to cherry-pick to additional branches.
