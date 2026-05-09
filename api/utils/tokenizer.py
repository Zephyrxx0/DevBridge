import logging
from functools import lru_cache

from transformers import AutoTokenizer

LOGGER = logging.getLogger(__name__)

QWEN_MODEL = "Qwen/Qwen2.5-72B-Instruct-AWQ"
GEMMA_MODEL = "google/gemma-4-9b-it"


@lru_cache(maxsize=2)
def _get_tokenizer(model_type: str):
    model_name = QWEN_MODEL if model_type.lower() == "qwen" else GEMMA_MODEL
    return AutoTokenizer.from_pretrained(model_name)


def _message_to_text(message: dict) -> str:
    role = str(message.get("role", ""))
    content = str(message.get("content", ""))
    return f"{role}: {content}".strip()


def _count_tokens(text: str, model_type: str) -> int:
    tokenizer = _get_tokenizer(model_type)
    return len(tokenizer.encode(text, add_special_tokens=False))


def enforce_cap(
    messages: list,
    codebase_chunk: str,
    max_tokens: int = 48000,
    model_type: str = "qwen",
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
