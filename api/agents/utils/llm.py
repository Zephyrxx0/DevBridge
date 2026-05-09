from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

try:
    from langchain_openai import ChatOpenAI
except ModuleNotFoundError:  # pragma: no cover - local fallback only
    ChatOpenAI = None

from api.core.config import settings


class MockLLM(BaseChatModel):
    model_name: str = "mock-llm"

    @property
    def _llm_type(self) -> str:
        return "mock-llm"

    @property
    def _identifying_params(self) -> dict[str, str]:
        return {"model_name": self.model_name}

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content="[Mock] LLM unavailable"))])

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        return self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)


def get_model(is_fast: bool) -> BaseChatModel:
    port = settings.fast_model_port if is_fast else settings.big_model_port
    temperature = 0.0 if is_fast else 0.7

    if ChatOpenAI is None:
        return MockLLM()

    return ChatOpenAI(
        base_url=f"http://localhost:{port}/v1",
        api_key="local-dev",
        model="gemma-4" if is_fast else "qwen2.5-72b",
        temperature=temperature,
    )
