import asyncio

from api.agents.state import AgentState
from api.agents.utils.llm import get_model
from api.core.config import settings


async def fast_worker_node(state: AgentState) -> dict:
    model = get_model(is_fast=True)
    result = await asyncio.wait_for(model.ainvoke(state["messages"]), timeout=settings.fast_model_timeout)
    return {"messages": [result]}
