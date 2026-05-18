import asyncio

from api.agents.state import AgentState
from api.agents.utils.fallback import fallback_to_fast_worker
from api.agents.utils.llm import get_model
from api.core.config import settings


async def big_worker_node(state: AgentState):
    model = get_model(is_fast=False)
    try:
        result = await asyncio.wait_for(model.ainvoke(state["messages"]), timeout=120)
        return {"messages": [result]}
    except (asyncio.TimeoutError, Exception) as error:
        return fallback_to_fast_worker(error)
