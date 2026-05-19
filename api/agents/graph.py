import logging

from hindsight_langgraph import create_recall_node, create_retain_node
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from api.agents.nodes.cascade import cascade_node
from api.agents.state import AgentState
from api.db.hindsight import hindsight_db

logger = logging.getLogger(__name__)


def _get_hindsight_client():
    if hindsight_db._client is not None:
        return hindsight_db._client
    initialized = hindsight_db.initialize()
    if not initialized:
        logger.warning("Hindsight initialization unavailable. Memory nodes will no-op.")
        return None
    return hindsight_db._client


def _create_recall_wrapper():
    recall_node = None

    async def _recall(state, config):
        nonlocal recall_node
        if recall_node is None:
            client = _get_hindsight_client()
            if client is None:
                return {"hindsight_memory": None}
            recall_node = create_recall_node(
                client=client,
                bank_id_from_config="user_id",
                output_key="hindsight_memory",
            )
        return await recall_node(state, config)

    return _recall


def _create_retain_wrapper():
    retain_node = None

    async def _retain(state, config):
        nonlocal retain_node
        if retain_node is None:
            client = _get_hindsight_client()
            if client is None:
                return {}
            retain_node = create_retain_node(
                client=client,
                bank_id_from_config="user_id",
                retain_ai=True,
            )
        return await retain_node(state, config)

    return _retain

builder = StateGraph(AgentState)
recall = _create_recall_wrapper()
retain = _create_retain_wrapper()

builder.add_node("recall", recall)
builder.add_node("cascade", cascade_node)
builder.add_node("retain", retain)

builder.add_edge(START, "recall")
builder.add_edge("recall", "cascade")
builder.add_edge("cascade", "retain")
builder.add_edge("retain", END)

graph = builder.compile(checkpointer=MemorySaver())
