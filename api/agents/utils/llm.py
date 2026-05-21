from langchain_core.messages import AIMessage
from google import genai
from google.genai import types
import asyncio
import logging

from api.core.config import settings


logger = logging.getLogger(__name__)


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

    def _should_use_google_search(self, request_text: str) -> bool:
        lowered = request_text.lower()
        search_cues = (
            "search the web",
            "google search",
            "latest",
            "current",
            "recent",
            "today",
            "news",
            "online",
            "web",
        )
        return any(cue in lowered for cue in search_cues)

    def _should_use_flash_lite_directly(self, request_text: str) -> bool:
        lowered = request_text.lower()
        explanation_cues = (
            "how ",
            "how does",
            "explain",
            "why ",
            "architecture",
            "tradeoff",
            "step by step",
            "detailed",
            "analysis",
            "design",
            "plan",
        )
        return len(request_text) > 320 or any(cue in lowered for cue in explanation_cues)

    def _build_config(self, request_text: str) -> types.GenerateContentConfig:
        thinking_cfg = {}
        if self.thinking_budget is not None:
            thinking_cfg["thinking_budget"] = self.thinking_budget
        if self.thinking_level is not None:
            thinking_cfg["thinking_level"] = self.thinking_level

        tools = [types.Tool(googleSearch=types.GoogleSearch())] if self._should_use_google_search(request_text) else None
        automatic_function_calling = None if tools else types.AutomaticFunctionCallingConfig(disable=True)

        return types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(**thinking_cfg),
            tools=tools,
            automatic_function_calling=automatic_function_calling,
        )

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
        if self.model_name == "gemma-4-26b-a4b-it" and self._should_use_flash_lite_directly(request_text):
            logger.info("Using gemini-2.5-flash-lite directly for explanatory prompt")
            fallback = GeminiModel(client=self.client, model_name="gemini-2.5-flash-lite", thinking_budget=0)
            return await fallback.ainvoke(payload)

        config = self._build_config(request_text)

        def _stream_once() -> str:
            chunks: list[str] = []
            for chunk in self.client.models.generate_content_stream(
                model=self.model_name,
                contents=[
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=request_text)],
                    )
                ],
                config=config,
            ):
                text = getattr(chunk, "text", None)
                if text:
                    chunks.append(text)
            return "".join(chunks)

        last_error: Exception | None = None
        attempts = 1 if self.model_name == "gemma-4-26b-a4b-it" else 2
        timeout = min(settings.fast_model_timeout, 6.0) if self.model_name == "gemma-4-26b-a4b-it" else settings.fast_model_timeout
        for _ in range(attempts):
            try:
                text = await asyncio.wait_for(asyncio.to_thread(_stream_once), timeout=timeout)
                return AIMessage(content=text)
            except Exception as error:  # pragma: no cover - runtime fallback path
                last_error = error
                logger.warning(
                    "Gemini stream failed for model %s (%s): %r",
                    self.model_name,
                    type(error).__name__,
                    error,
                )

        if self.model_name != "gemini-2.5-flash-lite":
            logger.info("Falling back from %s to gemini-2.5-flash-lite", self.model_name)
            fallback = GeminiModel(client=self.client, model_name="gemini-2.5-flash-lite", thinking_budget=0)
            return await fallback.ainvoke(payload)

        if last_error is not None:
            return AIMessage(content=f"[LLM error] {type(last_error).__name__}: {last_error!r}")
        return AIMessage(content="")


def get_model(is_fast: bool):
    api_key = settings.gemini_api_key
    if not api_key:
        return MockLLM()

    client = genai.Client(api_key=api_key)

    if is_fast:
        return GeminiModel(client=client, model_name="gemma-4-26b-a4b-it", thinking_level="HIGH")
    return GeminiModel(client=client, model_name="gemini-2.5-flash-lite", thinking_budget=0)
