from langchain_core.messages import AIMessage, SystemMessage

from api.agents.state import AgentState
from api.agents.utils.llm import get_model


FAST_MODEL = get_model(is_fast=True)
BIG_MODEL = get_model(is_fast=False)

REPO_SYSTEM_PROMPT = """You are DevBridge, a codebase assistant for a specific repository.

IMPORTANT RULES:
1. ALWAYS ground your answers in the specific repository's code and context. When asked general questions like "how does the frontend work?" or "explain React", reply by explaining how it works in THIS repository based on the code, not a generic textbook answer.
2. If asked about a file (via @file/path reference or directly), read the provided file content and answer specifically about that file's contents and its role in the repository.
3. If asked questions completely outside the scope of this codebase or software engineering (e.g., cooking recipes, politics, general history), politely decline: "I am a codebase assistant. I cannot answer questions outside the scope of this repository."
4. When referencing code, always cite specific file paths and line numbers.
"""


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


async def cascade_node(state: AgentState, config: dict | None = None) -> dict:
    raw_messages = list(state["messages"])

    repo_id = None
    if config:
        configurable = config.get("configurable", {})
        repo_id = configurable.get("repo_id")

    has_system = any(
        getattr(m, "type", None) == "system" or getattr(m, "role", None) == "system"
        for m in raw_messages
    )
    if not has_system:
        prompt = REPO_SYSTEM_PROMPT
        if repo_id:
            prompt += f"\nRepository ID: {repo_id}"
        raw_messages.insert(0, SystemMessage(content=prompt))

    messages = _to_model_messages(raw_messages)
    model, used_big = _pick_model(messages)
    result = await model.ainvoke(messages)

    final_response = str(getattr(result, "content", ""))
    model_used = str(getattr(model, "model_name", ""))

    return {
        "messages": [AIMessage(content=final_response)],
        "model_used": model_used,
        "cascaded": used_big,
    }
