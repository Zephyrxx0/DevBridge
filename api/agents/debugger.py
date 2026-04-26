import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from api.agents.orchestrator import get_llm, code_search, search_pr_history, get_pr_detail

logger = logging.getLogger(__name__)

DEBUG_PROMPT = """You are an expert debugger and troubleshooting assistant.
Your goal is to help users find and fix bugs by engaging in a conversational back-and-forth session.

When troubleshooting:
1. Trace call chains and error patterns to find the root cause.
2. Use 'code_search' to understand how the code is implemented.
3. Use 'search_pr_history' and 'get_pr_detail' to see if recent changes introduced the issue.
4. Ask clarifying questions to narrow down the problem.
5. Provide clear explanations and suggested fixes once the issue is identified.

Maintain a professional and helpful tone. Remember that you are in a persistent debugging session.
"""

def create_debugger_agent():
    """Creates a LangGraph agent for interactive debugging.
    
    Note: When invoking this agent, use namespaced thread IDs (e.g., 'debug-{user}-{uuid}')
    to keep debug session state separate from general repository chat.
    """
    llm = get_llm()
    tools = [code_search, search_pr_history, get_pr_detail]
    checkpointer = MemorySaver()
    return create_react_agent(
        llm,
        tools=tools,
        checkpointer=checkpointer,
        prompt=DEBUG_PROMPT
    )
