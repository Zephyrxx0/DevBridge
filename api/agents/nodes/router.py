import asyncio

from api.agents.state import AgentState
from api.agents.utils.llm import get_model
from api.core.config import settings


async def intent_classifier(state: AgentState) -> dict[str, str]:
    user_query = state["messages"][-1].content if state.get("messages") else ""
    prompt = (
        "Classify: 'FAST' (greetings/clarifications) or 'DEEP' (code analysis/complex logic). "
        "Reply ONLY with the word. ONLY 'FAST' or 'DEEP'. "
        f"Query: {user_query}"
    )
    model = get_model(is_fast=True)
    response = await asyncio.wait_for(model.ainvoke(prompt), timeout=settings.fast_model_timeout)

    decision = str(getattr(response, "content", "")).strip().upper()
    return {"next": "fast_worker" if "FAST" in decision else "big_worker"}
