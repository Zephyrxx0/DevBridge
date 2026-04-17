import os
import logging
from langchain_google_vertexai import ChatVertexAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@tool
def code_search(query: str):
    """Search for code snippets and implementation logic in the codebase.
    Use this tool to understand 'Why' something was implemented by looking at context.
    """
    # TODO(Phase 5): Connect code_search to vector_db.similarity_search
    # Placeholder for Phase 05
    return f"SEARCH_MOCK: No matches for '{query}' found yet. System initialization in progress."


def get_llm():
    """Lazy LLM initialization with mock fallback.

    Checks for GCP credentials and returns appropriate LLM:
    - If GOOGLE_APPLICATION_CREDENTIALS is set or ADC is available: real ChatVertexAI
    - Otherwise: mock LLM that returns placeholder responses
    """
    # Check for GCP credentials
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    has_gcp_creds = bool(creds_path and os.path.exists(creds_path))

    if has_gcp_creds:
        logger.info("GCP credentials found, initializing ChatVertexAI")
        return ChatVertexAI(model_name="gemini-1.5-flash")

    # Check if we're in a GCP environment (no creds file but maybe ADC)
    try:
        import google.auth

        google.auth.default()
        logger.info("GCP ADC available, initializing ChatVertexAI")
        return ChatVertexAI(model_name="gemini-1.5-flash")
    except (ImportError, google.auth.exceptions.DefaultCredentialsError):
        pass
    except Exception:
        pass

    # No credentials available - return mock LLM
    logger.warning(
        "No GCP credentials found, using mock LLM fallback. Set GOOGLE_APPLICATION_CREDENTIALS or run 'gcloud auth application-default login' for real responses."
    )

    class MockLLM:
        """Mock LLM that returns placeholder responses when GCP is not configured."""

        def __init__(self):
            self.model_name = "mock-gcp-unavailable"

        def invoke(self, messages):
            msg_content = ""
            if messages and len(messages) > 0:
                last_msg = messages[-1]
                if hasattr(last_msg, "content"):
                    msg_content = last_msg.content
                elif isinstance(last_msg, dict):
                    msg_content = last_msg.get("content", "")

            return AIMessage(
                content=f"[Mock] GCP not configured. Set GOOGLE_APPLICATION_CREDENTIALS or run `gcloud auth application-default login` to enable AI responses.\n\nYour message was: {msg_content}"
            )

        async def ainvoke(self, messages):
            return self.invoke(messages)

        def stream(self, messages):
            response = self.invoke(messages)
            # Simple streaming simulation - yield character by character
            content = response.content
            for char in content:
                yield AIMessage(content=char)
                import time

                time.sleep(0.01)

        async def astream(self, messages):
            response = await self.ainvoke(messages)
            content = response.content
            for char in content:
                yield AIMessage(content=char)
                import asyncio

                await asyncio.sleep(0.01)

    return MockLLM()


# Define tools
tools = [code_search]

# Create the ReAct Graph - LLM is initialized lazily via get_llm()
checkpointer = MemorySaver()


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
                self.llm, tools=tools, checkpointer=checkpointer
            )
        return self._graph

    async def chat(self, message: str, thread_id: str):
        config = {"configurable": {"thread_id": thread_id}}
        input_data = {"messages": [HumanMessage(content=message)]}

        # Run the graph asynchronously
        result = await self.graph.ainvoke(input_data, config=config)

        return result["messages"][-1].content


# Verify module imports successfully without crashing
def _health_check():
    """Run at module load to verify LLM is accessible."""
    try:
        orchestrator = Orchestrator()
        llm = orchestrator.llm
        logger.info(f"Health check passed. LLM type: {type(llm).__name__}")
        return True
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return False


# Run health check at module import time (but don't crash - log warning if mock is used)
try:
    _health_check()
except Exception as e:
    logger.warning(f"Initial health check skipped: {e}")
