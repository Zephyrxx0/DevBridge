# DevBridge — Enhanced System Design
### Google Solutions Hackathon Edition · Agentic AI + GCP Free Tier

> **DevBridge** is a persistent, team-aware knowledge system for codebases — powered by a multi-agent AI layer grounded in real code, human annotations, and PR history.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [What Changed from v1](#2-what-changed-from-v1)
3. [High-Level Architecture](#3-high-level-architecture)
4. [GCP Infrastructure (Free Tier)](#4-gcp-infrastructure-free-tier)
5. [Agentic AI Layer](#5-agentic-ai-layer)
6. [Agent Definitions & Tool Schemas](#6-agent-definitions--tool-schemas)
7. [RAG Pipeline](#7-rag-pipeline)
8. [Chunking Strategy](#8-chunking-strategy)
9. [Code Ingestion Pipeline](#9-code-ingestion-pipeline)
10. [Frontend](#10-frontend)
11. [Backend API](#11-backend-api)
12. [Database Schema](#12-database-schema)
13. [Comment System](#13-comment-system)
14. [PR Analysis Agent](#14-pr-analysis-agent)
15. [API Design](#15-api-design)
16. [Security](#16-security)
17. [Failure Modes & Mitigations](#17-failure-modes--mitigations)
18. [Scaling Strategy](#18-scaling-strategy)
19. [Hackathon Build Plan](#19-hackathon-build-plan)

---

## 1. Overview & Philosophy

DevBridge answers one question: *"Why does this codebase work the way it does?"*

It is **not** a code autocomplete tool. It is a knowledge retrieval system with an agent layer that can reason across code, history, and human annotations to give contextually grounded answers.

### Core Principles

| Principle | Meaning |
|---|---|
| **Retrieval over generation** | Every LLM response must be grounded in retrieved chunks — hallucination is a first-class failure |
| **Memory over statelessness** | The system learns from usage: annotations, past Q&A, and PR patterns accumulate |
| **Context over completion** | The goal is developer *understanding*, not producing output |
| **Agent over pipeline** | Instead of a fixed RAG pipeline, a coordinating agent decides *how* to answer a query |

---

## 2. What Changed from v1

| Area | v1 | v2 (This Doc) |
|---|---|---|
| AI Layer | Single LLM call | Multi-agent orchestration with tool use |
| GCP | Not present | Cloud Run, Vertex AI, GCS, Pub/Sub, Secret Manager |
| Retrieval | Fixed vector search | Agent-selected retrieval strategy (vector + keyword + symbol) |
| Backend | Generic FastAPI | FastAPI with Vertex AI SDK + agent loop |
| Ingestion | Background processing (vague) | Pub/Sub-triggered pipeline on Cloud Run |
| LLM | Any LLM | Gemini 1.5 Flash (free-tier friendly, long context) |
| Embeddings | Unspecified | `text-embedding-004` via Vertex AI |
| PR Analysis | Webhook → pipeline | Dedicated PR Review Agent |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                      │
│         Next.js · TailwindCSS · Monaco Editor · SSE          │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────────────┐
│               BACKEND API (Cloud Run — free tier)             │
│                      FastAPI · Python 3.12                    │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐    │
│   │              ORCHESTRATOR AGENT                      │    │
│   │   Receives query → selects strategy → calls tools   │    │
│   │   → assembles context → streams response            │    │
│   └──────┬──────────────┬──────────────┬───────────────┘    │
│          │              │              │                       │
│   ┌──────▼───┐  ┌───────▼──┐  ┌───────▼──────┐             │
│   │  Search  │  │  Debug   │  │  PR Review   │             │
│   │  Agent   │  │  Agent   │  │  Agent       │             │
│   └──────────┘  └──────────┘  └──────────────┘             │
└──────────┬──────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
┌───▼────────────┐              ┌─────────▼──────────┐
│ Supabase       │              │ Google Cloud        │
│ (PostgreSQL    │              │                     │
│  + pgvector)   │              │ • Vertex AI         │
│                │              │   (Gemini Flash +   │
│ • code_chunks  │              │    Embeddings)      │
│ • annotations  │              │ • Cloud Storage     │
│ • pull_requests│              │   (repo snapshots)  │
│ • questions    │              │ • Pub/Sub           │
│ • users        │              │   (ingestion queue) │
│ • repos        │              │ • Secret Manager    │
└────────────────┘              └────────────────────┘
                                          │
                              ┌───────────▼────────────┐
                              │  INGESTION PIPELINE     │
                              │  (Cloud Run Job)        │
                              │                         │
                              │  GitHub Webhook         │
                              │  → GCS                  │
                              │  → Pub/Sub              │
                              │  → Parse + Chunk        │
                              │  → Embed                │
                              │  → Supabase             │
                              └─────────────────────────┘
```

### Data Flow: Query

```
User query
  → Backend API (Cloud Run)
  → Orchestrator Agent
      → embed query (Vertex AI text-embedding-004)
      → decide strategy (vector? keyword? symbol lookup?)
      → call Search Agent tools
      → retrieve code_chunks + annotations from Supabase
  → assemble context window
  → stream response via Gemini 1.5 Flash
  → SSE to frontend
```

### Data Flow: Ingestion

```
GitHub webhook (push / PR)
  → Cloud Run endpoint
  → publish message to Pub/Sub topic: repo-ingestion
  → Cloud Run Job (subscriber)
      → fetch changed files from GitHub API
      → store raw files in GCS bucket
      → tree-sitter parse → chunk
      → Vertex AI embed (batch)
      → upsert into Supabase (code_chunks)
```

---

## 4. GCP Infrastructure (Free Tier)

All services below fit within Google Cloud's always-free tier or $300 new-account credits.

### Services Used

| Service | Purpose | Free Tier Limit | Notes |
|---|---|---|---|
| **Cloud Run** | Backend API + Ingestion Job | 2M req/month, 360K GB-s/month | Use 512MB RAM, 1 vCPU instances |
| **Vertex AI — Gemini 1.5 Flash** | LLM for agent reasoning | Free via AI Studio key or $300 credits | Flash is 8× cheaper than Pro; long 1M context window |
| **Vertex AI — text-embedding-004** | Code + query embeddings | ~$0.000025/1K tokens | Very low cost; use batch where possible |
| **Cloud Storage** | Raw repo file snapshots | 5GB free | Store only changed files per push |
| **Pub/Sub** | Async ingestion queue | 10GB/month free | Decouple webhook receipt from heavy parsing |
| **Secret Manager** | API keys, GitHub App credentials | 6 active versions, 10K ops/month free | Never put secrets in env vars |
| **Cloud Build** | CI/CD pipeline | 120 build-minutes/day free | Build & deploy to Cloud Run on push |

### Cloud Run Configuration

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: devbridge-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"   # scale to zero — free
        autoscaling.knative.dev/maxScale: "3"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 60
      containers:
        - image: gcr.io/PROJECT_ID/devbridge-api
          resources:
            limits:
              memory: "512Mi"
              cpu: "1"
          env:
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: supabase-url
                  key: latest
            - name: GITHUB_APP_PRIVATE_KEY
              valueFrom:
                secretKeyRef:
                  name: github-app-key
                  key: latest
```

### Pub/Sub Topic Setup

```python
# infrastructure/setup_pubsub.py
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
project_id = "YOUR_PROJECT_ID"

# Topic for repo ingestion jobs
topic_path = publisher.topic_path(project_id, "repo-ingestion")
publisher.create_topic(request={"name": topic_path})

# Topic for PR analysis jobs
pr_topic_path = publisher.topic_path(project_id, "pr-analysis")
publisher.create_topic(request={"name": pr_topic_path})
```

### Secret Manager Access Pattern

```python
# services/secrets.py
from google.cloud import secretmanager
import functools

client = secretmanager.SecretManagerServiceClient()

@functools.lru_cache(maxsize=None)
def get_secret(secret_id: str, project_id: str = "YOUR_PROJECT_ID") -> str:
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")
```

---

## 5. Agentic AI Layer

### Why Agents (Not a Fixed Pipeline)

A fixed RAG pipeline (embed → search → stuff → generate) fails on questions like:

- *"Why was the auth module rewritten in March?"* → needs PR history, not just code
- *"Is there a bug in how we handle session expiry?"* → needs multi-chunk reasoning
- *"Show me all places we call the payment service"* → needs symbol search, not semantic

An **agent loop** lets the system decide *which tools* to call, *in what order*, based on the query — then verify the retrieved context is sufficient before generating.

### Agent Loop (ReAct Pattern)

```
LOOP:
  1. THINK   — Analyze query. What information do I need?
  2. ACT     — Select and call a tool (search, lookup, annotate)
  3. OBSERVE — Review tool result. Is context sufficient?
  4. REPEAT  — If not, call another tool with refined parameters
  5. ANSWER  — Once context is grounded, generate a response

MAX ITERATIONS: 5
STOP CONDITION: sufficient_context=True OR max_iters reached
```

### Orchestrator Agent

The Orchestrator is the entry point for all user queries. It:

1. Classifies the query type (code search / debugging / architecture / PR)
2. Routes to the appropriate specialized agent (or handles itself)
3. Manages the multi-turn conversation state
4. Streams the final response

```python
# agents/orchestrator.py
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, FunctionDeclaration, Content, Part
from services.tools import SEARCH_TOOLS, DEBUG_TOOLS, PR_TOOLS

vertexai.init(project="YOUR_PROJECT_ID", location="us-central1")

ORCHESTRATOR_SYSTEM_PROMPT = """
You are DevBridge, a knowledge assistant for software codebases.

Your job is to answer developer questions by retrieving real code and team knowledge.
NEVER invent code, function names, or architectural decisions.
ALWAYS use tools to retrieve evidence before answering.
If retrieval returns nothing relevant, say so honestly.

Available query types you handle:
- CODE_SEARCH: Finding code, functions, classes, patterns
- DEBUG: Understanding errors, tracing logic, finding root causes  
- ARCHITECTURE: System design, data flow, dependency questions
- PR_HISTORY: Why was X changed? What did PR #N do?
- ONBOARDING: How do I set up / start working on X?
"""

class OrchestratorAgent:
    def __init__(self):
        self.model = GenerativeModel(
            model_name="gemini-1.5-flash-002",
            system_instruction=ORCHESTRATOR_SYSTEM_PROMPT,
            tools=[Tool(function_declarations=SEARCH_TOOLS + DEBUG_TOOLS + PR_TOOLS)],
        )
        self.chat = self.model.start_chat()

    async def run(self, query: str, repo_id: str, conversation_history: list) -> AsyncIterator[str]:
        """
        Execute the ReAct agent loop and stream the final response.
        """
        context = {"repo_id": repo_id, "iterations": 0, "retrieved_chunks": []}

        while context["iterations"] < 5:
            response = await self.chat.send_message_async(
                self._build_message(query, context, conversation_history)
            )
            context["iterations"] += 1

            # Check for tool calls
            tool_calls = [p for p in response.candidates[0].content.parts if p.function_call]
            if not tool_calls:
                # No more tool calls → stream final answer
                async for chunk in self._stream_response(response):
                    yield chunk
                break

            # Execute tool calls and feed results back
            tool_results = await self._execute_tools(tool_calls, context)
            context["retrieved_chunks"].extend(tool_results)

            # Feed tool results back into the chat
            await self.chat.send_message_async(
                [Part.from_function_response(name=tc.function_call.name, response={"result": r})
                 for tc, r in zip(tool_calls, tool_results)]
            )
```

---

## 6. Agent Definitions & Tool Schemas

### Tool Registry

All tools are declared as `FunctionDeclaration` objects and passed to the Gemini model.

```python
# services/tools.py
from vertexai.generative_models import FunctionDeclaration, Schema, Type

SEARCH_TOOLS = [

    FunctionDeclaration(
        name="search_code_semantic",
        description="""
        Search for code chunks semantically similar to a concept or description.
        Use when the user asks about HOW something works or WHAT implements a feature.
        Returns: list of code chunks with file paths and summaries.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "query": Schema(type=Type.STRING, description="Natural language description of what to find"),
                "repo_id": Schema(type=Type.STRING),
                "top_k": Schema(type=Type.INTEGER, description="Number of chunks to return (default 8, max 20)"),
                "filter_file_pattern": Schema(type=Type.STRING, description="Optional glob to filter files, e.g. '*.py'"),
            },
            required=["query", "repo_id"],
        ),
    ),

    FunctionDeclaration(
        name="search_code_symbol",
        description="""
        Look up a specific function, class, or variable by exact or partial name.
        Use when the user asks about a SPECIFIC named entity.
        Returns: definition location, signature, callers/callees if indexed.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "symbol_name": Schema(type=Type.STRING, description="Function or class name to look up"),
                "repo_id": Schema(type=Type.STRING),
                "include_usages": Schema(type=Type.BOOLEAN, description="Return call sites in addition to definition"),
            },
            required=["symbol_name", "repo_id"],
        ),
    ),

    FunctionDeclaration(
        name="get_file_context",
        description="""
        Retrieve the full content and annotations of a specific file.
        Use when you need to understand a complete module, not just fragments.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "file_path": Schema(type=Type.STRING, description="Relative path within repo, e.g. 'src/auth/token.py'"),
                "repo_id": Schema(type=Type.STRING),
                "include_annotations": Schema(type=Type.BOOLEAN, description="Include team annotations (default true)"),
            },
            required=["file_path", "repo_id"],
        ),
    ),

    FunctionDeclaration(
        name="get_annotations_for_context",
        description="""
        Retrieve human-written team annotations for a file or symbol.
        Use when the user asks WHY something is done a certain way —
        annotations capture team knowledge, warnings, and intent.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "file_path": Schema(type=Type.STRING),
                "repo_id": Schema(type=Type.STRING),
                "tags": Schema(type=Type.ARRAY, items=Schema(type=Type.STRING),
                               description="Filter by tag e.g. ['warning', 'architecture', 'todo']"),
            },
            required=["file_path", "repo_id"],
        ),
    ),
]

DEBUG_TOOLS = [

    FunctionDeclaration(
        name="search_error_patterns",
        description="""
        Search for code patterns related to an error message or stack trace.
        Use when the user pastes an error or describes unexpected behavior.
        Returns: relevant code chunks, past Q&A about similar errors.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "error_message": Schema(type=Type.STRING, description="The error message or stack trace text"),
                "repo_id": Schema(type=Type.STRING),
            },
            required=["error_message", "repo_id"],
        ),
    ),

    FunctionDeclaration(
        name="trace_call_chain",
        description="""
        Trace the call chain from a starting function to understand data flow.
        Useful for: 'Where does this data come from?' or 'What calls X?'
        Returns: ordered list of function calls with file locations.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "entry_function": Schema(type=Type.STRING, description="Starting function name"),
                "direction": Schema(type=Type.STRING, description="'callers' (who calls this) or 'callees' (what this calls)"),
                "repo_id": Schema(type=Type.STRING),
                "depth": Schema(type=Type.INTEGER, description="How many levels to trace (default 3, max 6)"),
            },
            required=["entry_function", "direction", "repo_id"],
        ),
    ),
]

PR_TOOLS = [

    FunctionDeclaration(
        name="search_pr_history",
        description="""
        Search past pull requests by description, title, or affected files.
        Use when the user asks WHY a decision was made, or what changed a file.
        Returns: matching PRs with titles, summaries, and authors.
        """,
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "query": Schema(type=Type.STRING, description="Natural language description of what you're looking for"),
                "repo_id": Schema(type=Type.STRING),
                "file_path": Schema(type=Type.STRING, description="Optional: filter to PRs that touched this file"),
            },
            required=["query", "repo_id"],
        ),
    ),

    FunctionDeclaration(
        name="get_pr_detail",
        description="Retrieve full details of a specific PR: diff summary, description, comments, linked issues.",
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "pr_number": Schema(type=Type.INTEGER),
                "repo_id": Schema(type=Type.STRING),
            },
            required=["pr_number", "repo_id"],
        ),
    ),
]
```

### Tool Implementations

```python
# services/tool_executor.py
from supabase import AsyncClient
from vertexai.language_models import TextEmbeddingModel
import json

class ToolExecutor:
    def __init__(self, supabase: AsyncClient):
        self.db = supabase
        self.embed_model = TextEmbeddingModel.from_pretrained("text-embedding-004")

    async def execute(self, tool_name: str, args: dict) -> dict:
        handlers = {
            "search_code_semantic":      self.search_code_semantic,
            "search_code_symbol":        self.search_code_symbol,
            "get_file_context":          self.get_file_context,
            "get_annotations_for_context": self.get_annotations,
            "search_error_patterns":     self.search_error_patterns,
            "trace_call_chain":          self.trace_call_chain,
            "search_pr_history":         self.search_pr_history,
            "get_pr_detail":             self.get_pr_detail,
        }
        handler = handlers.get(tool_name)
        if not handler:
            return {"error": f"Unknown tool: {tool_name}"}
        return await handler(**args)

    async def search_code_semantic(self, query: str, repo_id: str,
                                    top_k: int = 8, filter_file_pattern: str = None) -> dict:
        # Embed the query
        embeddings = self.embed_model.get_embeddings([query])
        query_vector = embeddings[0].values

        # pgvector similarity search via Supabase RPC
        params = {
            "query_embedding": query_vector,
            "repo_id": repo_id,
            "match_count": min(top_k, 20),
        }
        if filter_file_pattern:
            params["file_pattern"] = filter_file_pattern

        result = await self.db.rpc("match_code_chunks", params).execute()
        return {"chunks": result.data, "count": len(result.data)}

    async def search_code_symbol(self, symbol_name: str, repo_id: str,
                                  include_usages: bool = False) -> dict:
        result = await self.db.table("code_chunks") \
            .select("id, file_path, function_name, chunk_content, summary, start_line, end_line") \
            .eq("repo_id", repo_id) \
            .ilike("function_name", f"%{symbol_name}%") \
            .limit(5) \
            .execute()

        if include_usages and result.data:
            # Search for usages via keyword search in chunk content
            usage_result = await self.db.rpc("search_symbol_usages", {
                "symbol": symbol_name, "repo_id": repo_id
            }).execute()
            return {"definition": result.data, "usages": usage_result.data}

        return {"definition": result.data}

    async def search_pr_history(self, query: str, repo_id: str, file_path: str = None) -> dict:
        embeddings = self.embed_model.get_embeddings([query])
        query_vector = embeddings[0].values

        params = {"query_embedding": query_vector, "repo_id": repo_id, "match_count": 5}
        if file_path:
            params["file_path"] = file_path

        result = await self.db.rpc("match_pull_requests", params).execute()
        return {"pull_requests": result.data}
```

---

## 7. RAG Pipeline

### Supabase RPC Functions

```sql
-- Semantic search over code chunks
CREATE OR REPLACE FUNCTION match_code_chunks(
  query_embedding vector(768),
  repo_id         uuid,
  match_count     int DEFAULT 8,
  file_pattern    text DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  file_path       text,
  function_name   text,
  chunk_content   text,
  summary         text,
  start_line      int,
  end_line        int,
  similarity      float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.file_path,
    cc.function_name,
    cc.chunk_content,
    cc.summary,
    cc.start_line,
    cc.end_line,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM code_chunks cc
  WHERE
    cc.repo_id = match_code_chunks.repo_id
    AND (file_pattern IS NULL OR cc.file_path LIKE file_pattern)
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Semantic search over PR history
CREATE OR REPLACE FUNCTION match_pull_requests(
  query_embedding vector(768),
  repo_id         uuid,
  match_count     int DEFAULT 5,
  file_path       text DEFAULT NULL
)
RETURNS TABLE (
  pr_number       int,
  title           text,
  summary         text,
  author          text,
  merged_at       timestamptz,
  similarity      float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.number,
    pr.title,
    pr.summary,
    pr.author,
    pr.merged_at,
    1 - (pr.embedding <=> query_embedding) AS similarity
  FROM pull_requests pr
  WHERE
    pr.repo_id = match_pull_requests.repo_id
    AND (file_path IS NULL OR file_path = ANY(pr.files_changed))
  ORDER BY pr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Symbol usage search
CREATE OR REPLACE FUNCTION search_symbol_usages(
  symbol text,
  repo_id uuid
)
RETURNS TABLE (file_path text, function_name text, start_line int)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT cc.file_path, cc.function_name, cc.start_line
  FROM code_chunks cc
  WHERE cc.repo_id = search_symbol_usages.repo_id
    AND cc.chunk_content ILIKE '%' || symbol || '%'
    AND cc.function_name NOT ILIKE '%' || symbol || '%'  -- exclude definition
  LIMIT 20;
END;
$$;
```

### Context Assembly

Before passing context to the LLM, the orchestrator assembles it with source attribution:

```python
# services/context_assembler.py
def assemble_context(retrieved_chunks: list[dict], annotations: list[dict]) -> str:
    """
    Assemble retrieved code chunks and annotations into a structured context block.
    Keeps total token count under 100K (well within Gemini Flash's window).
    """
    parts = []

    for i, chunk in enumerate(retrieved_chunks[:15], 1):
        parts.append(f"""
### Source {i}: {chunk['file_path']} (lines {chunk['start_line']}–{chunk['end_line']})
**Function:** `{chunk.get('function_name', 'module-level')}`
**Relevance score:** {chunk.get('similarity', 0):.2f}

```
{chunk['chunk_content']}
```

**Summary:** {chunk.get('summary', 'N/A')}
""")

    if annotations:
        parts.append("\n### Team Annotations")
        for ann in annotations:
            parts.append(f"- **{ann['file_path']}** [{', '.join(ann.get('tags', []))}]: {ann['comment']} — *{ann['author']}*")

    return "\n".join(parts)
```

---

## 8. Chunking Strategy

Code must be chunked at **semantic boundaries**, not token limits.

### Rules

1. **Function-level** — Each function/method is one chunk (preferred unit)
2. **Class-level** — Class header + docstring as a separate chunk; methods chunked individually
3. **Module-level** — Top-level imports + constants as one chunk per file
4. **No arbitrary splits** — Never cut inside a function body

### Implementation

```python
# pipelines/chunker.py
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
from dataclasses import dataclass

LANGUAGE_MAP = {
    ".py":  Language(tspython.language()),
    ".js":  Language(tsjavascript.language()),
    ".ts":  Language(tsjavascript.language()),
}

FUNCTION_NODE_TYPES = {
    ".py":  ["function_definition", "async_function_definition"],
    ".js":  ["function_declaration", "arrow_function", "method_definition"],
    ".ts":  ["function_declaration", "arrow_function", "method_definition"],
}

@dataclass
class CodeChunk:
    file_path: str
    chunk_type: str           # "function" | "class" | "module"
    function_name: str | None
    chunk_content: str
    start_line: int
    end_line: int
    language: str

def chunk_file(file_path: str, source_code: str) -> list[CodeChunk]:
    ext = "." + file_path.rsplit(".", 1)[-1]
    lang = LANGUAGE_MAP.get(ext)
    if not lang:
        return _fallback_chunk(file_path, source_code)

    parser = Parser(lang)
    tree = parser.parse(bytes(source_code, "utf8"))
    chunks = []

    def walk(node, depth=0):
        node_type = node.type
        target_types = FUNCTION_NODE_TYPES.get(ext, [])

        if node_type in target_types:
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode() if name_node else "<anonymous>"
            content = source_code[node.start_byte:node.end_byte]

            chunks.append(CodeChunk(
                file_path=file_path,
                chunk_type="function",
                function_name=name,
                chunk_content=content,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                language=ext.lstrip("."),
            ))
            return  # don't recurse into nested functions as separate chunks

        for child in node.children:
            walk(child, depth + 1)

    walk(tree.root_node)

    # Add a module-level chunk for imports/constants
    lines = source_code.splitlines()
    preamble = []
    for line in lines[:30]:
        stripped = line.strip()
        if stripped.startswith(("import ", "from ", "const ", "let ", "#", "//", '"""', "'")):
            preamble.append(line)
        else:
            break

    if preamble:
        chunks.insert(0, CodeChunk(
            file_path=file_path,
            chunk_type="module",
            function_name=None,
            chunk_content="\n".join(preamble),
            start_line=1,
            end_line=len(preamble),
            language=ext.lstrip("."),
        ))

    return chunks

def _fallback_chunk(file_path: str, source: str, max_lines: int = 60) -> list[CodeChunk]:
    """For unsupported file types: chunk by line blocks."""
    lines = source.splitlines()
    chunks = []
    for i in range(0, len(lines), max_lines):
        block = lines[i:i + max_lines]
        chunks.append(CodeChunk(
            file_path=file_path,
            chunk_type="module",
            function_name=None,
            chunk_content="\n".join(block),
            start_line=i + 1,
            end_line=i + len(block),
            language="unknown",
        ))
    return chunks
```

---

## 9. Code Ingestion Pipeline

### Trigger Flow

```
GitHub push/PR event
  → POST /webhooks/github (Cloud Run)
  → Verify HMAC signature (Secret Manager)
  → Publish to Pub/Sub: repo-ingestion
  → Return 200 immediately

Pub/Sub subscriber (Cloud Run Job)
  → Pull message
  → Fetch changed files from GitHub API
  → Write raw files to GCS: gs://devbridge-repos/{repo_id}/{commit_sha}/
  → Parse + chunk (tree-sitter)
  → Batch embed (Vertex AI text-embedding-004)
  → Upsert code_chunks in Supabase
  → Update repos.last_indexed_at
```

### Ingestion Service

```python
# pipelines/ingestion_service.py
import asyncio
from google.cloud import pubsub_v1, storage
from vertexai.language_models import TextEmbeddingModel
from supabase import create_client
from pipelines.chunker import chunk_file, CodeChunk
from services.secrets import get_secret
import httpx, json

EMBED_MODEL = TextEmbeddingModel.from_pretrained("text-embedding-004")
GCS_BUCKET = "devbridge-repos"

async def process_ingestion_message(message: dict):
    repo_id = message["repo_id"]
    repo_full_name = message["repo_full_name"]   # e.g. "org/my-repo"
    commit_sha = message["commit_sha"]
    changed_files = message["changed_files"]     # list of file paths

    github_token = get_secret("github-app-token")
    supabase = create_client(get_secret("supabase-url"), get_secret("supabase-service-key"))
    gcs = storage.Client()
    bucket = gcs.bucket(GCS_BUCKET)

    chunks_to_embed: list[CodeChunk] = []

    async with httpx.AsyncClient() as client:
        for file_path in changed_files:
            # Skip non-code files
            if not any(file_path.endswith(ext) for ext in [".py", ".js", ".ts", ".go", ".java"]):
                continue

            # Fetch file content from GitHub
            resp = await client.get(
                f"https://api.github.com/repos/{repo_full_name}/contents/{file_path}",
                headers={"Authorization": f"Bearer {github_token}",
                         "Accept": "application/vnd.github.raw"},
                params={"ref": commit_sha}
            )
            if resp.status_code != 200:
                continue

            source_code = resp.text

            # Store in GCS (for audit trail / re-indexing)
            blob = bucket.blob(f"{repo_id}/{commit_sha}/{file_path}")
            blob.upload_from_string(source_code, content_type="text/plain")

            # Chunk the file
            file_chunks = chunk_file(file_path, source_code)
            chunks_to_embed.extend(file_chunks)

    # Batch embed (Vertex AI allows up to 250 texts per request)
    BATCH_SIZE = 100
    all_records = []

    for i in range(0, len(chunks_to_embed), BATCH_SIZE):
        batch = chunks_to_embed[i:i + BATCH_SIZE]
        texts = [c.chunk_content[:8000] for c in batch]   # text-embedding-004 max input

        embeddings = EMBED_MODEL.get_embeddings(texts)

        # Generate summaries using Gemini Flash (lightweight prompt)
        summaries = await batch_summarize(batch)

        for chunk, emb, summary in zip(batch, embeddings, summaries):
            all_records.append({
                "repo_id": repo_id,
                "file_path": chunk.file_path,
                "function_name": chunk.function_name,
                "chunk_type": chunk.chunk_type,
                "chunk_content": chunk.chunk_content,
                "embedding": emb.values,
                "summary": summary,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "language": chunk.language,
                "commit_sha": commit_sha,
            })

    # Upsert into Supabase (delete old chunks for changed files, insert new)
    changed_paths = list({c.file_path for c in chunks_to_embed})
    await supabase.table("code_chunks") \
        .delete() \
        .eq("repo_id", repo_id) \
        .in_("file_path", changed_paths) \
        .execute()

    # Insert in batches of 50
    for i in range(0, len(all_records), 50):
        await supabase.table("code_chunks").insert(all_records[i:i + 50]).execute()

    # Update last indexed timestamp
    await supabase.table("repositories") \
        .update({"last_indexed_at": "now()", "last_commit_sha": commit_sha}) \
        .eq("id", repo_id) \
        .execute()


async def batch_summarize(chunks: list[CodeChunk]) -> list[str]:
    """Generate one-line summaries for chunks using Gemini Flash."""
    import vertexai
    from vertexai.generative_models import GenerativeModel
    model = GenerativeModel("gemini-1.5-flash-002")

    summaries = []
    for chunk in chunks:
        prompt = f"""Summarize this code in one sentence (max 20 words). Be specific about what it does.
        
{chunk.chunk_content[:500]}

Summary:"""
        resp = await model.generate_content_async(prompt)
        summaries.append(resp.text.strip())
    return summaries
```

---

## 10. Frontend

### Tech Stack

- **Next.js 14** (App Router)
- **TailwindCSS**
- **Monaco Editor** — code viewer with syntax highlighting
- **Vercel AI SDK** — streaming SSE from backend
- **Vercel** — deploy target (free tier)

### Key Pages

```
/                    — Landing / repo selection
/repo/[repoId]       — Chat + code viewer
/repo/[repoId]/pr    — PR insights dashboard
/repo/[repoId]/map   — Codebase overview (file tree + annotation density)
```

### Streaming Response Component

```tsx
// components/ChatStream.tsx
"use client";
import { useEffect, useState, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

interface SourceChunk {
  file_path: string;
  function_name: string;
  start_line: number;
  similarity: number;
}

export function ChatStream({ repoId }: { repoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "", sources: [] };
    setMessages(prev => [...prev, assistantMessage]);

    const response = await fetch(`/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input,
        repo_id: repoId,
        history: messages,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (data.type === "text") {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content += data.content;
              return updated;
            });
          } else if (data.type === "sources") {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1].sources = data.sources;
              return updated;
            });
          }
        }
      }
    }

    setStreaming(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
      </div>
      <div className="border-t p-4 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-4 py-2 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about the codebase..."
        />
        <button
          onClick={sendMessage}
          disabled={streaming}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {streaming ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}
```

---

## 11. Backend API

### Directory Structure

```
backend/
├── main.py                    # FastAPI app + lifespan
├── routers/
│   ├── query.py               # POST /query (streaming)
│   ├── repo.py                # POST /repo/sync, GET /repo/{id}
│   ├── pr.py                  # POST /pr/analyze, GET /pr/{id}
│   ├── annotations.py         # POST /annotation, GET /annotations
│   └── webhooks.py            # POST /webhooks/github
├── agents/
│   ├── orchestrator.py        # OrchestratorAgent
│   ├── pr_review_agent.py     # PRReviewAgent
│   └── debug_agent.py         # DebugAgent (specialized)
├── services/
│   ├── tools.py               # FunctionDeclaration registry
│   ├── tool_executor.py       # Tool implementations
│   ├── context_assembler.py   # Context window builder
│   └── secrets.py             # GCP Secret Manager client
├── pipelines/
│   ├── chunker.py             # tree-sitter chunking
│   ├── ingestion_service.py   # Full ingestion pipeline
│   └── pr_pipeline.py         # PR diff analysis
├── models/
│   └── schemas.py             # Pydantic request/response models
└── Dockerfile
```

### Query Endpoint (Streaming)

```python
# routers/query.py
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from agents.orchestrator import OrchestratorAgent
from models.schemas import QueryRequest
import json

router = APIRouter()

@router.post("/query")
async def query(req: QueryRequest):
    agent = OrchestratorAgent()

    async def event_stream():
        sources_sent = False
        async for chunk in agent.run(req.query, req.repo_id, req.history):
            if isinstance(chunk, dict) and chunk.get("type") == "sources":
                yield f"data: {json.dumps(chunk)}\n\n"
                sources_sent = True
            else:
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

---

## 12. Database Schema

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Repositories
CREATE TABLE repositories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id),
  github_repo_id    bigint UNIQUE NOT NULL,
  full_name         text NOT NULL,           -- e.g. "org/repo"
  default_branch    text DEFAULT 'main',
  last_indexed_at   timestamptz,
  last_commit_sha   text,
  created_at        timestamptz DEFAULT now()
);

-- Code chunks (the core retrieval unit)
CREATE TABLE code_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path       text NOT NULL,
  function_name   text,
  chunk_type      text NOT NULL CHECK (chunk_type IN ('function', 'class', 'module')),
  chunk_content   text NOT NULL,
  embedding       vector(768),               -- text-embedding-004 dimension
  summary         text,
  language        text,
  start_line      int,
  end_line        int,
  commit_sha      text,
  created_at      timestamptz DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON code_chunks (repo_id, file_path);

-- Pull requests
CREATE TABLE pull_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number          int NOT NULL,
  title           text NOT NULL,
  description     text,
  summary         text,                      -- AI-generated summary
  embedding       vector(768),               -- embed title + summary
  author          text,
  files_changed   text[],
  status          text DEFAULT 'open',
  merged_at       timestamptz,
  github_url      text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (repo_id, number)
);

CREATE INDEX ON pull_requests USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Human annotations (team knowledge layer)
CREATE TABLE annotations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  file_path       text NOT NULL,
  start_line      int,
  end_line        int,
  author_id       uuid NOT NULL REFERENCES users(id),
  comment         text NOT NULL,
  tags            text[] DEFAULT '{}',       -- e.g. ['warning', 'architecture', 'gotcha']
  embedding       vector(768),
  upvotes         int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON annotations (repo_id, file_path);

-- Saved questions and answers (knowledge accumulation)
CREATE TABLE questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id),
  question        text NOT NULL,
  answer          text,
  source_chunks   uuid[],                    -- which code_chunks were used
  embedding       vector(768),
  helpful_votes   int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- Users
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  display_name    text,
  github_username text,
  org_id          uuid REFERENCES organizations(id),
  role            text DEFAULT 'developer',
  created_at      timestamptz DEFAULT now()
);

-- Organizations
CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  github_org_name text UNIQUE,
  created_at      timestamptz DEFAULT now()
);
```

---

## 13. Comment System (Human Knowledge Layer)

Annotations are surfaced alongside code retrieval. The agent always checks for annotations on retrieved files.

### Annotation Schema Tags

| Tag | Meaning |
|---|---|
| `warning` | Known footgun or dangerous pattern |
| `architecture` | Explains a design decision |
| `gotcha` | Non-obvious behavior |
| `todo` | Known tech debt |
| `context` | Business context (why this exists) |
| `deprecated` | Being phased out |

### Annotation Retrieval

Annotations are fetched in the `get_annotations_for_context` tool and appended to the assembled context window. They are ranked by:

1. Exact file path match
2. Tag relevance to query type
3. Upvote count

---

## 14. PR Analysis Agent

```python
# agents/pr_review_agent.py
from vertexai.generative_models import GenerativeModel
from services.tool_executor import ToolExecutor

PR_REVIEW_PROMPT = """
You are a senior engineer reviewing a pull request for a team.

Your job is:
1. Summarize what this PR does in 2-3 sentences
2. Identify potential issues: bugs, security concerns, performance
3. Check consistency with existing code patterns
4. Generate a list of clarifying questions the author should address

Ground every observation in the actual diff — never invent issues.
If the diff is clean, say so clearly.
"""

class PRReviewAgent:
    def __init__(self, tool_executor: ToolExecutor):
        self.model = GenerativeModel(
            model_name="gemini-1.5-flash-002",
            system_instruction=PR_REVIEW_PROMPT,
        )
        self.executor = tool_executor

    async def analyze_pr(self, pr_number: int, repo_id: str, diff: str) -> dict:
        # Retrieve similar existing code for context
        context_result = await self.executor.search_code_semantic(
            query=f"code patterns related to this PR diff",
            repo_id=repo_id,
            top_k=5,
        )

        prompt = f"""
## PR #{pr_number} Diff
```diff
{diff[:15000]}
```

## Existing Code Context
{self._format_chunks(context_result['chunks'])}

Analyze this PR.
"""
        response = await self.model.generate_content_async(prompt)

        # Save PR summary + embedding to Supabase
        return {
            "pr_number": pr_number,
            "summary": response.text,
            "status": "analyzed",
        }

    def _format_chunks(self, chunks: list) -> str:
        return "\n\n".join(
            f"**{c['file_path']}** (`{c.get('function_name', 'module')}`)\n```\n{c['chunk_content'][:500]}\n```"
            for c in chunks
        )
```

---

## 15. API Design

### Endpoints

```
# Query
POST   /query                    Stream: agent response + sources
GET    /query/{id}               Retrieve saved question/answer

# Repository
POST   /repo/sync                Trigger full re-index of a repo
GET    /repo/{id}                Repo metadata + index status
GET    /repo/{id}/files          File tree with annotation density

# PR
POST   /pr/analyze               Trigger PR analysis (async)
GET    /pr/{id}                  PR analysis result

# Annotations
POST   /annotation               Create annotation
GET    /annotations/{repo_id}    List annotations, filterable by file/tag
PATCH  /annotation/{id}          Edit annotation
POST   /annotation/{id}/upvote   Upvote annotation

# Webhooks
POST   /webhooks/github          GitHub App webhook receiver
```

### Request/Response Schemas

```python
# models/schemas.py
from pydantic import BaseModel
from typing import Optional

class QueryRequest(BaseModel):
    query: str
    repo_id: str
    history: list[dict] = []      # [{role, content}, ...]
    stream: bool = True

class AnnotationCreate(BaseModel):
    repo_id: str
    file_path: str
    start_line: Optional[int]
    end_line: Optional[int]
    comment: str
    tags: list[str] = []

class RepoSyncRequest(BaseModel):
    repo_id: str
    full_resync: bool = False     # if True, re-index entire repo

class PRAnalyzeRequest(BaseModel):
    repo_id: str
    pr_number: int
```

---

## 16. Security

| Concern | Mitigation |
|---|---|
| GitHub webhook spoofing | HMAC-SHA256 signature verification using `X-Hub-Signature-256` header |
| API key exposure | All secrets in GCP Secret Manager; never in environment variables or code |
| Cross-org data access | `repo_id` always scoped to authenticated user's `org_id`; Row Level Security on Supabase |
| Prompt injection via code | Code chunks are wrapped in explicit `<source>` delimiters; agent instructed to treat as data |
| Token exhaustion | Max 5 agent iterations per query; context window capped at 100K tokens |

### Supabase Row Level Security

```sql
-- Users can only access repos in their org
CREATE POLICY "org_isolation" ON repositories
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "org_isolation" ON code_chunks
  USING (repo_id IN (
    SELECT id FROM repositories WHERE org_id = auth.jwt() ->> 'org_id'
  ));
```

---

## 17. Failure Modes & Mitigations

| Failure | Root Cause | Mitigation |
|---|---|---|
| **Hallucinated code** | LLM generating without retrieval | System prompt enforces tool-use-before-answer; citations required |
| **No relevant chunks found** | Poor embedding or insufficient indexing | Agent reports "not enough context" rather than guessing; triggers re-sync suggestion |
| **Slow cold start** | Cloud Run scaling from zero | Keep min instances = 1 for demo; scale-to-zero only for ingestion jobs |
| **Embedding cost spike** | Re-indexing large repos | Incremental indexing (only changed files per commit); GCS caches raw files |
| **Agent infinite loop** | Tool results are always insufficient | Hard limit: 5 iterations; fallback to semantic search only |
| **Pub/Sub message loss** | Ingestion job crash | Pub/Sub acknowledgement only after successful DB write; dead-letter topic for failed messages |
| **GitHub API rate limit** | High-frequency pushes | Debounce: process only the latest commit per repo per 5 minutes |

---

## 18. Scaling Strategy

DevBridge is designed to demo well on free tier and scale gradually.

### Phase 1 — Hackathon (Free Tier)

- Cloud Run: 512MB, 1 vCPU, scale-to-zero
- Supabase: Free tier (500MB DB, shared compute)
- Gemini Flash: AI Studio key (60 RPM free)
- GCS: Single bucket, minimal storage
- Pub/Sub: Single topic per event type
- Estimated cost: **$0/month**

### Phase 2 — Post-Hackathon (Light Production)

- Cloud Run: Increase to 1GB RAM, min 1 instance
- Supabase Pro: $25/month (8GB DB, dedicated compute)
- Separate Cloud Run Job for ingestion (no cold start impact on API)
- Add Redis (Upstash free tier) for question/answer caching

### Phase 3 — Growth

- Dedicated Cloud Run service per component (API / ingestion / agent)
- Replace pgvector with Vertex AI Vector Search (fully managed)
- Add Cloud Monitoring + Cloud Logging dashboards
- Consider Firestore for session/conversation state

---

## 19. Hackathon Build Plan

### Scope Contract

**IN SCOPE — must demo:**
- GitHub repo connection + indexing (1 repo)
- Chat interface with streaming agent responses
- Code viewer that shows cited sources
- At least 2 agent tools working live: `search_code_semantic` + `search_code_symbol`
- Human annotation creation + retrieval
- PR analysis on at least 1 PR

**STRETCH:**
- `trace_call_chain` tool
- Annotation upvoting
- PR history semantic search
- Multi-repo support

**OUT OF SCOPE:**
- Auth (hardcode a demo user)
- Mobile responsiveness
- Multi-org isolation (demo single org)
- Production error handling

### Milestone Map

```
Hour 0–2:   Infra setup
            — Supabase schema deployed
            — Cloud Run service live (health check passing)
            — GitHub App created + webhook registered
            — Pub/Sub topics created
            — Gemini Flash + embedding API verified

Hour 2–6:   Ingestion pipeline
            — tree-sitter chunker working on Python + JS
            — Vertex AI embeddings → Supabase code_chunks
            — Webhook → Pub/Sub → ingestion job end-to-end
            — Test: index a real repo, verify chunks in DB

Hour 6–12:  Agent layer
            — OrchestratorAgent with 2 tools wired up
            — search_code_semantic returning real chunks
            — search_code_symbol working
            — Streaming SSE response to frontend

Hour 12–17: Frontend
            — Chat interface with SSE streaming
            — Source citations displayed below answer
            — Monaco editor opens cited file at line number
            — Annotation creation UI

Hour 17–20: PR analysis + polish
            — PRReviewAgent end-to-end
            — Happy path demo flow scripted and tested
            — README written

Hour 20–24: Buffer / demo prep
            — Practice pitch: problem → demo → tech → vision
            — No new features
```

### Roles Split (2-person team)

| Person | Owns |
|---|---|
| **Person A** | Backend: ingestion pipeline, agent loop, tool implementations, Cloud Run deploy |
| **Person B** | Frontend: chat UI, SSE streaming, Monaco integration, annotation UI |
| **Shared** | Schema design, demo script, README |

---

## Summary

DevBridge is a **persistent, team-aware codebase knowledge system** powered by:

- A **multi-agent ReAct loop** (Gemini 1.5 Flash) that selects retrieval strategies dynamically
- **Semantic + symbol + PR history search** over Supabase pgvector
- **GCP-native infrastructure** (Cloud Run, Vertex AI, Pub/Sub, GCS, Secret Manager) — all within free tier
- **Human annotations** as a first-class knowledge layer surfaced alongside code
- **Incremental ingestion** triggered by GitHub webhooks via Pub/Sub

The system succeeds when a junior developer can ask *"Why does `validateToken` throw on expired sessions?"* and get a grounded answer citing the actual function, the team annotation that explains the edge case, and the PR that introduced it — without a senior engineer in the loop.

---

*DevBridge v2 · Google Solutions Hackathon · Built with Gemini 1.5 Flash + Vertex AI + Cloud Run*
