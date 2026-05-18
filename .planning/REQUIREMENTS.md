# Requirements: v0.2 Milestone

## Generated: 2026-05-09

This document maps the v0.2 milestone requirements to the architectural refinements defined in `AMD-AUDIT-SPEC.md`.

---

## Infrastructure Requirements

### IR-01: Single GPU VRAM Partitioning
- **Requirement**: Partition 192GB VRAM across models via `--gpu-memory-utilization`
- **Spec**: Big Model: 0.60, Fast Model: 0.20, Embedder/Reranker/OS: 0.20
- **Risk**: KV cache OOM at >48K tokens per request
- **Mitigation**: Enforce `FULL_FILE_MODE_THRESHOLD_TOKENS = 48_000`

### IR-02: Docker Volume for Cache
- **Requirement**: Bind Docker volume to instance's 5TB NVMe scratch disk
- **Path**: `/app/repo_cache` for persistent model/repo cache

### IR-03: Context Token Cap
- **Requirement**: Cap context at 48,000 tokens per request
- **Rationale**: ~4.8GB KV cache per request, safe within 60% VRAM partition

---

## Model Requirements

### MR-01: Big Model (Deep Reasoning)
- **Model**: `Qwen2.5-72B-Instruct-AWQ`
- **Partition**: 60% VRAM (~115GB)
- **Use Cases**: Code analysis, PR review, complex queries
- **Quantization**: AWQ for VRAM efficiency

### MR-02: Fast Model (Intent Classification)
- **Model**: `Gemma-4-9B-it`
- **Partition**: 20% VRAM (~38GB)
- **Use Cases**: Fast intent classification, simple routing
- **Route**: Binary `FAST` vs `DEEP` prompt

### MR-03: Embedding Model
- **Model**: Local embedding service (provider-agnostic)
- **Partition**: Within 20% VRAM pool
- **Use Cases**: Chunk vectorization, issue-to-file similarity

---

## Feature Requirements

### FR-01: Dual-Model Agent Orchestrator
- **Components**:
  - Fast Model: Intent classifier (binary: FAST/DEEP)
  - Big Model: Reasoning engine for DEEP queries
- **Fallback**: Fast Model for all queries if Big Model fails
- **Timeout**: 30s for Fast Model, 120s for Big Model

### FR-02: Knowledge Graph with Internal Resolution
- **Nodes**: Files, functions, classes, modules
- **Edges**: CALLS (internal only), DEFINES, IMPORTS
- **Resolution**: Drop external/unresolvable calls
- **Storage**: Supabase graph table with JSONB adjacency

### FR-03: Onboarding UX (Plan Generation)
- **Endpoint**: `/repo/${repoId}/start-here`
- **Mechanism**: Polling or SSE for intermediate states
- **Output**: Strict JSON schema for generated plan
- **Error Handling**: Retry with exponential backoff

### FR-04: GitHub Integration
- **Issue Mapping**: Pure pgvector cosine distance (no context spikes)
- **OAuth**: Extract `provider_token` from `auth.identities` for GitHub API
- **Rate Limits**: Use user's token to avoid shared PAT limits

### FR-05: Task Scheduling
- **Tool**: APScheduler inside FastAPI
- **Jobs**: Daily sync, cache cleanup, metrics collection
- **Alternative**: RQ/Redis if APScheduler insufficient

### FR-06: Admin Dashboard
- **AI**: Gemma 4 (or Fast Model) for summarization
- **Topic Extraction**: "Intern confusion" topics from query logs
- **No Clustering**: Skip pgvector clustering initially

### FR-07: UI Overhaul
- **Landing Page**: Modern landing page with feature highlights and value proposition.
- **Chat UI**: Interactive streaming feedback, better readability, and thread navigation.
- **Consistency**: Global application of shadcn/ui and consistent spacing/typography.

---

## Database Schema Requirements

### DR-01: Graph Table
```sql
CREATE TABLE repo_graph (
  repo_id UUID PRIMARY KEY,
  nodes JSONB,        -- {id, type, name, file_path}
  edges JSONB,        -- {from, to, type}
  updated_at TIMESTAMPTZ
);
```

### DR-2: Annotation Snippet
```sql
ALTER TABLE annotations
ADD COLUMN snippet_text TEXT;  -- For start_line/end_line healing
```

---

## Verification Criteria

1. **VRAM Utilization**: Each model uses ≤ allocated partition
2. **Dual-Model Fallback**: Fast Model works if Big Model fails
3. **Token Cap Enforcement**: No request exceeds 48K tokens
4. **Knowledge Graph**: Only internal symbol edges exist
5. **Onboarding UX**: Polling/SSE provides progress updates
6. **GitHub Auth**: Uses Supabase OAuth token, not shared PAT

---

*Generated from AMD-AUDIT-SPEC.md architectural refinements*
