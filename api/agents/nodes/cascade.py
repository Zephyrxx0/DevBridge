from langchain_core.messages import AIMessage

from api.agents.state import AgentState
from api.agents.utils.llm import get_model


FAST_MODEL = get_model(is_fast=True)
BIG_MODEL = get_model(is_fast=False)


def _to_model_messages(messages: list) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for message in messages:
        role = str(getattr(message, "type", getattr(message, "role", "user")))
        content = str(getattr(message, "content", message))
        normalized.append({"role": role, "content": content})
    return normalized


def _pick_model(messages: list[dict[str, str]]) -> tuple[object, bool]:
    user_prompts = [m.get("content", "") for m in messages if m.get("role") in {"human", "user"}]
    latest = user_prompts[-1] if user_prompts else ""
    prompt = latest.lower()

    long_form_cues = (
        len(latest) > 320
        or any(token in prompt for token in (
            "explain",
            "architecture",
            "tradeoff",
            "why",
            "step by step",
            "detailed",
            "analysis",
            "design",
            "plan",
        ))
    )

    if long_form_cues:
        return BIG_MODEL, True
    return FAST_MODEL, False


async def cascade_node(state: AgentState) -> dict:
    messages = _to_model_messages(state["messages"])
    model, used_big = _pick_model(messages)
    result = await model.ainvoke(messages)

    final_response = str(getattr(result, "content", ""))
    model_used = str(getattr(model, "model_name", ""))

    return {
        "messages": [AIMessage(content=final_response)],
        "model_used": model_used,
        "cascaded": used_big,
    }
