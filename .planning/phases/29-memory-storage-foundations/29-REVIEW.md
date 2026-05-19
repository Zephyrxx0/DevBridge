---
phase: 29-memory-storage-foundations
reviewed: 2026-05-19T19:05:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - api/main.py
  - api/tests/test_phase29_memory.py
  - api/db/cache.py
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-05-19T19:05:00Z  
**Depth:** standard  
**Files Reviewed:** 3  
**Status:** issues_found

## Summary

Reviewed phase 29-04 source changes (`api/main.py`, `api/tests/test_phase29_memory.py`) plus called cache key builder (`api/db/cache.py`). Auth guard for missing `user_id` now present and tests cover basic rejection/isolation. Found one shipping blocker: response cache key omits authenticated user identity, enabling cross-user response reuse. Also found two warning-level robustness gaps.

## Critical Issues (BLOCKER)

### CR-01: Chat cache key omits authenticated user identity (cross-user data leak)

**Classification:** BLOCKER  
**File:** `api/main.py:397`, `api/main.py:485`, `api/db/cache.py:88-108`  
**Issue:** `/chat` and `/chat/stream` responses are cached with `repo_id_key_builder`, but that builder does not include `request.state.user_id`. Cache key effectively depends on namespace/repo/function/args payload, so two different authenticated users with same payload can receive each other’s cached response. This breaks memory isolation and can disclose prior user output.

**Fix:** Include authenticated `user_id` in cache key (and fail closed when missing). Example:

```python
def repo_id_key_builder(func, namespace: str = "", request=None, response=None, args=None, kwargs=None):
    from fastapi_cache import FastAPICache

    req = None
    if kwargs and "request" in kwargs:
        req = kwargs["request"]
    elif args:
        req = next((a for a in args if hasattr(a, "state")), None)

    user_id = getattr(getattr(req, "state", None), "user_id", None) or "anonymous"

    payload = kwargs or {}
    prefix = FastAPICache.get_prefix()
    return f"{prefix}:{namespace}:{user_id}:{func.__module__}:{func.__name__}:{payload}"
```

## Warnings

### WR-01: Unbounded `thread_id` default causes cross-session thread collision risk

**Classification:** WARNING  
**File:** `api/main.py:326`  
**Issue:** `ChatRequest.thread_id` defaults to constant `"default-thread"`. Clients that omit `thread_id` share one conversation thread, causing unintended context mixing and hard-to-debug behavior.

**Fix:** Make `thread_id` required or generate per-request UUID when omitted.

```python
class ChatRequest(BaseModel):
    message: str
    thread_id: str  # required
    repo_id: Optional[str] = None
```

### WR-02: Tests mutate global FastAPICache without teardown isolation

**Classification:** WARNING  
**File:** `api/tests/test_phase29_memory.py:31`, `api/tests/test_phase29_memory.py:60`  
**Issue:** Each test calls `FastAPICache.init(...)` on shared global cache state without reset fixture. In larger suite runs this can cause hidden coupling/order dependence.

**Fix:** Use fixture that initializes and clears cache around each test.

```python
import pytest

@pytest.fixture(autouse=True)
def cache_isolation():
    FastAPICache.init(InMemoryBackend(), prefix="phase29-test")
    yield
    FastAPICache.reset()
```

---

_Reviewed: 2026-05-19T19:05:00Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
