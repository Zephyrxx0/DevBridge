---
phase: 20-amd-gpu-infrastructure-setup
reviewed: 2026-05-09T18:45:10Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - api/core/config.py
  - api/requirements.txt
  - api/utils/tokenizer.py
  - api/routes/chats.py
  - docker-compose.yml
  - scripts/download_models.sh
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-05-09T18:45:10Z  
**Depth:** standard  
**Files Reviewed:** 6  
**Status:** issues_found  
**Mode:** advisory (non-blocking output requested)

## Summary

Reviewed phase-20 source changes for tokenizer cap enforcement, new inference-context route, and AMD/vLLM infra scripts. Found correctness defects in token-cap enforcement that can return over-limit payloads. Found additional robustness/security-quality defects in API schemas and infra consistency.

## Critical Issues

### CR-01 [BLOCKER]: Token cap bypass when `codebase_chunk` alone exceeds limit

**File:** `api/utils/tokenizer.py:59-64`  
**Issue:** `enforce_cap()` only removes chat messages. If `codebase_chunk` token count alone is greater than `max_tokens`, loop removes all messages then returns successfully with `running_total > max_tokens`. Result: function claims cap enforced but still returns over-cap context.

**Fix:** hard-fail or trim `codebase_chunk` when base chunk already exceeds cap.

```python
if chunk_tokens > max_tokens:
    # Option A: explicit failure
    raise ValueError("codebase_chunk exceeds max context token budget")
    # Option B: trim chunk to fit before processing messages
```

### CR-02 [BLOCKER]: Fail-open behavior disables cap on tokenizer errors

**File:** `api/utils/tokenizer.py:65-67`  
**Issue:** broad `except Exception` returns original messages and `warning=False`. Any tokenizer failure (model download/network/runtime) bypasses truncation and silently returns unbounded history.

**Fix:** fail closed. Return explicit error or conservative truncation path; never report success with uncapped payload.

```python
except Exception as exc:
    LOGGER.exception("Tokenizer enforcement failed")
    raise RuntimeError("Context enforcement unavailable") from exc
```

## Warnings

### WR-01 [WARNING]: Mutable default list in request model

**File:** `api/routes/chats.py:38`  
**Issue:** `sources: list[dict] = []` shares mutable default across instances.

**Fix:** use Pydantic `Field(default_factory=list)`.

```python
from pydantic import BaseModel, Field

class ChatMessageCreate(BaseModel):
    role: str
    content: str
    sources: list[dict] = Field(default_factory=list)
```

### WR-02 [WARNING]: Hardcoded warning text diverges from configurable cap

**File:** `api/routes/chats.py:270`  
**Issue:** Warning says `48K` regardless of `settings.max_context_tokens`. Misleading client output when env config changes.

**Fix:** derive message from settings.

```python
response["warning"] = (
    f"Context was trimmed to {settings.max_context_tokens} token limit. "
    "Older history removed."
)
```

### WR-03 [WARNING]: Internal exception details exposed to clients

**File:** `api/routes/chats.py:70,107,129,180,210,251,273,310`  
**Issue:** HTTP 503 details interpolate raw exception text (`{exc}`), leaking internals (DB errors, SQL errors, stack-derived messages).

**Fix:** return generic client message; log exception server-side.

```python
except Exception:
    logger.exception("Chat create unavailable")
    raise HTTPException(status_code=503, detail="Chat service unavailable")
```

### WR-04 [WARNING]: Inconsistent Gemma model identifier across components

**File:** `api/utils/tokenizer.py:9`, `docker-compose.yml:35`, `scripts/download_models.sh:16`  
**Issue:** Tokenizer uses `google/gemma-4-9b-it`; runtime/download use `Gemma-4-9B-it`. Mixed IDs risk tokenizer/runtime mismatch and cache divergence.

**Fix:** define one canonical model ID constant and reuse it in compose/script/docs.

```bash
# scripts/download_models.sh
GEMMA_MODEL="google/gemma-4-9b-it"
huggingface-cli download "$GEMMA_MODEL"
```

## Info

### IN-01 [WARNING]: Duplicate dependency declaration

**File:** `api/requirements.txt:4,7`  
**Issue:** `python-dotenv` listed twice (once unpinned, once version-constrained). Adds resolver ambiguity/noise.

**Fix:** keep single declaration with intended constraint.

---

_Reviewed: 2026-05-09T18:45:10Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
