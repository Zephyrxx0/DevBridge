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
async def code_search(query: str):
    """Search for code snippets and implementation logic in the codebase.
    Use this tool to understand 'Why' something was implemented by looking at context.
    """
    from api.db.vector_store import vector_db
    import json
    
    # Ensure vector store is initialized
    if not vector_db._vectorstore:
        vector_db.initialize()

    try:
        results = await vector_db.hybrid_search(query, k=5)
        
        if not results:
            return f"No matches found for '{query}'. Try a different query or broader terms."
            
        citations = []
        for res in results:
            citations.append({
                "file": res.get("file_path"),
                "lines": f"{res.get('start_line')}-{res.get('end_line')}",
                "snippet": res.get("snippet", "")[:300] + "..." if len(res.get("snippet", "")) > 300 else res.get("snippet", "")
            })
            
        summary = f"Found {len(results)} relevant code snippets."
        
        # T-05-05: Information Disclosure - return bounded snippets and citation metadata only
        output = f"{summary}\n\nCitations:\n{json.dumps(citations, indent=2)}"
        return output
    except Exception as e:
        logger.error(f"Error in code_search: {e}")
        return f"An error occurred during search. Please try again later."


def get_llm():
    """Lazy LLM initialization with mock fallback.

    Checks for Gemini API credentials and returns appropriate LLM:
    - If google_cloud_project is set in settings: real ChatVertexAI
    - Otherwise: mock LLM that returns placeholder responses
    """
    from api.core.config import settings
    model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-flash")
    gcp_project_id = settings.google_cloud_project
    gcp_location = os.environ.get("GCP_LOCATION", "us-central1")

    if gcp_project_id:
        logger.info(f"GOOGLE_CLOUD_PROJECT found ({gcp_project_id}), initializing ChatVertexAI")
        return ChatVertexAI(
            model_name=model_name,
            project=gcp_project_id,
            location=gcp_location
        )

    # No credentials available - return mock LLM.
    logger.warning(
        "No GCP_PROJECT_ID found, using mock LLM fallback. Set GCP_PROJECT_ID to enable AI responses."
    )

    class MockLLM:
        """Mock LLM that returns placeholder responses when Gemini API is not configured."""

        def __init__(self):
            self.model_name = "mock-gemini-unavailable"

        def invoke(self, messages):
            msg_content = ""
            if messages and len(messages) > 0:
                last_msg = messages[-1]
                if hasattr(last_msg, "content"):
                    msg_content = last_msg.content
                elif isinstance(last_msg, dict):
                    msg_content = last_msg.get("content", "")

            return AIMessage(
                content=f"[Mock] Vertex AI not configured. Set GCP_PROJECT_ID and authenticate with ADC to enable AI responses.\n\nYour message was: {msg_content}"
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
