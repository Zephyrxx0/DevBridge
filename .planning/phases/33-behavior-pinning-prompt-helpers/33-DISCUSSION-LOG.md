# Phase 33: Behavior Pinning & Prompt Helpers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 33-Behavior Pinning & Prompt Helpers
**Areas discussed:** Prompt contract, Chip scope display, Submit behavior, Onboarding guardrail

---

## Prompt Contract

| Question | Options | Selected |
|----------|---------|----------|
| Primary helper return shape | Three-part result; Payload plus metadata; Exact string builder; You decide | Three-part result |
| Failed file/folder loads | Include failure note; Omit failed refs; Block send; You decide | Include failure note |
| `@path` mentions | Labels only; Fetch content; Deferred follow-up; You decide | Labels only |
| Test strictness | Snapshot key strings; Semantic only; Golden fixtures; You decide | Snapshot key strings |

**Notes:** Visible user text and backend prompt must stay separated. Existing mention behavior remains lightweight.

---

## Chip Scope Display

| Question | Options | Selected |
|----------|---------|----------|
| Chip labels | Type plus scope; Filename only; Verbose badges; You decide | Type plus scope |
| Folder cap communication | Show fixed cap text; Show actual count; Warn only on send; You decide | Show fixed cap text |
| Chip type shape | Discriminated union; Keep optional kind; Separate types; You decide | Discriminated union |
| Removal behavior | Immediate remove; Undo affordance; Confirm folders only; You decide | Immediate remove |

**Notes:** Scope/cap clarity is required before send, but no new confirmation/undo flow.

---

## Submit Behavior

| Question | Options | Selected |
|----------|---------|----------|
| Required parity | Keyboard semantics; Button semantics only; Full event parity; You decide | Keyboard semantics |
| Submit API | Typed value callback; AI-elements message callback; Route-owned handler; You decide | Typed value callback |
| PromptInput attachments | Existing chips only; Adopt attachments; Stub future support; You decide | Existing chips only |
| Stop generation | Preserve only; Type callback now; Improve abort state; You decide | Preserve only |

**Notes:** Phase 33 removes synthetic submit/ref-cast debt without adding runtime file attachment behavior or liveness improvements.

---

## Onboarding Guardrail

| Question | Options | Selected |
|----------|---------|----------|
| Untouchable behavior | Full flow states; Completion only; Visual parity too; You decide | Full flow states |
| Cached plan reuse | Must preserve; Can simplify; Test only hook; You decide | Must preserve |
| Extraction scope | Tests only; Small helper extract; Move ownership now; You decide | Tests only |
| Regression evidence | Hook plus render tests; E2E only; No new tests; You decide | Hook plus render tests |

**Notes:** Onboarding is a behavior guardrail for this phase, not a refactor target.

---

## the agent's Discretion

No decisions were delegated with "You decide".

## Deferred Ideas

- Fetching file contents for `@path` mentions.
- Transport abort/liveness state improvements.
- Onboarding ownership extraction.
- GitHub SameSite cookie warning todo.
