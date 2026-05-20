import logging
from functools import lru_cache

from google import genai

from api.core.config import settings

LOGGER = logging.getLogger(__name__)

BIG_MODEL = "gemini-2.5-flash"
FAST_MODEL = "gemma-4-26b-a4b-it"


@lru_cache(maxsize=1)
def _get_client() -> genai.Client | None:
    if not settings.gemini_api_key:
        return None
    return genai.Client(api_key=settings.gemini_api_key)


def _resolve_model_name(model_type: str) -> str:
    lowered = (model_type or "").lower()
    return FAST_MODEL if lowered in {"gemma", "fast"} else BIG_MODEL


def _message_to_text(message: dict) -> str:
    role = str(message.get("role", ""))
    content = str(message.get("content", ""))
    return f"{role}: {content}".strip()


def _count_tokens(text: str, model_type: str) -> int:
    client = _get_client()
    if client is None:
        return len((text or "").split())

    model_name = _resolve_model_name(model_type)
    response = client.models.count_tokens(model=model_name, contents=text)
    return int(getattr(response, "total_tokens", 0))


def enforce_cap(
    messages: list,
    codebase_chunk: str,
    max_tokens: int = 48000,
    model_type: str = "gemini",
) -> tuple[list, bool]:
    """Drop oldest chat history until token budget fits.

    Always keeps `codebase_chunk` and newer chat history first.
    Returns (messages, warning_flag).
    """

    safe_messages = list(messages or [])
    chunk_text = codebase_chunk or ""

    try:
        chunk_tokens = _count_tokens(chunk_text, model_type)

        if not safe_messages:
            return safe_messages, False

        per_message_tokens = [_count_tokens(_message_to_text(message), model_type) for message in safe_messages]
        total_tokens = chunk_tokens + sum(per_message_tokens)

        if total_tokens <= max_tokens:
            return safe_messages, False

        truncated = safe_messages.copy()
        running_total = total_tokens

        while truncated and running_total > max_tokens:
            removed_tokens = per_message_tokens.pop(0)
            truncated.pop(0)
            running_total -= removed_tokens

        return truncated, True
    except Exception:
        LOGGER.exception("Tokenizer enforcement failed. Returning original messages.")
        return safe_messages, False
