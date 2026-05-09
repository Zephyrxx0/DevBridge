from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from api.agents.nodes.big import big_worker_node
from api.agents.nodes.fast import fast_worker_node
from api.agents.nodes.router import intent_classifier
from api.agents.state import AgentState

builder = StateGraph(AgentState)
builder.add_node("router", intent_classifier)
builder.add_node("fast_worker", fast_worker_node)
builder.add_node("big_worker", big_worker_node)

builder.add_edge(START, "router")
builder.add_conditional_edges("router", lambda x: x["next"])
builder.add_edge("fast_worker", END)
builder.add_edge("big_worker", END)

graph = builder.compile(checkpointer=MemorySaver())
