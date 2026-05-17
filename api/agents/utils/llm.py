from langchain_core.messages import AIMessage
from google import genai
from google.genai import types

from api.core.config import settings


class MockLLM:
    model_name: str = "mock-llm"

    async def ainvoke(self, _input):
        return AIMessage(content="[Mock] LLM unavailable")


class GeminiModel:
    def __init__(self, client: genai.Client, model_name: str, thinking_budget: int | None = None, thinking_level: str | None = None):
        self.client = client
        self.model_name = model_name
        self.thinking_budget = thinking_budget
        self.thinking_level = thinking_level

    def _to_contents(self, payload) -> str:
        if isinstance(payload, str):
            return payload
        if isinstance(payload, list):
            parts: list[str] = []
            for message in payload:
                role = str(getattr(message, "type", getattr(message, "role", "user")))
                content = str(getattr(message, "content", message))
                parts.append(f"{role}: {content}")
            return "\n".join(parts)
        return str(payload)

    async def ainvoke(self, payload):
        request_text = self._to_contents(payload)
        thinking_cfg = {}
        if self.thinking_budget is not None:
            thinking_cfg["thinking_budget"] = self.thinking_budget
        if self.thinking_level is not None:
            thinking_cfg["thinking_level"] = self.thinking_level

        config = types.GenerateContentConfig(thinking_config=types.ThinkingConfig(**thinking_cfg))

        last_error: Exception | None = None
        for _ in range(3):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=request_text,
                    config=config,
                )
                return AIMessage(content=(response.text or ""))
            except Exception as error:  # pragma: no cover - retry path
                last_error = error
        if last_error is not None:
            raise last_error
        return AIMessage(content="")


def get_model(is_fast: bool):
    api_key = settings.gemini_api_key
    if not api_key:
        return MockLLM()

    client = genai.Client(api_key=api_key)

    if is_fast:
        return GeminiModel(client=client, model_name="gemma-4-26b-a4b-it", thinking_level="HIGH")
    return GeminiModel(client=client, model_name="gemini-2.5-flash", thinking_budget=-1)
