import asyncio
import logging

from langchain_core.messages import AIMessage, SystemMessage

from api.agents.state import AgentState
from api.agents.utils.llm import get_model, GeminiModel


logger = logging.getLogger(__name__)

FAST_MODEL = get_model(is_fast=True)
BIG_MODEL = get_model(is_fast=False)

REPO_SYSTEM_PROMPT = """You are DevBridge, a codebase assistant for a specific repository.

IMPORTANT RULES:
1. ALWAYS ground your answers in the specific repository's code and context. When asked general questions like "how does the frontend work?" or "explain React", reply by explaining how it works in THIS repository based on the code, not a generic textbook answer.
2. If asked about a file (via @file/path reference or directly), use the `read_file` tool to get its content and answer specifically about that file's contents and role in the repository.
3. If asked questions completely outside the scope of this codebase or software engineering (e.g., cooking recipes, politics, general history), politely decline: "I am a codebase assistant. I cannot answer questions outside the scope of this repository."
4. When referencing code, always cite specific file paths and line numbers.
5. You have access to the `read_file` tool. Call it with a `file_path` argument to get the full content of any file in the repository.
"""


async def _read_file_from_db(repo_id: str, file_path: str) -> str | None:
    from sqlalchemy import text
    from api.db.session import get_engine

    engine = get_engine()
    if not engine:
        return None

    try:
        async with engine.connect() as conn:
            repo_row = (
                await conn.execute(
                    text("SELECT name FROM repositories WHERE CAST(id AS text) = :rid OR name = :rid LIMIT 1"),
                    {"rid": repo_id},
                )
            ).fetchone()
            if not repo_row:
                return None
            repo_name = repo_row._mapping["name"]

            rows = (
                await conn.execute(
                    text("""
                        SELECT content
                        FROM code_chunks
                        WHERE (repo = :repo_name OR repo = CAST(:repo_id AS text))
                          AND file_path = :file_path
                        ORDER BY start_line ASC
                    """),
                    {"repo_name": repo_name, "repo_id": repo_id, "file_path": file_path},
                )
            ).fetchall()

            if not rows:
                return None
            return "\n".join(r._mapping["content"] for r in rows)
    except Exception:
        logger.exception("read_file DB query failed for %s", file_path)
        return None


async def _generate_with_tools(client, model_name: str, raw_messages: list, repo_id: str) -> str:
    from google.genai import types as genai_types

    read_file_decl = genai_types.FunctionDeclaration(
        name="read_file",
        description="Read the full content of a file from the repository. Use this when the user references a file or when you need to examine code to answer a question.",
        parameters={
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Repository file path, e.g. 'src/main.py' or 'web/AGENTS.md'",
                }
            },
            "required": ["file_path"],
        },
    )

    tool = genai_types.Tool(function_declarations=[read_file_decl])
    disable_auto = genai_types.AutomaticFunctionCallingConfig(disable=True)

    config = genai_types.GenerateContentConfig(
        tools=[tool],
        automatic_function_calling=disable_auto,
    )

    contents: list[genai_types.Content] = []
    for msg in raw_messages:
        role = str(getattr(msg, "type", getattr(msg, "role", "user")))
        gemini_role = "model" if role in ("ai", "assistant") else "user"
        text = str(getattr(msg, "content", ""))
        if text:
            contents.append(
                genai_types.Content(role=gemini_role, parts=[genai_types.Part.from_text(text=text)])
            )

    max_turns = 6
    final_text = ""
    response = None

    for _turn in range(max_turns):
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model_name,
            contents=contents,
            config=config,
        )

        if not response.candidates or not response.candidates[0].content.parts:
            break

        first = response.candidates[0].content.parts[0]

        if not first.function_call:
            final_text = response.text or ""
            break

        fc = first.function_call
        if fc.name == "read_file":
            file_path = fc.args.get("file_path", "") if isinstance(fc.args, dict) else str(fc.args or "")
            file_content = await _read_file_from_db(repo_id, file_path)
            if file_content is None:
                file_content = f"Error: File '{file_path}' not found in repository."

            contents.append(genai_types.Content(
                role="model",
                parts=[genai_types.Part.from_function_call(fc)],
            ))
            contents.append(genai_types.Content(
                role="user",
                parts=[genai_types.Part.from_function_response(
                    name="read_file",
                    response={"content": file_content},
                )],
            ))
        else:
            break

    if response and response.candidates and response.candidates[0].content.parts:
        final_text = final_text or response.text or ""
    return final_text or ""


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

    if used_big and isinstance(model, GeminiModel) and model.model_name != "gemma-4-26b-a4b-it" and repo_id:
        final_response = await _generate_with_tools(
            client=model.client,
            model_name=model.model_name,
            raw_messages=raw_messages,
            repo_id=repo_id,
        )
    else:
        result = await model.ainvoke(messages)
        final_response = str(getattr(result, "content", ""))

    model_used = str(getattr(model, "model_name", ""))

    return {
        "messages": [AIMessage(content=final_response)],
        "model_used": model_used,
        "cascaded": used_big,
    }
