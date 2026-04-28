# Project Capabilities

DevBridge is not only chat.

It is workspace for repo understanding, retrieval, and team memory.

## Core workflows

## Chat

- Ask architecture questions, implementation intent, cross-file behavior.
- Streaming responses from `/chat/stream` with grounded context.
- Use when you need fast "why" answer with source-backed context.

Open app: [/repo/demo](/repo/demo)

## Map

- Inspect repository map and hotspots.
- Understand knowledge density and navigation priorities.
- Jump from map to file-level exploration.

Open app: [/repo/demo/map](/repo/demo/map)

## Search

- Search semantic intent and symbols.
- Find relevant chunks fast before deep chat session.
- Useful for targeted code lookup.

Open app: [/repo/demo/search](/repo/demo/search)

## Annotations

- Capture team context on files/lines.
- Keep gotchas, architecture notes, and TODO context persistent.
- Upvote useful notes to surface signal.

Open app: [/repo/demo/annotations](/repo/demo/annotations)

## PR Review

- Trigger PR analysis and review summaries.
- Tie findings to files and repository context.
- Works via webhook + manual analyze path.

Open app: [/repo/demo/pr](/repo/demo/pr)

## Navbar features mapping

Floating header dropdown has 4 items. Each item maps to capability page + app page.

- Map -> this doc section + `/repo/demo/map`
- Search -> this doc section + `/repo/demo/search`
- Annotations -> this doc section + `/repo/demo/annotations`
- PRs -> this doc section + `/repo/demo/pr`
