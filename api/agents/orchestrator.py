"""Legacy orchestrator module.

Phase 21 routes now invoke `api.agents.graph.graph` directly for both sync and
streaming chat execution. Keep this module for backward compatibility in
existing tests and tooling.
"""

import os
import logging
import json
import asyncio
from uuid import UUID
from urllib import request

from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from sqlalchemy import text

from api.db.session import get_engine
from api.core.secrets import get_github_token

from api.db.models import Annotation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _is_why_intent(message: str) -> bool:
    normalized = (message or "").strip().lower()
    if not normalized:
        return False
    return (
        "why" in normalized
        or "reason" in normalized
        or "changed" in normalized
        or "change" in normalized
    )


def _extract_annotation_tags(query: str) -> list[str]:
    known = {"warning", "architecture", "gotcha", "todo", "context", "deprecated"}
    words = {w.strip(".,:;!?()[]{}\"'").lower() for w in query.split()}
    return sorted(known.intersection(words))


@tool
async def code_search(query: str, include_history: bool = False):
    """Search for code snippets and implementation logic in the codebase."""
    from api.db.vector_store import vector_db

    if not vector_db._vectorstore:
        vector_db.initialize()

    try:
        results = await asyncio.wait_for(vector_db.hybrid_search(query, k=5), timeout=10.0)
        if not results:
            return f"No matches found for '{query}'. Try a different query or broader terms."

        history_results = [{} for _ in results]
        if include_history:
            history_tasks = []
            for res in results:
                history_tasks.append(
                    vector_db.get_chunk_history(
                        file_path=res.get("file_path", ""),
                        start_line=res.get("start_line"),
                        end_line=res.get("end_line"),
                    )
                )

            try:
                raw_history_results = await asyncio.wait_for(
                    asyncio.gather(*history_tasks, return_exceptions=True),
                    timeout=5.0,
                )
                for i, hist in enumerate(raw_history_results):
                    if not isinstance(hist, Exception):
                        history_results[i] = hist
                    else:
                        logger.warning(f"History lookup failed: {hist}")
            except asyncio.TimeoutError:
                logger.warning("History lookup timed out for some results")

        citations = []
        for i, res in enumerate(results):
            history = history_results[i]
            citations.append(
                {
                    "file": res.get("file_path"),
                    "lines": f"{res.get('start_line')}-{res.get('end_line')}",
                    "snippet": res.get("snippet", "")[:300] + "..."
                    if len(res.get("snippet", "")) > 300
                    else res.get("snippet", ""),
                    "history": {
                        "commit_sha": history.get("commit_sha"),
                        "pr_number": history.get("pr_number"),
                    }
                    if include_history and history
                    else None,
                }
            )

        summary = f"Found {len(results)} relevant code snippets."
        return f"{summary}\n\nCitations:\n{json.dumps(citations, indent=2)}"
    except Exception as e:
        logger.error(f"Error in code_search: {e}")
        return "An error occurred during search. Please try again later."


@tool
async def search_pr_history(query: str = "", file_path: str = "", k: int = 5):
    """Search pull-request history by semantic intent or file path."""
    from api.db.vector_store import vector_db

    if not vector_db._vectorstore:
        vector_db.initialize()

    try:
        results = await asyncio.wait_for(
            vector_db.search_pr_history(
                query_text=query or None,
                file_path=file_path or None,
                k=k,
            ),
            timeout=10.0,
        )
        if not results:
            return "No pull request history matched the query."
        return json.dumps(results, indent=2, default=str)
    except asyncio.TimeoutError:
        logger.warning(f"PR history search timed out for query: {query}")
        return "PR history search timed out."
    except Exception as e:
        logger.error(f"Error in search_pr_history: {e}")
        return "Failed to search pull request history."


@tool
async def get_pr_detail(repo: str, pr_number: int):
    """Get full pull-request detail including description and summary."""
    from api.db.vector_store import vector_db

    try:
        detail = await asyncio.wait_for(
            vector_db.get_pr_detail(repo=repo, number=pr_number),
            timeout=10.0,
        )
        if not detail:
            return f"No pull request detail found for {repo}#{pr_number}."
        return json.dumps(detail, indent=2, default=str)
    except asyncio.TimeoutError:
        logger.warning(f"PR detail lookup timed out for {repo}#{pr_number}")
        return "PR detail lookup timed out."
    except Exception as e:
        logger.error(f"Error in get_pr_detail: {e}")
        return "Failed to load pull request detail."


@tool
async def trace_call_chain(symbol: str, repo: str = "", depth: int = 2):
    """Trace call chain around a symbol by scanning chunk content recursively."""
    engine = get_engine()
    if engine is None:
        return "Database engine is not initialized."

    normalized_depth = max(1, min(depth, 4))
    visited: set[str] = set()
    chain: list[dict] = []

    async def _expand(current_symbol: str, current_depth: int):
        key = f"{current_symbol}:{current_depth}"
        if key in visited or current_depth > normalized_depth:
            return
        visited.add(key)

        query = text(
            """
            SELECT symbol_name, file_path, start_line, end_line, chunk_id
            FROM code_chunks
            WHERE content ILIKE :needle
              AND (:repo = '' OR repo = :repo)
            ORDER BY created_at DESC
            LIMIT 12
            """
        )

        async with engine.connect() as conn:
            result = await conn.execute(query, {"needle": f"%{current_symbol}%", "repo": repo})
            rows = result.fetchall()

        for row in rows:
            m = row._mapping
            symbol_name = (m.get("symbol_name") or "").strip()
            node = {
                "depth": current_depth,
                "query_symbol": current_symbol,
                "symbol_name": symbol_name,
                "file_path": m.get("file_path"),
                "start_line": m.get("start_line"),
                "end_line": m.get("end_line"),
                "chunk_id": m.get("chunk_id"),
            }
            chain.append(node)

            if symbol_name and symbol_name != current_symbol:
                await _expand(symbol_name, current_depth + 1)

    try:
        await _expand(symbol.strip(), 1)
        if not chain:
            return f"No call chain context found for symbol '{symbol}'."
        return json.dumps({"symbol": symbol, "depth": normalized_depth, "chain": chain}, indent=2)
    except Exception as e:
        logger.error(f"Error in trace_call_chain: {e}")
        return "Failed to trace call chain."


@tool
async def search_error_patterns(query: str, repo: str = "", k: int = 5):
    """Search error patterns via lexical matches and semantic hybrid search."""
    from api.db.vector_store import vector_db

    engine = get_engine()
    if engine is None:
        return "Database engine is not initialized."

    try:
        lexical_sql = text(
            """
            SELECT file_path, start_line, end_line, error_type, error_message, content
            FROM code_chunks
            WHERE error_message IS NOT NULL
              AND (
                error_message ILIKE :needle
                OR content ILIKE :needle
              )
              AND (:repo = '' OR repo = :repo)
            ORDER BY created_at DESC
            LIMIT :k
            """
        )
        async with engine.connect() as conn:
            lexical_rows = await conn.execute(
                lexical_sql,
                {"needle": f"%{query}%", "repo": repo, "k": max(1, min(k, 20))},
            )
            lexical = [dict(row._mapping) for row in lexical_rows.fetchall()]

        semantic: list[dict] = []
        if not vector_db._vectorstore:
            vector_db.initialize()
        if vector_db._vectorstore:
            semantic = await vector_db.hybrid_search(
                query,
                k=max(1, min(k, 20)),
                filters={"repo": repo} if repo else None,
            )

        return json.dumps(
            {
                "query": query,
                "lexical_matches": lexical,
                "semantic_matches": semantic,
            },
            indent=2,
            default=str,
        )
    except Exception as e:
        logger.error(f"Error in search_error_patterns: {e}")
        return "Failed to search error patterns."


def _repo_slug_from_github_url(url: str | None) -> str | None:
    if not url:
        return None
    clean = url.strip().rstrip("/")
    marker = "github.com/"
    if marker not in clean:
        return None
    tail = clean.split(marker, 1)[1]
    parts = [segment for segment in tail.split("/") if segment]
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1]}"


async def _github_get_json(url: str, token: str) -> dict:
    def _do_request() -> dict:
        req = request.Request(url)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    return await asyncio.to_thread(_do_request)


async def _sync_single_issue(repo_id: str, issue_number: int, user_id: str) -> bool:
    engine = get_engine()
    if engine is None:
        return False

    token = await get_github_token(user_id)
    if not token:
        logger.warning("GitHub token missing; cannot on-demand sync issue")
        return False

    async with engine.connect() as conn:
        repo_row = await conn.execute(
            text("SELECT id, name, github_url FROM repositories WHERE CAST(id AS text) = :repo_id LIMIT 1"),
            {"repo_id": repo_id},
        )
        repo_data = repo_row.fetchone()
    if not repo_data:
        return False

    repo = dict(repo_data._mapping)
    repo_slug = _repo_slug_from_github_url(repo.get("github_url")) or repo.get("name")
    if not repo_slug:
        return False

    issue_url = f"https://api.github.com/repos/{repo_slug}/issues/{issue_number}"
    try:
        issue = await _github_get_json(issue_url, token)
    except Exception:
        logger.exception("On-demand issue sync failed for %s#%s", repo_slug, issue_number)
        return False

    if not isinstance(issue, dict) or issue.get("pull_request"):
        return False

    title = (issue.get("title") or "").strip()
    body = (issue.get("body") or "").strip()
    if not title:
        return False

    from api.db.vector_store import vector_db

    if not vector_db._vectorstore:
        vector_db.initialize()
    if not vector_db._vectorstore:
        return False

    embedding_input = f"Issue #{issue_number}: {title}\n\n{body}"
    try:
        embedding = await asyncio.to_thread(
            vector_db._vectorstore.embedding_service.embed_query,
            embedding_input,
        )
    except Exception:
        logger.exception("Failed embedding issue for on-demand sync %s#%s", repo_slug, issue_number)
        return False

    upsert_sql = text(
        """
        INSERT INTO repo_github_issues (repo_id, issue_number, title, body, embedding, updated_at)
        VALUES (CAST(:repo_id AS uuid), :issue_number, :title, :body, CAST(:embedding AS vector), NOW())
        ON CONFLICT (repo_id, issue_number) DO UPDATE
        SET title = EXCLUDED.title,
            body = EXCLUDED.body,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        """
    )
    async with engine.connect() as conn:
        await conn.execute(
            upsert_sql,
            {
                "repo_id": str(repo.get("id")),
                "issue_number": issue_number,
                "title": title,
                "body": body,
                "embedding": embedding,
            },
        )
        await conn.commit()
    return True


@tool
async def map_issue_to_files(repo_id: str, issue_number: int, user_id: str, limit: int = 5):
    """Map a GitHub issue to relevant code files using in-DB pgvector cosine similarity."""
    engine = get_engine()
    if engine is None:
        return "Database engine is not initialized."

    normalized_limit = max(1, min(limit, 20))

    exists_sql = text(
        """
        SELECT 1
        FROM repo_github_issues
        WHERE repo_id = CAST(:repo_id AS uuid)
          AND issue_number = :issue_number
        LIMIT 1
        """
    )
    async with engine.connect() as conn:
        existing = await conn.execute(exists_sql, {"repo_id": repo_id, "issue_number": issue_number})
        issue_exists = existing.fetchone() is not None

    if not user_id:
        return "user_id is required to resolve GitHub OAuth token for issue mapping."

    if not issue_exists:
        synced = await _sync_single_issue(repo_id, issue_number, user_id)
        if not synced:
            return f"Issue #{issue_number} not found and on-demand sync failed for repo {repo_id}."

    join_sql = text(
        """
        WITH repo_meta AS (
          SELECT id::text AS repo_uuid, name, github_url
          FROM repositories
          WHERE CAST(id AS text) = :repo_id
          LIMIT 1
        )
        SELECT
          cc.file_path,
          cc.start_line,
          cc.end_line,
          cc.content,
          (cc.embedding <=> rgi.embedding) AS distance
        FROM repo_github_issues rgi
        CROSS JOIN repo_meta rm
        JOIN code_chunks cc
          ON cc.embedding IS NOT NULL
         AND (
              cc.repo = rm.name
              OR cc.repo = rm.repo_uuid
              OR cc.repo = replace(rm.github_url, 'https://github.com/', '')
             )
        WHERE rgi.repo_id = CAST(:repo_id AS uuid)
          AND rgi.issue_number = :issue_number
          AND rgi.embedding IS NOT NULL
        ORDER BY cc.embedding <=> rgi.embedding
        LIMIT :k
        """
    )

    async with engine.connect() as conn:
        result = await conn.execute(
            join_sql,
            {"repo_id": repo_id, "issue_number": issue_number, "k": normalized_limit},
        )
        rows = [dict(row._mapping) for row in result.fetchall()]

    if not rows:
        return f"No relevant code files found for issue #{issue_number}."

    lines: list[str] = [f"Top matches for issue #{issue_number} (repo {repo_id}):"]
    for idx, row in enumerate(rows, start=1):
        snippet = (row.get("content") or "").strip().replace("\n", " ")
        snippet = snippet[:280] + ("..." if len(snippet) > 280 else "")
        lines.append(
            f"{idx}. {row.get('file_path')}:{row.get('start_line')}-{row.get('end_line')} "
            f"(distance={float(row.get('distance') or 0.0):.4f})\n   {snippet}"
        )

    return "\n".join(lines)


def get_llm():
    """Lazy LLM initialization with local mock fallback."""

    class MockLLM(BaseChatModel):
        model_name: str = "mock-llm"

        @property
        def _llm_type(self) -> str:
            return "mock-llm"

        @property
        def _identifying_params(self) -> dict[str, str]:
            return {"model_name": self.model_name}

        def bind_tools(self, tools, **kwargs):
            return self

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            msg_content = ""
            if messages and len(messages) > 0:
                last_msg = messages[-1]
                if hasattr(last_msg, "content"):
                    msg_content = last_msg.content
                elif isinstance(last_msg, dict):
                    msg_content = last_msg.get("content", "")

            response = AIMessage(
                content=(
                    "[Mock] Cloud LLM integration removed. Configure new provider integration before production AI responses.\n\n"
                    f"Your message was: {msg_content}"
                )
            )
            return ChatResult(generations=[ChatGeneration(message=response)])

        async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
            return self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    return MockLLM()


tools = [
    code_search,
    search_pr_history,
    get_pr_detail,
    trace_call_chain,
    search_error_patterns,
    map_issue_to_files,
]
checkpointer = MemorySaver()

SYSTEM_PROMPT = """You are DevBridge, a team-aware knowledge system for codebases.

When you answer questions about code, you MUST include citations for any information 
retrieved via the code_search tool.

Format your response with:
- **Citations:** Explicit file paths and line numbers for every code fact you present
- Example: "The function is defined in `api/ingest/trigger.py:77-82`"

For "why" questions, use the PR/Commit history context provided to explain the rationale 
behind code changes.

IMPORTANT GUARDRAILS:
1. ALWAYS ground your answers in the context of this specific repository and codebase. If asked general questions like "how does frontend work?" or "explain React", reply by explaining how it works *in this repository* based on the code, rather than giving a generic layman's explanation.
2. If asked questions that are completely out of the general area of the codebase, project, or software engineering in general (e.g., cooking recipes, politics, general history), politely decline with a formal reply such as: "I am a codebase knowledge assistant. I cannot answer questions outside the scope of this repository or software development."
"""


class Orchestrator:
    def __init__(self):
        self._graph = None
        self._llm = None

    @property
    def llm(self):
        if self._llm is None:
            self._llm = get_llm()
        return self._llm

    @property
    def graph(self):
        if self._graph is None:
            self._graph = create_react_agent(
                self.llm,
                tools=tools,
                checkpointer=checkpointer,
                prompt=SYSTEM_PROMPT,
            )
        return self._graph

    async def assemble_context(
        self,
        query: str,
        repo_id: str,
        code_results: list[dict],
        tags: list[str] | None = None,
    ) -> str:
        context_parts: list[str] = []
        requested_tags = tags if tags is not None else _extract_annotation_tags(query)

        annotation_tasks = []
        for chunk in code_results:
            file_path = chunk.get("file_path") or "unknown"
            annotation_tasks.append(
                Annotation.get_annotations(
                    repo_id=UUID(repo_id),
                    file_path=file_path,
                    tags=requested_tags,
                    limit=5,
                )
            )

        try:
            annotations_list = await asyncio.wait_for(
                asyncio.gather(*annotation_tasks, return_exceptions=True),
                timeout=10.0,
            )
        except asyncio.TimeoutError:
            logger.warning("Parallel annotation retrieval timed out")
            annotations_list = [[] for _ in code_results]

        for i, chunk in enumerate(code_results):
            file_path = chunk.get("file_path") or "unknown"
            start_line = chunk.get("start_line")
            end_line = chunk.get("end_line")
            snippet = chunk.get("snippet") or ""

            header = f"## {file_path}:{start_line}-{end_line}" if start_line and end_line else f"## {file_path}"
            context_parts.append(header)
            context_parts.append(snippet)

            annotations = annotations_list[i] if i < len(annotations_list) else []
            if isinstance(annotations, Exception):
                logger.warning(f"Annotation retrieval failed for {file_path}: {annotations}")
                annotations = []

            if annotations:
                context_parts.append("## Annotations (team knowledge)")
                context_parts.extend(a.format_for_llm() for a in annotations)

        return "\n\n".join(context_parts)

    async def _build_history_context(self, message: str) -> tuple[str, str]:
        try:
            raw_history = await asyncio.wait_for(
                search_pr_history.ainvoke({"query": message, "k": 3}),
                timeout=10.0,
            )
        except (Exception, asyncio.TimeoutError) as e:
            logger.warning(f"History search failed or timed out: {e}")
            return "", ""

        try:
            history_rows = json.loads(raw_history) if isinstance(raw_history, str) else []
        except Exception:
            return "", ""

        if not isinstance(history_rows, list) or not history_rows:
            return "", ""

        top = history_rows[0]
        repo = top.get("repo")
        number = top.get("number")
        if not repo or number is None:
            return "", ""

        citation = f"- {repo}#{number}"
        detail_summary = ""
        try:
            raw_detail = await asyncio.wait_for(
                get_pr_detail.ainvoke({"repo": repo, "pr_number": int(number)}),
                timeout=10.0,
            )
            parsed_detail = json.loads(raw_detail) if isinstance(raw_detail, str) else {}
            if isinstance(parsed_detail, dict):
                detail_summary = parsed_detail.get("summary") or parsed_detail.get("description") or ""
        except (Exception, asyncio.TimeoutError) as e:
            logger.warning(f"PR detail lookup failed or timed out: {e}")

        pr_summary = top.get("summary") or detail_summary or ""
        context = (
            "PR history context for intent grounding:\n"
            f"- PR: {repo}#{number}\n"
            f"- Title: {top.get('title', '')}\n"
            f"- Summary: {pr_summary}\n"
            "Use this context when answering user's why-question."
        )
        return context, citation

    async def chat(self, message: str, thread_id: str):
        context_block = ""
        citation = ""
        if _is_why_intent(message):
            context_block, citation = await self._build_history_context(message)

        prompt = message
        if context_block:
            prompt = f"{message}\n\n{context_block}"

        config = {"configurable": {"thread_id": thread_id}}
        input_data = {"messages": [HumanMessage(content=prompt)]}

        result = await self.graph.ainvoke(input_data, config=config)
        response = result["messages"][-1].content
        if citation and "Citations:" not in response:
            response = f"{response}\n\nCitations:\n{citation}"

        return response


def _health_check():
    try:
        orchestrator = Orchestrator()
        llm = orchestrator.llm
        logger.info(f"Health check passed. LLM type: {type(llm).__name__}")
        return True
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return False


try:
    _health_check()
except Exception as e:
    logger.warning(f"Initial health check skipped: {e}")
