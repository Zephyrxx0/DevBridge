"""Onboarding agent: generates focus-tailored onboarding plans via LLM with retry/backoff."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncGenerator

from langchain_core.messages import HumanMessage, SystemMessage

from api.agents.utils.llm import get_model
from api.db.onboarding_models import OnboardingPlan, upsert_onboarding_plan

logger = logging.getLogger(__name__)

# Backoff delays in seconds for each retry attempt
BACKOFF_DELAYS = [1.0, 2.0]
MAX_ATTEMPTS = 1 + len(BACKOFF_DELAYS)  # 1 initial + 2 retries = 3


async def code_search_for_onboarding(repo_id: str, focus: str) -> list[dict[str, Any]]:
    """Search codebase for files relevant to the user's focus area."""
    from api.db.vector_store import vector_db

    if not vector_db._vectorstore:
        vector_db.initialize()

    focus_queries = {
        "Backend": "API routes endpoints server database models",
        "Frontend": "React components pages UI hooks styles",
        "Fullstack": "API routes React components full stack integration",
        "Exploring": "main entry point project structure configuration",
    }
    query = focus_queries.get(focus, focus_queries["Exploring"])

    try:
        results = await asyncio.wait_for(vector_db.hybrid_search(query, k=8), timeout=10.0)
        return results or []
    except Exception as exc:
        logger.warning(f"Code search for onboarding failed: {exc}")
        return []


def _build_system_prompt(focus: str) -> str:
    """Build a system prompt tailored to the user's focus area."""
    return (
        f"You are an expert developer onboarding assistant. "
        f"Analyze this repository from a **{focus}** perspective. "
        f"Generate a structured onboarding plan that helps a developer "
        f"who is interested in the **{focus}** aspects of this codebase.\n\n"
        f"Focus on {focus}-relevant entry points, architecture patterns, "
        f"and setup steps. Prioritize files and concepts most important "
        f"for a {focus} developer.\n\n"
        "You MUST respond with ONLY valid JSON matching this exact schema:\n"
        "{\n"
        '  "summary": "string — high-level repo summary tailored to focus",\n'
        '  "architecture": "string — architecture overview from focus perspective",\n'
        '  "setup_commands": ["string"],\n'
        '  "key_files": [{"path": "string", "description": "string"}],\n'
        '  "steps": [{"title": "string", "description": "string", "files": ["string"]}]\n'
        "}\n\n"
        "Do NOT include markdown fences, comments, or any text outside the JSON object."
    )


def _build_user_prompt(focus: str, code_context: list[dict[str, Any]]) -> str:
    """Build user message with discovered code context."""
    parts = [f"Generate an onboarding plan for a developer focused on **{focus}**.\n"]

    if code_context:
        parts.append("Here are relevant code snippets discovered in the repository:\n")
        for i, ctx in enumerate(code_context[:8], 1):
            file_path = ctx.get("file_path", "unknown")
            snippet = (ctx.get("snippet", "") or "")[:500]
            parts.append(f"### File {i}: {file_path}\n```\n{snippet}\n```\n")

    parts.append(
        "\nBased on these files, produce a JSON onboarding plan. "
        "Include 3-5 guided steps and 3-6 key files."
    )
    return "\n".join(parts)


async def generate_onboarding_plan(
    repo_id: str, focus: str = "Exploring"
) -> AsyncGenerator[dict[str, Any], None]:
    """Async generator yielding SSE events: status updates then final plan or error.

    Implements exponential backoff on Pydantic validation failures.
    Yields dicts with keys: type ("status" | "plan" | "error"), content/message.
    """
    yield {"type": "status", "content": f"Analyzing {focus} entry points..."}

    # Discovery phase — search codebase
    code_context = await code_search_for_onboarding(repo_id, focus)
    yield {"type": "status", "content": f"Found {len(code_context)} relevant files for {focus} analysis."}

    # Build prompts
    system_prompt = _build_system_prompt(focus)
    user_prompt = _build_user_prompt(focus, code_context)

    # Get Big Model (Gemini 2.5 Flash via AI Studio)
    llm = get_model(is_fast=False)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    yield {"type": "status", "content": f"Generating {focus} onboarding plan..."}

    # Attempt generation with retries and exponential backoff
    last_error: str = ""
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = await llm.ainvoke(messages)
            raw_content = response.content.strip()

            # Strip markdown fences if present
            if raw_content.startswith("```"):
                lines = raw_content.split("\n")
                # Remove first and last fence lines
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                raw_content = "\n".join(lines)

            plan = OnboardingPlan.model_validate_json(raw_content)
            plan_dict = plan.model_dump()

            # Cache in DB
            await upsert_onboarding_plan(repo_id, plan_dict)

            yield {"type": "plan", "content": plan_dict}
            return

        except Exception as exc:
            last_error = str(exc)
            retry_num = attempt + 1
            if attempt < len(BACKOFF_DELAYS):
                delay = BACKOFF_DELAYS[attempt]
                logger.warning(
                    f"Onboarding plan validation failed (attempt {retry_num}/{MAX_ATTEMPTS}), "
                    f"retrying in {delay}s: {last_error}"
                )
                yield {
                    "type": "status",
                    "content": f"Validation failed, retrying ({retry_num}/{MAX_ATTEMPTS})...",
                }
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"Onboarding plan generation failed after {MAX_ATTEMPTS} attempts: {last_error}"
                )

    yield {
        "type": "error",
        "message": f"Failed to generate valid onboarding plan after {MAX_ATTEMPTS} attempts: {last_error}",
    }
