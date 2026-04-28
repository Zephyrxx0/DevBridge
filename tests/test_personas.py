import pytest
from api.agents.pr_reviewer import create_pr_reviewer_agent, PR_REVIEW_PROMPT
from api.agents.debugger import create_debugger_agent, DEBUG_PROMPT

def test_pr_reviewer_initialization():
    agent = create_pr_reviewer_agent()
    assert agent is not None
    # Verify that the prompt contains keywords related to PR Review
    content = PR_REVIEW_PROMPT.lower()
    assert any(keyword.lower() in content for keyword in ["PR review", "pull request", "reviewing"])

def test_debugger_initialization():
    agent = create_debugger_agent()
    assert agent is not None
    # Verify that the prompt contains keywords related to Debugging
    content = DEBUG_PROMPT.lower()
    assert any(keyword.lower() in content for keyword in ["debug", "troubleshoot", "fix bugs"])
