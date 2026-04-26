import hmac
import hashlib
import logging
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, status
from api.core.config import settings
from api.agents.pr_reviewer import create_pr_reviewer_agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

async def verify_signature(request: Request):
    """Validates the HMAC signature from GitHub."""
    signature = request.headers.get("x-hub-signature-256")
    if not signature:
        logger.warning("Webhook request missing x-hub-signature-256 header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing signature"
        )
    
    if not settings.github_webhook_secret:
        logger.error("GITHUB_WEBHOOK_SECRET is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Webhook secret not configured"
        )

    body = await request.body()
    expected_signature = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        logger.warning("Webhook request has invalid signature")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid signature"
        )

async def analyze_pr_background(payload: dict):
    """Background task to invoke the PR Reviewer agent."""
    try:
        pr = payload.get("pull_request", {})
        repo_name = pr.get("base", {}).get("repo", {}).get("full_name")
        pr_number = pr.get("number")
        
        logger.info(f"Starting background PR analysis for {repo_name}#{pr_number}")
        
        agent = create_pr_reviewer_agent()
        
        # Construct a comprehensive prompt for the agent based on the webhook payload
        context = (
            f"Review Pull Request #{pr_number} in repository '{repo_name}'.\n"
            f"Title: {pr.get('title')}\n"
            f"Author: {pr.get('user', {}).get('login')}\n"
            f"Description: {pr.get('body')}\n\n"
            "Use your tools to examine the code changes and provide a detailed review."
        )
        
        config = {"configurable": {"thread_id": f"webhook-pr-{repo_name}-{pr_number}"}}
        result = await agent.ainvoke({"messages": [("user", context)]}, config=config)
        
        logger.info(f"Successfully completed PR analysis for {repo_name}#{pr_number}")
        # In future iterations, this result could be posted back to GitHub
        
    except Exception as e:
        logger.exception(f"Error during background PR analysis: {e}")

@router.post("/github", status_code=status.HTTP_202_ACCEPTED)
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Entry point for GitHub webhooks."""
    await verify_signature(request)
    
    payload = await request.json()
    event = request.headers.get("x-github-event")
    
    if event == "pull_request":
        action = payload.get("action")
        # Trigger on open or when new commits are pushed (synchronize)
        if action in ["opened", "synchronize"]:
            background_tasks.add_task(analyze_pr_background, payload)
            return {"status": "accepted", "message": "PR analysis enqueued"}
        else:
            return {"status": "ignored", "message": f"PR action '{action}' ignored"}
            
    return {"status": "ignored", "message": f"Event '{event}' ignored"}
