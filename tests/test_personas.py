import pytest
from api.agents.pr_reviewer import create_pr_reviewer_agent, PR_REVIEW_PROMPT
from api.agents.debugger import create_debugger_agent, DEBUG_PROMPT

def test_pr_reviewer_initialization():
    agent = create_pr_reviewer_agent()
    assert agent is not None
    # Verify that the prompt contains keywords related to PR Review
    assert any(keyword in PR_REVIEW_PROMPT for keyword in ["PR Review", "Pull Request", "Reviewer"])

def test_debugger_initialization():
    agent = create_debugger_agent()
    assert agent is not None
    # Verify that the prompt contains keywords related to Debugging
    assert any(keyword in DEBUG_PROMPT for keyword in ["Debug", "debugger", "troubleshoot"])
