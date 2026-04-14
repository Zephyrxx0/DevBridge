import os
from typing import TypedDict, Annotated, Sequence
from langchain_google_vertexai import ChatVertexAI
from langgraph.graph import StateGraph, MessagesState
from langgraph.prebuilt import ToolNode, create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.tools import tool

# Define the Agent State
class AgentState(MessagesState):
    """Simple messages state for the orchestrator."""
    pass

@tool
def code_search(query: str):
    """Search for code snippets and implementation logic in the codebase.
    Use this tool to understand 'Why' something was implemented by looking at context.
    """
    # Placeholder for Phase 05
    return f"SEARCH_MOCK: No matches for '{query}' found yet. System initialization in progress."

# Setup the LLM
# model_name="gemini-1.5-flash" is standard for hackathon speed/cost
llm = ChatVertexAI(model_name="gemini-1.5-flash")

# Define tools
tools = [code_search]

# Create the ReAct Graph
# We use create_react_agent prebuilt helper for Phase 01 simplicity
checkpointer = MemorySaver()
app_graph = create_react_agent(llm, tools=tools, checkpointer=checkpointer)

class Orchestrator:
    def __init__(self):
        self.graph = app_graph

    async def chat(self, message: str, thread_id: str):
        config = {"configurable": {"thread_id": thread_id}}
        input_data = {"messages": [HumanMessage(content=message)]}
        
        # Run the graph asynchronously
        result = await self.graph.ainvoke(input_data, config=config)
        
        return result["messages"][-1].content
