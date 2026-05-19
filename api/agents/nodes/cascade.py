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


class ValidatorCascadeAgent:
    """Compatibility wrapper for schema-driven escalation.

    cascadeflow==1.1.0 does not expose constructor-level custom validators,
    so we apply validators post-run and force a direct second-pass on failure.
    """

    def __init__(self, *, models: list[ModelConfig], validators: list[SchemaValidator]):
        self.validators = validators
        self._agent = CascadeAgent(models=models)

    async def run(self, query: str | list[dict[str, str]]):
        first = await self._agent.run(query)
        content = str(getattr(first, "content", ""))
        passed = all(validator.validate(content).passed for validator in self.validators)
        if passed:
            return first

        second = await self._agent.run(query, force_direct=True)
        if not hasattr(second, "cascaded"):
            setattr(second, "cascaded", True)
        return second

cascade_agent = ValidatorCascadeAgent(
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
    ],
    validators=[_schema_validator],
)


async def cascade_node(state: AgentState) -> dict:
    messages = state["messages"]
    provider_messages = _to_provider_messages(messages)

    result = await cascade_agent.run(provider_messages)

    final_response = str(getattr(result, "content", ""))

    model_used = str(getattr(result, "model_used", getattr(result, "modelUsed", "")))
    cascaded = bool(getattr(result, "cascaded", False))

    return {
        "messages": [AIMessage(content=final_response)],
        "model_used": model_used,
        "cascaded": cascaded,
    }
