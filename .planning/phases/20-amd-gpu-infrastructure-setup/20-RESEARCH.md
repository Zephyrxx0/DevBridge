# Phase 20: AMD GPU Infrastructure Setup - Research

**Researched:** 2026-05-09
**Domain:** Infrastructure, Model Inference
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Separate vLLM Containers. Run two independent vLLM containers with strict `--gpu-memory-utilization` flags (e.g., 0.60 and 0.20).
- **D-02:** Direct Endpoint Calling. API Gateway routes requests via application logic explicitly targeting ports (e.g., 8000 and 8001).
- **D-03:** Vertex AI API for Embeddings. Use Google's hosted `text-embedding-004`.
- **D-04:** Docker Orchestration. Use a single `docker-compose.yml`.
- **D-05:** Enforcement Layer. Enforce 48K token cap at both layers (FastAPI Gateway primary).
- **D-06:** Rejection Behavior. Truncation + Warning.
- **D-07:** Truncation Priority. Drop older conversational history first, keep codebase chunks.
- **D-08:** Token Estimation. Use Exact HuggingFace Tokenizers for Qwen2.5 and Gemma-4 at FastAPI layer.
- **D-09:** Cache Structure. Use Isolated Directories (e.g., `/app/repo_cache/qwen`).
- **D-10:** Eviction Policy. Let cache grow. No cron scripts (Deferred to Phase 25).
- **D-11:** Permissions. Use Host User Mapping.
- **D-12:** Weights Download. Use Pre-download Script via `huggingface-cli`.

### the agent's Discretion
None - explicit choices were made for all gray areas.

### Deferred Ideas (OUT OF SCOPE)
- Cache eviction and automated disk cleanup (Deferred to Phase 25: Task Scheduling).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IR-01 | Single GPU VRAM Partitioning (0.60/0.20/0.20) | vLLM `--gpu-memory-utilization` confirmed per-instance via docs. |
| IR-02 | Docker Volume for Cache on NVMe | Docker volume bind mounts with host UID/GID standard practice. |
| IR-03 | Context Token Cap at 48,000 | FastAPI truncation using `transformers` AutoTokenizer before vLLM API call. |
</phase_requirements>

## Project Constraints (from GEMINI.md)
- Code health analysis active via `fallow` in git hooks. Ensure code passes complexity checks.
- Maintain `graphify` knowledge graph. Code updates require graph update.
- Tone strict caveman. Active voice. Terse. Fact-only.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| VRAM Partitioning | vLLM Containers | — | Native `--gpu-memory-utilization` arg enforces hardware boundaries. |
| Token Counting & Truncation | API / Backend (FastAPI) | vLLM | FastAPI holds exact tokenizers to pre-emptively truncate and warn. vLLM max limits act as final safeguard. |
| Model Weight Pre-download | Host (Script) | — | Prevents Docker vLLM startup timeouts and shared memory contention. |
| Embedding Inference | Vertex AI (External) | — | Decouples memory overhead from AMD GPU per D-03 decision. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rocm/vllm` | latest | LLM Inference | Official AMD-optimized Docker image. Supports native ROCm. |
| `transformers` | latest | Token Counting | Required for exact Qwen2.5 and Gemma-4 token estimation. |
| `huggingface_hub` | latest | Weight Download | Pre-downloads weights via CLI to avoid container timeouts. |

**Installation:**
```bash
# Add to api/requirements.txt
transformers
huggingface-hub
```

## Architecture Patterns

### System Architecture Diagram
(Conceptual Data Flow)
```
[User Request] -> [FastAPI Gateway]
                       |
               [Tokenization (transformers)] -> >48K? [Truncate History & Append Warning]
                       |
            (Intent Check / Routing)
             /                   \
        [FAST]                  [DEEP]
          |                        |
[vLLM Port 8001]          [vLLM Port 8000]
(20% VRAM, Gemma-4)      (60% VRAM, Qwen2.5)
```

### Recommended Project Structure
```
api/
├── core/
│   └── config.py        # Add ports, token limits, warnings.
├── utils/
│   └── tokenizer.py     # Manage transformers token counting.
docker-compose.yml       # Defines fastapi, db, vllm-deep, vllm-fast
scripts/
└── download_models.sh   # Huggingface CLI pre-download script.
```

### Pattern 1: vLLM Docker Compose Configuration (ROCm)
**What:** Mapping AMD hardware inside Docker.
**When to use:** Serving on ROCm stack.
**Example:**
```yaml
# Source: [WebSearch verified AMD patterns]
services:
  vllm-deep:
    image: rocm/vllm:latest
    ipc: host # Required
    devices:
      - "/dev/kfd:/dev/kfd"
      - "/dev/dri:/dev/dri"
    group_add:
      - video
    volumes:
      - ./repo_cache/qwen:/root/.cache/huggingface
    command: >
      --model Qwen/Qwen2.5-72B-Instruct-AWQ
      --gpu-memory-utilization 0.60
      --max-model-len 48000
      --port 8000
```

### Anti-Patterns to Avoid
- **Shared Cache Directory:** Pointing both vLLM containers to the exact same HF cache folder. Causes lock contention. Use isolated folders (e.g., `repo_cache/qwen` and `repo_cache/gemma`).
- **In-container Downloads:** Letting vLLM download 72B weights on first run. Causes health check timeouts and possible memory spikes. Pre-download via script.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | Regex/heuristic splitters | `transformers.AutoTokenizer` | Exact HuggingFace match required. Discrepancies cause OOM. |
| Context truncation | Substring slicing | Tokenizer `encode`/`decode` | Substrings corrupt multibyte characters and prompt structures. |

## Common Pitfalls

### Pitfall 1: Shared Memory Exhaustion (IPC)
**What goes wrong:** vLLM containers crash on startup.
**Why it happens:** Ray/vLLM needs host IPC for multi-process memory allocation.
**How to avoid:** Always set `ipc: host` and `shm_size: '8gb'` (or higher) in `docker-compose.yml` for vLLM services.
**Warning signs:** "Bus error" or "cannot allocate shared memory".

## Code Examples

Verified patterns from official sources:

### FastAPI Token Counting and Truncation
```python
# Source: [HuggingFace Transformers Docs]
from transformers import AutoTokenizer

# Load tokenizer once at startup (downloaded weights assumed local)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-72B-Instruct-AWQ")

def enforce_cap(messages: list, codebase_chunk: str, max_tokens: int = 48000) -> tuple[list, bool]:
    # Keep codebase chunk. Drop oldest messages if over cap.
    # Return (truncated_messages, warning_flag).
    pass
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `docker` | Containerization | ✓ | 29.1.5 | — |
| `docker-compose` | Orchestration | ✓ | v5.0.1 | — |
| `rocm-smi` / ROCm | AMD GPU Stack | ✗ | — | Available on target instance. No local fallback. |
| `transformers` | Token Counting | ✗ | — | Add to `api/requirements.txt` |

**Missing dependencies with no fallback:**
- ROCm drivers missing locally but required on execution target. Proceed with configuration knowing deployment environment holds hardware.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest |
| Config file | `pytest.ini` |
| Quick run command | `pytest tests/ -m "not e2e"` |
| Full suite command | `pytest tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IR-03 | Enforce 48K cap | unit | `pytest tests/test_phase20_truncation.py -x` | ❌ Wave 0 |
| IR-01 | Config flags read | unit | `pytest tests/test_phase20_config.py -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/ -m "not e2e"`
- **Per wave merge:** `pytest tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_phase20_truncation.py` — covers IR-03 truncation logic
- [ ] `tests/test_phase20_config.py` — verifies config variables

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `transformers` token parsing. FastAPI Pydantic schema validation. |
| V4 Access Control | yes | Docker volume mount UID/GID mapping prevents host root escalation. |

### Known Threat Patterns for FastAPI / Docker

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unbounded prompt DOS | Availability | `MAX_CONTEXT_TOKENS` strict enforcement before inference queue. |
| Container escape | Privilege | Drop privileges. `seccomp:unconfined` only if required. Use explicit `user: $UID:$GID` on mounts. |

## Sources

### Primary (HIGH confidence)
- `/websites/vllm_ai_en` - vLLM Memory Utilization Config.
- Official Docker setup - IPC and device mappings for ROCm.

### Secondary (MEDIUM confidence)
- WebSearch verified with GitHub configs - `/dev/kfd` and `/dev/dri` mappings.

## Open Questions (RESOLVED)

1. **How to run two models concurrently?** — RESOLVED: Use two separate vLLM containers with strict `--gpu-memory-utilization` flags.
2. **Where to enforce token cap?** — RESOLVED: FastAPI gateway layer (primary) and vLLM (secondary).
3. **How to manage cache?** — RESOLVED: Isolated directories per model in `/app/repo_cache`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official vLLM docs.
- Architecture: HIGH - Matches Context constraints precisely.
- Pitfalls: HIGH - Documented ROCm IPC/SHM exhaustion issues well known.

**Research date:** 2026-05-09
**Valid until:** 2026-06-09
