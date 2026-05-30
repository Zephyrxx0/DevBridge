# Phase 27: Model Migration: Replace Qwen with Google AI Studio (Gemini) and Clean Up Local Dependencies - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 27-model-migration-replace-qwen-with-google-ai-studio-gemini-an
**Areas discussed:** Big Model Selection, Gemma Hosting, API Key Mgmt, Cleanup Depth, Python SDK Choice

---

## Big Model Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Gemini 1.5 Pro | Maximum reasoning depth, higher cost/latency. | |
| Gemini 1.5 Flash | Faster, much cheaper, good enough for most tasks. | |
| gemini-2.5-flash | Native audio preview 12-2025 version. | ✓ |

**User's choice:** gemini-2.5-flash (with thinking_budget: -1)
**Notes:** User provided specific code snippets and model identifiers for Gemini 2.5 Flash and Gemma 4.

---

## Analysis & Code Model

**User's choice:** gemma-4-26b-a4b-it (with thinking_level: "HIGH")
**Notes:** To be used via Google AI Studio for background tasks like report generation.

---

## Gemma Hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Local (MI300X) | Keeps local Fast path for privacy/speed. | |
| Move to AI Studio | Simpler infrastructure, no local VRAM needed. | ✓ |

**User's choice:** Move to AI Studio

---

## API Key Mgmt

| Option | Description | Selected |
|--------|-------------|----------|
| Standard .env | Standard Pydantic/Dotenv flow in api/core/config.py. | ✓ |
| Secrets Facade | Add to api/core/secrets.py. | |

**User's choice:** Standard .env

---

## Cleanup Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Logic Only | Remove Qwen code/config only. | |
| Deep Purge | Strip ROCm/AMD layers from Dockerfile/Compose. | ✓ |

**User's choice:** Deep Purge (Logic + Infra)

---

## Python SDK Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Python GenAI SDK | Maintain consistency with the existing Python FastAPI backend. | ✓ |
| Node.js SDK | For a separate Node.js service. | |

**User's choice:** Python GenAI SDK (specifically the new `google-genai` client)

---

## Claude's Discretion

- Specific implementation of `api/agents/nodes/router.py` logic.
- Order of Docker layer removal.

## Deferred Ideas

- None.
