import logging
import asyncio
from uuid import UUID
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.tools import tool
from api.agents.orchestrator import get_llm, code_search, search_pr_history, get_pr_detail
from api.db.models import Annotation

logger = logging.getLogger(__name__)

PR_REVIEW_PROMPT = """You are a senior engineer reviewing a pull request for a team.

Your job is:
1. Summarize what this PR does in 2-3 sentences
2. Identify potential issues: bugs, security concerns, performance
3. Check consistency with existing code patterns
4. Generate a list of clarifying questions the author should address

Use the available tools to search the codebase, PR history, and human annotations to provide a contextually grounded review.
If you need to understand the intent or "why" behind a specific code pattern, look for human annotations using the 'get_human_annotations' tool.
"""

@tool
async def get_human_annotations(repo_id: str, file_path: str = None, tags: list[str] = None):
    """Retrieve human-written team annotations for a file or the entire repository.
    Use this to understand 'Why' something was implemented as it captures team knowledge, warnings, and intent.
    """
    try:
        # Resolve repo_id to UUID if it's a string
        r_id = UUID(repo_id) if isinstance(repo_id, str) else repo_id
        
        # Add 10s timeout per Phase 10 performance patterns
        annotations = await asyncio.wait_for(
            Annotation.get_annotations(
                repo_id=r_id,
                file_path=file_path,
                tags=tags,
                limit=10
            ),
            timeout=10.0
        )
        if not annotations:
            return "No human annotations found for the given criteria."
        return "\n\n".join(a.format_for_llm() for a in annotations)
    except asyncio.TimeoutError:
        logger.warning(f"Annotation retrieval timed out for {file_path}")
        return "Annotation retrieval timed out."
    except Exception as e:
        logger.error(f"Error in get_human_annotations: {e}")
        return f"Failed to retrieve annotations: {str(e)}"

def create_pr_reviewer_agent():
    """Creates a LangGraph agent for PR reviews."""
    llm = get_llm()
    tools = [code_search, search_pr_history, get_pr_detail, get_human_annotations]
    checkpointer = MemorySaver()
    return create_react_agent(
        llm,
        tools=tools,
        checkpointer=checkpointer,
        prompt=PR_REVIEW_PROMPT
    )
