## Phase Planning

When starting work on a new phase:
- Always create and switch to a new branch named `phase-XX-<description>` before /gsd-discuss-phase
- Example: `git checkout -b phase-03-authentication`

## Local Dev Tools

This project uses several local dev tools:

### fallow
Analyzes code health (dead code, complexity, duplication). Runs automatically after every commit via `scripts/hooks/post-analysis`.
- Run manually: `npx --yes fallow --production`
- Check issues before committing to catch problems early

### entire
Session logging and state checkpointing. Automatically invoked on git hooks (post-commit, pre-push, etc).
- Used for tracking work sessions and state snapshots

### graphify
Knowledge graph for codebase understanding. Updates automatically after commits.
- Run manually to refresh: `graphify update .`
- Query relationships: `graphify query "<question>"`
- Explain concepts: `graphify explain "<concept>"`

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically), pleasantries, hedging.
Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift.
Code/commits/PRs: normal. Off: "stop caveman" / "normal mode".