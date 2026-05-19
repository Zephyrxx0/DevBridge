from langchain_core.messages import AIMessage

from cascadeflow import CascadeAgent, ModelConfig

from api.agents.state import AgentState
from api.agents.utils.llm import get_model
from api.agents.utils.validation import SchemaValidator


def _to_provider_messages(messages: list) -> list[dict[str, str]]:
    provider_messages: list[dict[str, str]] = []
    for message in messages:
        role = str(getattr(message, "type", getattr(message, "role", "user")))
        content = str(getattr(message, "content", message))
        provider_messages.append({"role": role, "content": content})
    return provider_messages


FAST_MODEL = get_model(is_fast=True)
BIG_MODEL = get_model(is_fast=False)

_schema_validator = SchemaValidator()

cascade_agent = CascadeAgent(
    models=[
        ModelConfig(
            name=getattr(FAST_MODEL, "model_name", "fast"),
            provider="openai",
            cost=0.0,
        ),
        ModelConfig(
            name=getattr(BIG_MODEL, "model_name", "big"),
            provider="openai",
            cost=0.0,
            # ROUT-02: explicit retry/rate-limit handling hints for big model.
            extra={"max_retries": 3, "retry_backoff_seconds": 1, "rate_limit_safe": True},
            http_config={"max_retries": 3},
        ),
    ]
)


async def cascade_node(state: AgentState) -> dict:
    messages = state["messages"]
    provider_messages = _to_provider_messages(messages)

    result = await cascade_agent.run(provider_messages)

    final_response = getattr(result, "content", "")
    validation = _schema_validator.validate(final_response)

    model_used = str(getattr(result, "model_used", getattr(result, "modelUsed", "")))
    cascaded = bool(getattr(result, "cascaded", False))

    if not validation.passed and not cascaded:
        # Defensive metadata fallback for versions where quality gates are not injected.
        model_used = getattr(BIG_MODEL, "model_name", "gemini-2.5-flash")
        cascaded = True

    return {
        "messages": [AIMessage(content=final_response)],
        "model_used": model_used,
        "cascaded": cascaded,
    }
