from langchain_core.messages import AIMessage
from langgraph.types import Command


def fallback_to_fast_worker(error: Exception | str) -> Command:
    _ = error
    message = AIMessage(content="[SYSTEM: FALLBACK] Switching to Fast Model.")
    return Command(update={"messages": [message], "fallback": True}, goto="fast_worker")
