import os
import logging
import json
import asyncio
from uuid import UUID

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import tool
from sqlalchemy import text

from api.db.session import get_engine

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


def get_llm():
    """Lazy LLM initialization with mock fallback."""
    from api.core.config import settings

    model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-flash")
    gcp_project_id = settings.google_cloud_project
    gcp_location = os.environ.get("GCP_LOCATION", "us-central1")

    if gcp_project_id:
        logger.info(f"GOOGLE_CLOUD_PROJECT found ({gcp_project_id}), initializing ChatGoogleGenerativeAI")
        return ChatGoogleGenerativeAI(
            model=model_name,
            project=gcp_project_id,
            location=gcp_location,
            vertexai=True,
        )

    logger.warning(
        "No GOOGLE_CLOUD_PROJECT found, using mock LLM fallback. Set GOOGLE_CLOUD_PROJECT to enable AI responses."
    )

    class MockLLM(BaseChatModel):
        model_name: str = "mock-gemini-unavailable"

        @property
        def _llm_type(self) -> str:
            return "mock-gemini-unavailable"

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
                    "[Mock] Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT and authenticate with ADC to enable AI responses.\n\n"
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
